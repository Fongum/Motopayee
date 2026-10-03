import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';
import { reportError } from '@/lib/error-reporting';
import type { JsonObject } from '@/lib/json';
import { optionalText, phoneSchema } from '@/lib/validation';
import {
  DEALER_PROGRAM_COLUMNS,
  dealerProgramGaps,
  type DealerProgramRecord,
} from '@/lib/dealer-program';

interface RouteParams { params: { profileId: string } }

/** Form checkboxes post "on" when ticked and nothing when not. */
const checkbox = z.literal('on').optional();
const optionalPhone = z.union([z.literal(''), phoneSchema]).optional()
  .transform((v) => (v ? v : undefined));

const schema = z.object({
  intent: z.enum(['save', 'approve', 'revoke']),
  dealer_name: optionalText(200),
  city: optionalText(100),
  manager_name: optionalText(200),
  manager_phone: optionalPhone,
  manager_contact_confirmed: checkbox,
  inventory_contact_name: optionalText(200),
  inventory_contact_phone: optionalPhone,
  agreed_listing_accuracy: checkbox,
  agreed_sold_updates: checkbox,
  agreed_lead_handling: checkbox,
  agreed_no_false_financeable: checkbox,
  program_notes: optionalText(2000),
});

type DealerRow = DealerProgramRecord & {
  id: string;
  verified: boolean;
  verified_at: string | null;
};

async function readForm(request: Request): Promise<Record<string, string>> {
  const body: Record<string, string> = {};
  new URLSearchParams(await request.text()).forEach((value, key) => { body[key] = value; });
  return body;
}

/**
 * A ticked box keeps the moment it was first confirmed, so re-saving the form
 * does not quietly move an agreement's date forward; an unticked box clears it.
 */
function confirmation(ticked: boolean, current: string | null, now: string): string | null {
  if (!ticked) return null;
  return current ?? now;
}

/**
 * POST /api/admin/dealers/[profileId] — the dealer program checklist.
 *
 * intent=save     record the requirements (creates the dealers row if the
 *                 dealer signed up via /register, which never created one)
 * intent=approve  grant the Trusted Dealer label — refused while any
 *                 requirement is missing (the table CHECK refuses it too)
 * intent=revoke   withdraw the label
 *
 * Saving a form that removes a requirement from an approved dealer revokes
 * the label rather than leaving a badge with no evidence behind it.
 */
export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireAdmin(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const back = (notice: string) =>
    NextResponse.redirect(new URL(`/admin/dealers/${params.profileId}?notice=${notice}`, request.url), 303);

  const parsed = schema.safeParse(await readForm(request));
  if (!parsed.success) return back('invalid');
  const input = parsed.data;

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, role, full_name')
    .eq('id', params.profileId)
    .maybeSingle();

  if (!profile || profile.role !== 'seller_dealer') {
    return NextResponse.json({ error: 'Dealer not found.' }, { status: 404 });
  }

  // Oldest row if a profile somehow has several: nothing enforces one per
  // profile, and the lead-conversion route only checks before inserting.
  const { data: existingRows } = await supabaseAdmin
    .from('dealers')
    .select(DEALER_PROGRAM_COLUMNS)
    .eq('profile_id', params.profileId)
    .order('created_at', { ascending: true })
    .limit(1);
  const existing = ((existingRows ?? [])[0] ?? null) as unknown as DealerRow | null;

  // Only ever called once a dealers row exists, so the id is required here
  // rather than defaulted: audit_logs.entity_id is uuid not null.
  const audit = (dealerId: string, action: string, meta: JsonObject = {}) =>
    supabaseAdmin.from('audit_logs').insert({
      actor_id: auth.user.id,
      actor_email: auth.user.email,
      actor_role: auth.user.role,
      action,
      entity_type: 'dealers',
      entity_id: dealerId,
      meta: { profile_id: params.profileId, ...meta },
    });

  if (input.intent === 'save') {
    const now = new Date().toISOString();
    const dealerName = input.dealer_name ?? existing?.dealer_name ?? profile.full_name ?? null;
    if (!dealerName) return back('name_required');

    const record: DealerProgramRecord & { dealer_name: string; city: string | null; program_notes: string | null } = {
      dealer_name: dealerName,
      city: input.city ?? null,
      manager_name: input.manager_name ?? null,
      manager_phone: input.manager_phone ?? null,
      manager_contact_confirmed_at: confirmation(!!input.manager_contact_confirmed, existing?.manager_contact_confirmed_at ?? null, now),
      inventory_contact_name: input.inventory_contact_name ?? null,
      inventory_contact_phone: input.inventory_contact_phone ?? null,
      agreed_listing_accuracy_at: confirmation(!!input.agreed_listing_accuracy, existing?.agreed_listing_accuracy_at ?? null, now),
      agreed_sold_updates_at: confirmation(!!input.agreed_sold_updates, existing?.agreed_sold_updates_at ?? null, now),
      agreed_lead_handling_at: confirmation(!!input.agreed_lead_handling, existing?.agreed_lead_handling_at ?? null, now),
      agreed_no_false_financeable_at: confirmation(!!input.agreed_no_false_financeable, existing?.agreed_no_false_financeable_at ?? null, now),
      program_notes: input.program_notes ?? null,
    };

    const losesLabel = !!existing?.verified && dealerProgramGaps(record).length > 0;
    const update = losesLabel
      ? { ...record, verified: false, verified_at: null, verified_by: null }
      : record;

    const { error } = existing
      ? await supabaseAdmin.from('dealers').update(update).eq('id', existing.id)
      : await supabaseAdmin.from('dealers').insert({ ...update, profile_id: params.profileId });

    if (error) {
      reportError(error, { source: 'api/admin/dealers', route: '/api/admin/dealers/[profileId]' });
      return back('error');
    }

    if (losesLabel && existing) {
      await audit(existing.id, 'dealer_program_revoked', { reason: 'requirement_removed', gaps: dealerProgramGaps(record) });
      return back('revoked_incomplete');
    }
    return back('saved');
  }

  if (!existing) return back('save_first');

  if (input.intent === 'approve') {
    const gaps = dealerProgramGaps(existing);
    if (gaps.length > 0) return back('incomplete');
    if (existing.verified) return back('approved');

    const { error } = await supabaseAdmin
      .from('dealers')
      .update({ verified: true, verified_at: new Date().toISOString(), verified_by: auth.user.id })
      .eq('id', existing.id);

    if (error) {
      reportError(error, { source: 'api/admin/dealers', route: '/api/admin/dealers/[profileId]' });
      return back('error');
    }
    await audit(existing.id, 'dealer_program_approved');
    return back('approved');
  }

  // revoke
  if (!existing.verified) return back('revoked');
  const { error } = await supabaseAdmin
    .from('dealers')
    .update({ verified: false, verified_at: null, verified_by: null })
    .eq('id', existing.id);

  if (error) {
    reportError(error, { source: 'api/admin/dealers', route: '/api/admin/dealers/[profileId]' });
    return back('error');
  }
  await audit(existing.id, 'dealer_program_revoked', { reason: 'manual' });
  return back('revoked');
}

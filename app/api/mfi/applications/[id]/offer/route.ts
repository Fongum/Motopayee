import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMFIPartner } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';

interface RouteParams {
  params: { id: string };
}

const schema = z.object({
  status: z.enum(['submitted', 'declined', 'withdrawn']).default('submitted'),
  proposed_down_payment_percent: z.number().min(0).max(100).optional(),
  proposed_tenor_months: z.number().int().min(1).max(84).optional(),
  proposed_interest_rate_percent: z.number().min(0).max(100).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireMFIPartner(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('mfi_institution_id')
    .eq('id', auth.user.id)
    .maybeSingle();
  const institutionId = (profile as { mfi_institution_id: string | null } | null)?.mfi_institution_id ?? null;

  if (!institutionId && auth.user.role !== 'admin') {
    return NextResponse.json({ error: 'MFI account is not linked to an institution.' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid offer.' }, { status: 400 });
  }

  const { data: app } = await supabaseAdmin
    .from('financing_applications')
    .select('id, status, listing:listings(id, financeable)')
    .eq('id', params.id)
    .maybeSingle();

  const listing = Array.isArray(app?.listing) ? app?.listing[0] : app?.listing;
  if (!app || !listing?.financeable) {
    return NextResponse.json({ error: 'Application is not available to MFI partners.' }, { status: 404 });
  }

  if (!['submitted', 'docs_received', 'under_review', 'approved'].includes(app.status as string)) {
    return NextResponse.json({ error: 'Application is not open for MFI offers.' }, { status: 409 });
  }

  const { data, error } = await supabaseAdmin
    .from('mfi_application_offers')
    .upsert({
      application_id: params.id,
      mfi_institution_id: institutionId,
      responder_id: auth.user.id,
      ...parsed.data,
    }, { onConflict: 'application_id,mfi_institution_id' })
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to save MFI offer.' }, { status: 500 });
  }

  await supabaseAdmin.from('audit_logs').insert({
    actor_id: auth.user.id,
    actor_email: auth.user.email,
    actor_role: auth.user.role,
    action: 'mfi_offer_saved',
    entity_type: 'financing_applications',
    entity_id: params.id,
    meta: {
      offer_id: data.id,
      mfi_institution_id: institutionId,
      status: parsed.data.status,
    },
  });

  return NextResponse.json({ offer: data }, { status: 201 });
}

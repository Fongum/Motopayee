import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';
import { recordLeadActivity } from '@/lib/launch-lead-activities';
import { z } from 'zod';

interface RouteParams { params: { id: string } }

const schema = z.object({
  item_key: z.string().trim().min(2).max(80).regex(/^[a-z0-9_]+$/),
  checked: z.enum(['true', 'false']).or(z.boolean()),
  note: z.string().trim().max(300).optional(),
  auto_status: z.enum(['none', 'awaiting_assets', 'ready_for_listing']).default('none').optional(),
});

async function parseBody(request: Request): Promise<Record<string, unknown>> {
  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) return request.json().catch(() => ({}));
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const text = await request.text();
    const body: Record<string, unknown> = {};
    const form = new URLSearchParams(text);
    form.forEach((value, key) => { body[key] = value; });
    return body;
  }
  return {};
}

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireStaff(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const parsed = schema.safeParse(await parseBody(request));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid checklist update.' }, { status: 400 });
  }

  const { data: lead, error: leadError } = await supabaseAdmin
    .from('launch_leads')
    .select('id, status, intake_checklist')
    .eq('id', params.id)
    .single();

  if (leadError || !lead) {
    return NextResponse.json({ error: 'Lead not found.' }, { status: 404 });
  }

  const checked = parsed.data.checked === true || parsed.data.checked === 'true';
  const currentChecklist = (
    lead.intake_checklist && typeof lead.intake_checklist === 'object' && !Array.isArray(lead.intake_checklist)
      ? lead.intake_checklist
      : {}
  ) as Record<string, unknown>;
  const nextChecklist = {
    ...currentChecklist,
    [parsed.data.item_key]: {
      checked,
      note: parsed.data.note || null,
      updated_at: new Date().toISOString(),
      updated_by: auth.user.id,
    },
  };

  const updates: Record<string, unknown> = { intake_checklist: nextChecklist };
  if (parsed.data.auto_status && parsed.data.auto_status !== 'none') {
    updates.status = parsed.data.auto_status;
  }

  const { error: updateError } = await supabaseAdmin
    .from('launch_leads')
    .update(updates)
    .eq('id', params.id);

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update checklist.' }, { status: 500 });
  }

  await recordLeadActivity({
    leadId: params.id,
    actorId: auth.user.id,
    action: 'checklist',
    summary: `${checked ? 'Completed' : 'Reopened'} checklist item: ${parsed.data.item_key}`,
    meta: {
      item_key: parsed.data.item_key,
      checked,
      note: parsed.data.note || null,
      status_changed_to: updates.status ?? null,
    },
  });

  await supabaseAdmin.from('audit_logs').insert({
    actor_id: auth.user.id,
    actor_email: auth.user.email,
    actor_role: auth.user.role,
    action: 'launch_lead_checklist_update',
    entity_type: 'launch_leads',
    entity_id: params.id,
    meta: { item_key: parsed.data.item_key, checked, status_changed_to: updates.status ?? null },
  });

  if (request.headers.get('accept')?.includes('text/html')) {
    const referer = request.headers.get('referer');
    if (referer) {
      try {
        if (new URL(referer).origin === new URL(request.url).origin) {
          return NextResponse.redirect(referer);
        }
      } catch {}
    }
    return NextResponse.redirect(new URL(`/admin/leads/${params.id}`, request.url));
  }

  return NextResponse.json({ ok: true, intake_checklist: nextChecklist });
}

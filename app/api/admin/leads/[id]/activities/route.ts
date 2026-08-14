import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';
import { recordLeadActivity } from '@/lib/launch-lead-activities';
import { z } from 'zod';

interface RouteParams { params: { id: string } }

const schema = z.object({
  action: z.enum(['call', 'whatsapp', 'email', 'meeting', 'documents', 'note', 'other']),
  outcome: z.enum(['reached_interested', 'reached_not_ready', 'no_answer', 'meeting_booked', 'documents_requested', 'not_fit', 'converted', 'other']).optional().or(z.literal('')),
  summary: z.string().trim().min(2).max(500),
  follow_up_preset: z.enum(['later_today', 'tomorrow', 'three_days', 'next_week', 'clear']).optional().or(z.literal('')),
  next_follow_up_at: z.string().optional(),
});

function presetFollowUp(preset?: string) {
  if (!preset) return undefined;
  if (preset === 'clear') return null;

  const date = new Date();
  if (preset === 'later_today') {
    date.setHours(date.getHours() + 4, 0, 0, 0);
  }
  if (preset === 'tomorrow') {
    date.setDate(date.getDate() + 1);
    date.setHours(9, 0, 0, 0);
  }
  if (preset === 'three_days') {
    date.setDate(date.getDate() + 3);
    date.setHours(9, 0, 0, 0);
  }
  if (preset === 'next_week') {
    date.setDate(date.getDate() + 7);
    date.setHours(9, 0, 0, 0);
  }
  return date.toISOString();
}

function parseBody(request: Request): Promise<Record<string, unknown>> {
  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return request.json().catch(() => ({}));
  }
  if (contentType.includes('application/x-www-form-urlencoded')) {
    return request.text().then((text) => {
      const body: Record<string, unknown> = {};
      const paramsBody = new URLSearchParams(text);
      paramsBody.forEach((value, key) => { body[key] = value; });
      return body;
    });
  }
  return Promise.resolve({});
}

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireStaff(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const parsed = schema.safeParse(await parseBody(request));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid activity details.' }, { status: 400 });
  }

  const { data: lead, error: leadError } = await supabaseAdmin
    .from('launch_leads')
    .select('id, status')
    .eq('id', params.id)
    .single();

  if (leadError || !lead) {
    return NextResponse.json({ error: 'Lead not found.' }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};
  const presetDate = presetFollowUp(parsed.data.follow_up_preset || undefined);
  if (parsed.data.next_follow_up_at?.trim()) {
    updates.next_follow_up_at = new Date(parsed.data.next_follow_up_at).toISOString();
  } else if (presetDate !== undefined) {
    updates.next_follow_up_at = presetDate;
  }
  if (
    lead.status === 'new' &&
    ['call', 'whatsapp', 'email', 'meeting', 'documents'].includes(parsed.data.action)
  ) {
    updates.status = 'contacted';
  }
  if (parsed.data.outcome === 'reached_interested') {
    updates.status = 'interested';
  }
  if (parsed.data.outcome === 'meeting_booked' || parsed.data.outcome === 'documents_requested') {
    updates.status = 'qualified';
  }
  if (parsed.data.outcome === 'not_fit') {
    updates.status = 'not_fit';
    updates.next_follow_up_at = null;
  }
  if (parsed.data.outcome === 'converted') {
    updates.status = 'converted';
    updates.next_follow_up_at = null;
  }

  if (Object.keys(updates).length > 0) {
    const { error: updateError } = await supabaseAdmin
      .from('launch_leads')
      .update(updates)
      .eq('id', params.id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update lead follow-up.' }, { status: 500 });
    }
  }

  await recordLeadActivity({
    leadId: params.id,
    actorId: auth.user.id,
    action: parsed.data.action,
    summary: parsed.data.summary,
    meta: {
      outcome: parsed.data.outcome || null,
      follow_up_preset: parsed.data.follow_up_preset || null,
      next_follow_up_at: updates.next_follow_up_at ?? null,
      status_changed_to: updates.status ?? null,
    },
  });

  await supabaseAdmin.from('audit_logs').insert({
    actor_id: auth.user.id,
    actor_email: auth.user.email,
    actor_role: auth.user.role,
    action: 'launch_lead_activity_added',
    entity_type: 'launch_leads',
    entity_id: params.id,
    meta: { action: parsed.data.action, outcome: parsed.data.outcome || null, follow_up_preset: parsed.data.follow_up_preset || null, ...updates },
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
    return NextResponse.redirect(new URL('/admin/leads', request.url));
  }

  return NextResponse.json({ ok: true });
}

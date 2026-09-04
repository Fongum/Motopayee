import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';
import { recordLeadActivity } from '@/lib/launch-lead-activities';
import { QUICK_LEAD_ACTIVITY_TEMPLATES } from '@/lib/launch-lead-playbooks';
import { z } from 'zod';
import { LEAD_STATUSES } from '@/lib/launch-lead-metrics';

const QUICK_ACTIVITY_IDS = QUICK_LEAD_ACTIVITY_TEMPLATES.map((template) => template.id) as [string, ...string[]];

const schema = z.object({
  lead_ids: z.array(z.string().uuid()).max(100).default([]),
  visible_lead_ids: z.array(z.string().uuid()).max(100).default([]),
  selection_scope: z.enum(['selected', 'visible']).default('selected'),
  assigned_to: z.string().uuid().optional().or(z.literal('')).or(z.literal('__no_change')),
  status: z.enum(LEAD_STATUSES).optional().or(z.literal('')).or(z.literal('__no_change')),
  priority: z.enum(['low', 'normal', 'high']).optional().or(z.literal('')).or(z.literal('__no_change')),
  campaign_action: z.enum(['__no_change', 'set', 'clear']).default('__no_change'),
  campaign_name: z.string().trim().max(120).optional(),
  follow_up_preset: z.enum(['later_today', 'tomorrow', 'three_days', 'next_week', 'clear']).optional().or(z.literal('')).or(z.literal('__no_change')),
  activity_template: z.enum(QUICK_ACTIVITY_IDS).optional().or(z.literal('')).or(z.literal('__no_change')),
});

function presetFollowUp(preset?: string) {
  if (!preset || preset === '__no_change') return undefined;
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

async function parseBody(request: Request) {
  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const body = await request.json().catch(() => ({}));
    return {
      ...body,
      lead_ids: Array.isArray(body.lead_ids) ? body.lead_ids : [body.lead_ids].filter(Boolean),
      visible_lead_ids: Array.isArray(body.visible_lead_ids) ? body.visible_lead_ids : [body.visible_lead_ids].filter(Boolean),
    };
  }
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const text = await request.text();
    const params = new URLSearchParams(text);
    return {
      lead_ids: params.getAll('lead_ids'),
      visible_lead_ids: params.getAll('visible_lead_ids'),
      selection_scope: params.get('selection_scope') ?? 'selected',
      assigned_to: params.get('assigned_to') ?? '__no_change',
      status: params.get('status') ?? '__no_change',
      priority: params.get('priority') ?? '__no_change',
      campaign_action: params.get('campaign_action') ?? '__no_change',
      campaign_name: params.get('campaign_name') ?? '',
      follow_up_preset: params.get('follow_up_preset') ?? '__no_change',
      activity_template: params.get('activity_template') ?? '__no_change',
    };
  }
  return { lead_ids: [], visible_lead_ids: [] };
}

export async function POST(request: Request) {
  const auth = await requireStaff(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const parsed = schema.safeParse(await parseBody(request));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid bulk lead update.' }, { status: 400 });
  }
  const targetLeadIds = parsed.data.selection_scope === 'visible'
    ? parsed.data.visible_lead_ids
    : parsed.data.lead_ids;

  if (targetLeadIds.length === 0) {
    return NextResponse.json({ error: 'No leads selected for bulk update.' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  const activityTemplate = parsed.data.activity_template && parsed.data.activity_template !== '__no_change'
    ? QUICK_LEAD_ACTIVITY_TEMPLATES.find((template) => template.id === parsed.data.activity_template)
    : undefined;
  const hasExplicitStatus = Boolean(parsed.data.status && parsed.data.status !== '__no_change');
  if (parsed.data.assigned_to !== undefined && parsed.data.assigned_to !== '__no_change') {
    updates.assigned_to = parsed.data.assigned_to || null;
  }
  if (parsed.data.priority && parsed.data.priority !== '__no_change') {
    updates.priority = parsed.data.priority;
  }
  if (parsed.data.campaign_action === 'set') {
    if (!parsed.data.campaign_name?.trim()) {
      return NextResponse.json({ error: 'Campaign name is required.' }, { status: 400 });
    }
    updates.campaign_name = parsed.data.campaign_name.trim();
  }
  if (parsed.data.campaign_action === 'clear') {
    updates.campaign_name = null;
  }
  if (activityTemplate) {
    const templateFollowUp = presetFollowUp(activityTemplate.followUpPreset);
    if (templateFollowUp !== undefined) {
      updates.next_follow_up_at = templateFollowUp;
    }
    if (!hasExplicitStatus) {
      updates.status = 'contacted';
    }
    if (!hasExplicitStatus && activityTemplate.outcome === 'reached_interested') {
      updates.status = 'interested';
    }
    if (!hasExplicitStatus && activityTemplate.outcome === 'meeting_booked') {
      updates.status = 'qualified';
    }
    if (!hasExplicitStatus && activityTemplate.outcome === 'documents_requested') {
      updates.status = 'awaiting_assets';
    }
  }
  const followUp = presetFollowUp(parsed.data.follow_up_preset);
  if (followUp !== undefined) {
    updates.next_follow_up_at = followUp;
  }
  if (parsed.data.status && parsed.data.status !== '__no_change') {
    updates.status = parsed.data.status;
  }
  if (updates.status === 'converted' || updates.status === 'not_fit' || updates.status === 'closed') {
    updates.next_follow_up_at = null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No bulk updates provided.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('launch_leads')
    .update(updates)
    .in('id', targetLeadIds)
    .select('id');

  if (error) {
    return NextResponse.json({ error: 'Failed to update selected leads.' }, { status: 500 });
  }

  const updatedIds = (data ?? []).map((lead) => lead.id as string);

  await supabaseAdmin.from('audit_logs').insert({
    actor_id: auth.user.id,
    actor_email: auth.user.email,
    actor_role: auth.user.role,
    action: 'launch_leads_bulk_update',
    entity_type: 'launch_leads',
    entity_id: null,
    meta: { lead_ids: updatedIds, updates },
  });

  await Promise.all(updatedIds.map((leadId) => recordLeadActivity({
    leadId,
    actorId: auth.user.id,
    action: activityTemplate?.action ?? 'updated',
    summary: activityTemplate?.summary ?? `Bulk updated ${Object.keys(updates).join(', ')}`,
    meta: {
      bulk: true,
      activity_template: activityTemplate?.id ?? null,
      outcome: activityTemplate?.outcome ?? null,
      follow_up_preset: activityTemplate?.followUpPreset ?? parsed.data.follow_up_preset ?? null,
      ...updates,
    },
  })));

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

  return NextResponse.json({ updated: updatedIds.length });
}

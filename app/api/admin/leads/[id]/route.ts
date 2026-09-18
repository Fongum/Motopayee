import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';
import { recordLeadActivity } from '@/lib/launch-lead-activities';
import { z } from 'zod';
import { LEAD_STATUSES } from '@/lib/launch-lead-metrics';

interface RouteParams { params: { id: string } }

const schema = z.object({
  status: z.enum(LEAD_STATUSES).optional(),
  priority: z.enum(['low', 'normal', 'high']).optional(),
  assigned_to: z.string().uuid().optional().or(z.literal('')),
  next_follow_up_at: z.string().optional(),
  campaign_name: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(1500).optional(),
  converted_entity_type: z.enum(['profile', 'dealer', 'listing', 'hire_listing', 'mfi_institution', 'inspection_request', 'financing_application', 'other']).optional().or(z.literal('')),
  converted_entity_id: z.string().uuid().optional().or(z.literal('')),
});

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireStaff(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: Record<string, unknown> = {};
  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    body = await request.json().catch(() => ({}));
  } else if (contentType.includes('application/x-www-form-urlencoded')) {
    const text = await request.text();
    const paramsBody = new URLSearchParams(text);
    paramsBody.forEach((value, key) => { body[key] = value; });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid lead update.' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.status) updates.status = parsed.data.status;
  if (parsed.data.priority) updates.priority = parsed.data.priority;
  if (parsed.data.assigned_to !== undefined) updates.assigned_to = parsed.data.assigned_to || null;
  if (parsed.data.next_follow_up_at !== undefined) {
    updates.next_follow_up_at = parsed.data.next_follow_up_at ? new Date(parsed.data.next_follow_up_at).toISOString() : null;
  }
  if (parsed.data.campaign_name !== undefined) updates.campaign_name = parsed.data.campaign_name || null;
  if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes || null;
  if (parsed.data.converted_entity_type !== undefined) updates.converted_entity_type = parsed.data.converted_entity_type || null;
  if (parsed.data.converted_entity_id !== undefined) updates.converted_entity_id = parsed.data.converted_entity_id || null;
  if (parsed.data.status === 'converted') {
    updates.next_follow_up_at = null;
  }
  const changedFields = Object.keys(updates);

  if (changedFields.length === 0) {
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

    return NextResponse.json({ error: 'No lead updates provided.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('launch_leads')
    .update(updates)
    .eq('id', params.id)
    .select('id, status')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to update lead.' }, { status: 500 });
  }

  await supabaseAdmin.from('audit_logs').insert({
    actor_id: auth.user.id,
    actor_email: auth.user.email,
    actor_role: auth.user.role,
    action: 'launch_lead_update',
    entity_type: 'launch_leads',
    entity_id: params.id,
    meta: updates,
  });

  await recordLeadActivity({
    leadId: params.id,
    actorId: auth.user.id,
    action: parsed.data.status === 'converted' ? 'converted' : 'updated',
    summary: parsed.data.status === 'converted'
      ? 'Lead marked converted'
      : `Updated ${changedFields.join(', ')}`,
    meta: updates,
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

  return NextResponse.json({ lead: data });
}

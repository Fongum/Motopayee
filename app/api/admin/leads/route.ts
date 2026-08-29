import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';
import { recordLeadActivity } from '@/lib/launch-lead-activities';
import { findMatchingLaunchLead, leadEmailKey, leadPhoneKey } from '@/lib/launch-leads';
import { z } from 'zod';

const schema = z.object({
  lead_type: z.enum(['seller', 'dealer', 'rental_owner', 'buyer', 'renter', 'mfi', 'inspection', 'other']),
  source: z.enum(['website', 'whatsapp', 'referral', 'facebook', 'field', 'dealer_visit', 'staff', 'other']).default('staff'),
  status: z.enum(['new', 'contacted', 'interested', 'qualified', 'awaiting_assets', 'ready_for_listing', 'onboarding', 'converted', 'not_fit', 'closed']).default('new'),
  priority: z.enum(['low', 'normal', 'high']).default('normal'),
  name: z.string().trim().min(2).max(120),
  business_name: z.string().trim().max(160).optional(),
  phone: z.string().trim().max(40).optional(),
  email: z.string().trim().email().optional().or(z.literal('')),
  city: z.string().trim().max(80).optional(),
  interest: z.string().trim().max(240).optional(),
  campaign_name: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(1500).optional(),
  assigned_to: z.string().uuid().optional().or(z.literal('')),
  next_follow_up_at: z.string().optional(),
});

export async function POST(request: Request) {
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
    return NextResponse.json({ error: 'Invalid lead details.' }, { status: 400 });
  }

  const phoneKey = leadPhoneKey(parsed.data.phone);
  const emailKey = leadEmailKey(parsed.data.email);
  const payload = {
    lead_type: parsed.data.lead_type,
    source: parsed.data.source,
    status: parsed.data.status,
    priority: parsed.data.priority,
    name: parsed.data.name,
    business_name: parsed.data.business_name || null,
    phone: parsed.data.phone || null,
    phone_key: phoneKey,
    email: parsed.data.email || null,
    email_key: emailKey,
    city: parsed.data.city || null,
    interest: parsed.data.interest || null,
    campaign_name: parsed.data.campaign_name || null,
    notes: parsed.data.notes || null,
    assigned_to: parsed.data.assigned_to || auth.user.id,
    next_follow_up_at: parsed.data.next_follow_up_at ? new Date(parsed.data.next_follow_up_at).toISOString() : null,
  };

  const existingLead = await findMatchingLaunchLead({ phoneKey, emailKey });
  if (existingLead) {
    const { data, error } = await supabaseAdmin
      .from('launch_leads')
      .update(payload)
      .eq('id', existingLead.id)
      .select('id')
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Failed to update matching lead.' }, { status: 500 });
    }

    await supabaseAdmin.from('audit_logs').insert({
      actor_id: auth.user.id,
      actor_email: auth.user.email,
      actor_role: auth.user.role,
      action: 'launch_lead_duplicate_updated',
      entity_type: 'launch_leads',
      entity_id: existingLead.id,
      meta: { lead_type: parsed.data.lead_type, source: parsed.data.source, campaign_name: parsed.data.campaign_name || null },
    });

    await recordLeadActivity({
      leadId: existingLead.id,
      actorId: auth.user.id,
      action: 'duplicate_updated',
      summary: `Staff entry matched and updated existing lead from ${parsed.data.source}`,
      meta: { lead_type: parsed.data.lead_type, source: parsed.data.source, campaign_name: parsed.data.campaign_name || null, phone_key: phoneKey, email_key: emailKey },
    });

    if (request.headers.get('accept')?.includes('text/html')) {
      return NextResponse.redirect(new URL(`/admin/leads/${existingLead.id}`, request.url));
    }

    return NextResponse.json({ lead: data, duplicate: true });
  }

  const { data, error } = await supabaseAdmin
    .from('launch_leads')
    .insert(payload)
    .select('id')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to create lead.' }, { status: 500 });
  }

  await supabaseAdmin.from('audit_logs').insert({
    actor_id: auth.user.id,
    actor_email: auth.user.email,
    actor_role: auth.user.role,
    action: 'launch_lead_created',
    entity_type: 'launch_leads',
    entity_id: data.id,
    meta: { lead_type: parsed.data.lead_type, source: parsed.data.source, campaign_name: parsed.data.campaign_name || null },
  });

  await recordLeadActivity({
    leadId: data.id,
    actorId: auth.user.id,
    action: 'created',
    summary: `Lead created from ${parsed.data.source}`,
    meta: { lead_type: parsed.data.lead_type, source: parsed.data.source, campaign_name: parsed.data.campaign_name || null },
  });

  if (request.headers.get('accept')?.includes('text/html')) {
    return NextResponse.redirect(new URL('/admin/leads?status=new', request.url));
  }

  return NextResponse.json({ lead: data }, { status: 201 });
}

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/auth/server';
import { findMatchingLaunchLead, leadEmailKey, leadPhoneKey } from '@/lib/launch-leads';
import { recordLeadActivity } from '@/lib/launch-lead-activities';
import { z } from 'zod';

const schema = z.object({
  lead_type: z.enum(['seller', 'dealer', 'rental_owner', 'buyer', 'renter', 'mfi', 'inspection', 'other']),
  source: z.enum(['website', 'whatsapp', 'referral', 'facebook', 'field', 'dealer_visit', 'staff', 'other']).default('website'),
  name: z.string().trim().min(2).max(120),
  business_name: z.string().trim().max(160).optional(),
  phone: z.string().trim().max(40).optional(),
  email: z.string().trim().email().optional().or(z.literal('')),
  city: z.string().trim().max(80).optional(),
  interest: z.string().trim().max(240).optional(),
  campaign_name: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid lead details.' }, { status: 400 });
  }

  const phoneKey = leadPhoneKey(parsed.data.phone);
  const emailKey = leadEmailKey(parsed.data.email);
  const payload = {
    ...parsed.data,
    email: parsed.data.email || null,
    business_name: parsed.data.business_name || null,
    phone: parsed.data.phone || null,
    phone_key: phoneKey,
    email_key: emailKey,
    city: parsed.data.city || null,
    interest: parsed.data.interest || null,
    campaign_name: parsed.data.campaign_name || null,
    notes: parsed.data.notes || null,
    status: 'new',
  };

  const existingLead = await findMatchingLaunchLead({ phoneKey, emailKey });
  if (existingLead) {
    const updates = {
      lead_type: parsed.data.lead_type,
      source: parsed.data.source,
      name: parsed.data.name,
      business_name: parsed.data.business_name || null,
      phone: parsed.data.phone || null,
      phone_key: phoneKey,
      email: parsed.data.email || null,
      email_key: emailKey,
      city: parsed.data.city || null,
      interest: parsed.data.interest || null,
      campaign_name: parsed.data.campaign_name || null,
      notes: parsed.data.notes || existingLead.notes || null,
      status: ['converted', 'closed'].includes(existingLead.status) ? existingLead.status : 'new',
    };

    const { data, error } = await supabaseAdmin
      .from('launch_leads')
      .update(updates)
      .eq('id', existingLead.id)
      .select('id')
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Failed to submit lead.' }, { status: 500 });
    }

    await recordLeadActivity({
      leadId: existingLead.id,
      actorId: null,
      action: 'duplicate_submission',
      summary: `New ${parsed.data.source} submission matched existing lead`,
      meta: { lead_type: parsed.data.lead_type, phone_key: phoneKey, email_key: emailKey },
    });

    return NextResponse.json({ lead: data, duplicate: true });
  }

  const { data, error } = await supabaseAdmin
    .from('launch_leads')
    .insert(payload)
    .select('id')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to submit lead.' }, { status: 500 });
  }

  await recordLeadActivity({
    leadId: data.id,
    actorId: null,
    action: 'created',
    summary: `Lead created from ${parsed.data.source}`,
    meta: { lead_type: parsed.data.lead_type, source: parsed.data.source },
  });

  return NextResponse.json({ lead: data }, { status: 201 });
}

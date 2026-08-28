import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';
import { recordLeadActivity } from '@/lib/launch-lead-activities';
import { z } from 'zod';

interface RouteParams { params: { id: string } }

const schema = z.object({
  role: z.enum(['buyer', 'seller_individual', 'seller_dealer']),
  next: z.enum(['detail', 'sale_listing', 'hire_listing', 'finance_matches']).default('detail').optional(),
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

function zoneFromCity(city: string | null | undefined) {
  const value = city
    ?.trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (!value) return null;
  if (['douala', 'yaounde', 'buea', 'limbe'].includes(value)) return 'A';
  return null;
}

function fallbackEmail(leadId: string, phone: string | null | undefined) {
  const digits = phone?.replace(/\D/g, '').slice(-12);
  return `${digits || leadId.slice(0, 8)}.${leadId.slice(0, 8)}@lead.motopayee.local`;
}

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireStaff(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const parsed = schema.safeParse(await parseBody(request));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid profile request.' }, { status: 400 });
  }

  const { data: lead, error: leadError } = await supabaseAdmin
    .from('launch_leads')
    .select('id, lead_type, name, business_name, phone, email, city, notes')
    .eq('id', params.id)
    .single();

  if (leadError || !lead) {
    return NextResponse.json({ error: 'Lead not found.' }, { status: 404 });
  }

  const email = (lead.email as string | null)?.trim().toLowerCase() || fallbackEmail(params.id, lead.phone as string | null);
  const role = parsed.data.role;
  const fullName = role === 'seller_dealer'
    ? ((lead.business_name as string | null) || (lead.name as string))
    : (lead.name as string);

  let profileId: string | null = null;
  const { data: existingByEmail } = await supabaseAdmin
    .from('profiles')
    .select('id, role')
    .eq('email', email)
    .maybeSingle();

  if (existingByEmail) {
    profileId = existingByEmail.id as string;
  } else if (lead.phone) {
    const { data: existingByPhone } = await supabaseAdmin
      .from('profiles')
      .select('id, role')
      .eq('phone', lead.phone)
      .eq('role', role)
      .maybeSingle();
    if (existingByPhone) profileId = existingByPhone.id as string;
  }

  if (!profileId) {
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        email,
        full_name: fullName,
        phone: lead.phone || null,
        city: lead.city || null,
        zone: zoneFromCity(lead.city as string | null),
        role,
        status: 'active',
      })
      .select('id')
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Failed to create profile.' }, { status: 500 });
    }
    profileId = profile.id as string;
  }

  if (role === 'seller_dealer') {
    const { data: existingDealer } = await supabaseAdmin
      .from('dealers')
      .select('id')
      .eq('profile_id', profileId)
      .maybeSingle();

    if (!existingDealer) {
      await supabaseAdmin.from('dealers').insert({
        profile_id: profileId,
        dealer_name: (lead.business_name as string | null) || (lead.name as string),
        city: lead.city || null,
        zone: zoneFromCity(lead.city as string | null),
        contact_email: email,
        contact_phone: lead.phone || null,
      });
    }
  }

  await supabaseAdmin
    .from('launch_leads')
    .update({
      converted_entity_type: 'profile',
      converted_entity_id: profileId,
      status: 'ready_for_listing',
    })
    .eq('id', params.id);

  await recordLeadActivity({
    leadId: params.id,
    actorId: auth.user.id,
    action: 'profile_created',
    summary: `Operational profile ready: ${role}`,
    meta: { profile_id: profileId, role, email },
  });

  await supabaseAdmin.from('audit_logs').insert({
    actor_id: auth.user.id,
    actor_email: auth.user.email,
    actor_role: auth.user.role,
    action: 'launch_lead_profile_created',
    entity_type: 'profiles',
    entity_id: profileId,
    meta: { lead_id: params.id, role, email },
  });

  if (request.headers.get('accept')?.includes('text/html')) {
    const next = parsed.data.next ?? 'detail';
    if (next === 'sale_listing') {
      return NextResponse.redirect(new URL(`/admin/listings/new?launch_lead_id=${params.id}&seller_id=${profileId}`, request.url));
    }
    if (next === 'hire_listing') {
      return NextResponse.redirect(new URL(`/admin/hire/new?launch_lead_id=${params.id}&owner_id=${profileId}`, request.url));
    }
    if (next === 'finance_matches') {
      return NextResponse.redirect(new URL(`/admin/finance/matches?lead_id=${params.id}&buyer_id=${profileId}`, request.url));
    }
    return NextResponse.redirect(new URL(`/admin/leads/${params.id}`, request.url));
  }

  return NextResponse.json({ profile_id: profileId });
}

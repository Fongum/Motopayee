import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';
import { recordLeadActivity } from '@/lib/launch-lead-activities';
import { z } from 'zod';

const schema = z.object({
  seller_id: z.string().uuid(),
  make: z.string().trim().min(1),
  model: z.string().trim().min(1),
  year: z.coerce.number().int().min(1960).max(new Date().getFullYear() + 1),
  mileage_km: z.coerce.number().int().min(0).default(0),
  fuel_type: z.enum(['petrol', 'diesel', 'electric', 'hybrid', 'other']).default('petrol'),
  transmission: z.enum(['manual', 'automatic', 'other']).default('manual'),
  color: z.string().trim().optional().or(z.literal('')),
  engine_cc: z.coerce.number().int().min(0).optional().or(z.literal('')),
  seats: z.coerce.number().int().min(1).optional().or(z.literal('')),
  asking_price: z.coerce.number().min(0),
  zone: z.enum(['A', 'B', 'C']),
  city: z.string().trim().optional().or(z.literal('')),
  description: z.string().trim().optional().or(z.literal('')),
  launch_lead_id: z.string().uuid().optional().or(z.literal('')),
});

async function parseBody(request: Request) {
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

export async function POST(request: Request) {
  const auth = await requireStaff(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const parsed = schema.safeParse(await parseBody(request));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid listing.' }, { status: 400 });
  }

  const { launch_lead_id, seller_id, asking_price, zone, city, description, ...vehicleInput } = parsed.data;
  const { data: seller } = await supabaseAdmin
    .from('profiles')
    .select('id, role')
    .eq('id', seller_id)
    .in('role', ['seller_individual', 'seller_dealer'])
    .single();

  if (!seller) {
    return NextResponse.json({ error: 'Seller profile is required.' }, { status: 400 });
  }

  const { data: vehicle, error: vehicleError } = await supabaseAdmin
    .from('vehicles')
    .insert({
      ...vehicleInput,
      color: vehicleInput.color || null,
      engine_cc: vehicleInput.engine_cc || null,
      seats: vehicleInput.seats || null,
    })
    .select()
    .single();

  if (vehicleError || !vehicle) {
    return NextResponse.json({ error: 'Failed to create vehicle.' }, { status: 500 });
  }

  const { data: listing, error: listingError } = await supabaseAdmin
    .from('listings')
    .insert({
      vehicle_id: vehicle.id,
      seller_id,
      asking_price,
      zone,
      city: city || null,
      description: description || null,
      status: 'draft',
    })
    .select('id')
    .single();

  if (listingError || !listing) {
    await supabaseAdmin.from('vehicles').delete().eq('id', vehicle.id);
    return NextResponse.json({ error: 'Failed to create listing.' }, { status: 500 });
  }

  if (launch_lead_id) {
    const { data: convertedLead } = await supabaseAdmin
      .from('launch_leads')
      .update({
        status: 'converted',
        converted_entity_type: 'listing',
        converted_entity_id: listing.id,
        next_follow_up_at: null,
      })
      .eq('id', launch_lead_id)
      .in('lead_type', ['seller', 'dealer'])
      .neq('status', 'converted')
      .select('id')
      .maybeSingle();

    if (convertedLead) {
      await recordLeadActivity({
        leadId: launch_lead_id,
        actorId: auth.user.id,
        action: 'converted',
        summary: 'Lead converted into staff-created sale listing',
        meta: { listing_id: listing.id, vehicle_id: vehicle.id, seller_id },
      });
    }
  }

  await supabaseAdmin.from('audit_logs').insert({
    actor_id: auth.user.id,
    actor_email: auth.user.email,
    actor_role: auth.user.role,
    action: 'admin_listing_created',
    entity_type: 'listings',
    entity_id: listing.id,
    meta: { seller_id, vehicle_id: vehicle.id, launch_lead_id: launch_lead_id || null },
  });

  if (request.headers.get('accept')?.includes('text/html')) {
    return NextResponse.redirect(new URL(`/admin/listings/${listing.id}`, request.url));
  }

  return NextResponse.json({ listing_id: listing.id }, { status: 201 });
}

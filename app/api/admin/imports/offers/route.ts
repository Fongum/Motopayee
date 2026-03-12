import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';

const createSchema = z.object({
  partner_name: z.string().trim().min(2).max(120),
  source_country: z.string().trim().min(2).max(50).default('US'),
  source_type: z.enum(['auction', 'dealer', 'private']).default('auction'),
  external_ref: z.string().trim().max(120).optional().nullable(),
  external_url: z.string().trim().url().max(500).optional().nullable(),
  lot_number: z.string().trim().max(120).optional().nullable(),
  status: z.enum(['draft', 'active', 'reserved', 'withdrawn', 'expired']).default('active'),
  headline: z.string().trim().min(5).max(160),
  make: z.string().trim().min(2).max(50),
  model: z.string().trim().min(1).max(50),
  year: z.number().int().min(1960).max(new Date().getFullYear() + 1),
  mileage_km: z.number().int().min(0).optional().nullable(),
  fuel_type: z.enum(['petrol', 'diesel', 'electric', 'hybrid', 'other']).optional().nullable(),
  transmission: z.enum(['manual', 'automatic', 'other']).optional().nullable(),
  color: z.string().trim().max(40).optional().nullable(),
  vin_last6: z.string().trim().max(12).optional().nullable(),
  title_status: z.string().trim().max(120).optional().nullable(),
  condition_summary: z.string().trim().max(1200).optional().nullable(),
  damage_summary: z.string().trim().max(1200).optional().nullable(),
  vehicle_price: z.number().min(0),
  auction_fee: z.number().min(0),
  inland_transport_fee: z.number().min(0),
  shipping_fee: z.number().min(0),
  insurance_fee: z.number().min(0),
  documentation_fee: z.number().min(0),
  motopayee_fee: z.number().min(0),
  estimated_customs_fee: z.number().min(0),
  estimated_port_fee: z.number().min(0),
  cover_image_url: z.string().trim().url().max(500).optional().nullable(),
  media_urls: z.array(z.string().trim().url().max(500)).optional().default([]),
  auction_end_at: z.string().datetime().optional().nullable(),
});

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data, error } = await supabaseAdmin
    .from('import_offers')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch import offers.' }, { status: 500 });
  }

  return NextResponse.json({ offers: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid offer data.' }, { status: 400 });
  }

  const totalEstimatedXaf = [
    parsed.data.vehicle_price,
    parsed.data.auction_fee,
    parsed.data.inland_transport_fee,
    parsed.data.shipping_fee,
    parsed.data.insurance_fee,
    parsed.data.documentation_fee,
    parsed.data.motopayee_fee,
    parsed.data.estimated_customs_fee,
    parsed.data.estimated_port_fee,
  ].reduce((sum, value) => sum + value, 0);

  const mediaJson = parsed.data.media_urls.map((url, index) => ({
    id: index + 1,
    url,
  }));

  const { data, error } = await supabaseAdmin
    .from('import_offers')
    .insert({
      partner_name: parsed.data.partner_name,
      source_country: parsed.data.source_country,
      source_type: parsed.data.source_type,
      external_ref: parsed.data.external_ref || null,
      external_url: parsed.data.external_url || null,
      lot_number: parsed.data.lot_number || null,
      status: parsed.data.status,
      headline: parsed.data.headline,
      make: parsed.data.make,
      model: parsed.data.model,
      year: parsed.data.year,
      mileage_km: parsed.data.mileage_km ?? null,
      fuel_type: parsed.data.fuel_type ?? null,
      transmission: parsed.data.transmission ?? null,
      color: parsed.data.color || null,
      vin_last6: parsed.data.vin_last6 || null,
      title_status: parsed.data.title_status || null,
      condition_summary: parsed.data.condition_summary || null,
      damage_summary: parsed.data.damage_summary || null,
      vehicle_price: parsed.data.vehicle_price,
      auction_fee: parsed.data.auction_fee,
      inland_transport_fee: parsed.data.inland_transport_fee,
      shipping_fee: parsed.data.shipping_fee,
      insurance_fee: parsed.data.insurance_fee,
      documentation_fee: parsed.data.documentation_fee,
      motopayee_fee: parsed.data.motopayee_fee,
      estimated_customs_fee: parsed.data.estimated_customs_fee,
      estimated_port_fee: parsed.data.estimated_port_fee,
      total_estimated_xaf: totalEstimatedXaf,
      cover_image_url: parsed.data.cover_image_url || null,
      media_json: mediaJson,
      auction_end_at: parsed.data.auction_end_at || null,
      created_by: auth.user.id,
    })
    .select('*')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to create import offer.' }, { status: 500 });
  }

  await supabaseAdmin.from('audit_logs').insert({
    actor_id: auth.user.id,
    actor_email: auth.user.email,
    actor_role: auth.user.role,
    action: 'import_offer_created',
    entity_type: 'import_offers',
    entity_id: data.id,
    meta: {
      partner_name: data.partner_name,
      source_country: data.source_country,
      make: data.make,
      model: data.model,
      total_estimated_xaf: data.total_estimated_xaf,
    },
  });

  return NextResponse.json({ offer: data }, { status: 201 });
}

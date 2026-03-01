import { NextResponse } from 'next/server';
import { requireInspector } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';
import { computeMVE, computePriceBand } from '@/lib/pricing';
import { z } from 'zod';
import type { ConditionGrade } from '@/lib/types';

interface RouteParams { params: { listingId: string } }

const schema = z.object({
  condition_grade: z.enum(['A', 'B', 'C', 'D']),
  financeable: z.boolean(),
  report_json: z.record(z.string(), z.unknown()).default(() => ({})),
  repair_estimate_low: z.number().min(0).optional(),
  repair_estimate_high: z.number().min(0).optional(),
  notes: z.string().optional(),
});

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireInspector(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data: listing } = await supabaseAdmin
    .from('listings')
    .select('id, status, inspector_id, zone, asking_price, vehicle:vehicles(*)')
    .eq('id', params.listingId)
    .single();

  if (!listing) {
    return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
  }

  if (auth.user.role !== 'admin' && listing.inspector_id !== auth.user.id) {
    return NextResponse.json({ error: 'Not assigned to this listing.' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request.' }, { status: 400 });
  }

  const vehicle = listing.vehicle as unknown as { id: string; make: string; model: string; year: number; mileage_km: number } | null;

  // Save inspection
  const { data: inspection, error: inspError } = await supabaseAdmin
    .from('inspections')
    .insert({
      listing_id: params.listingId,
      inspector_id: auth.user.id,
      ...parsed.data,
    })
    .select()
    .single();

  if (inspError || !inspection) {
    return NextResponse.json({ error: 'Failed to save inspection.' }, { status: 500 });
  }

  // Update vehicle condition grade
  await supabaseAdmin
    .from('vehicles')
    .update({
      condition_grade: parsed.data.condition_grade,
      inspection_notes: parsed.data.notes,
    })
    .eq('id', vehicle?.id ?? '');

  // Compute MVE and price band
  let listingUpdates: Record<string, unknown> = {
    status: 'inspected',
    financeable: parsed.data.financeable,
  };

  if (vehicle) {
    const mve = computeMVE(
      vehicle.make,
      vehicle.model,
      vehicle.year,
      vehicle.mileage_km,
      parsed.data.condition_grade as ConditionGrade,
      listing.zone
    );
    const priceBand = computePriceBand(listing.asking_price, mve.suggested_price);
    listingUpdates = {
      ...listingUpdates,
      mve_low: mve.mve_low,
      mve_high: mve.mve_high,
      suggested_price: mve.suggested_price,
      price_band: priceBand,
    };
  }

  await supabaseAdmin
    .from('listings')
    .update(listingUpdates)
    .eq('id', params.listingId);

  await supabaseAdmin.from('audit_logs').insert({
    actor_id: auth.user.id,
    actor_email: auth.user.email,
    actor_role: auth.user.role,
    action: 'inspection_submitted',
    entity_type: 'listings',
    entity_id: params.listingId,
    meta: {
      condition_grade: parsed.data.condition_grade,
      financeable: parsed.data.financeable,
      from: listing.status,
      to: 'inspected',
    },
  });

  return NextResponse.json({ inspection, listing_updated: true }, { status: 201 });
}

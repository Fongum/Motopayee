import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/auth/server';
import { requireAuth, requireSeller } from '@/lib/auth/middleware';
import { parseBody } from '@/lib/validation';
import { createHireListingSchema } from '@/lib/hire-schemas';
import { recordLeadActivity } from '@/lib/launch-lead-activities';
import type { HireListing } from '@/lib/types';

// GET /api/hire — Browse published hire listings (public)
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const pageSize = 20;
  const offset = (page - 1) * pageSize;

  let q = supabaseAdmin
    .from('hire_listings')
    .select('*, owner:profiles!owner_id(full_name, is_verified, phone), media:hire_listing_media(*)', { count: 'exact' })
    .eq('status', 'published');

  // Filters
  const city = searchParams.get('city');
  const zone = searchParams.get('zone');
  const make = searchParams.get('make');
  const hireType = searchParams.get('hire_type');
  const minPrice = searchParams.get('min_price');
  const maxPrice = searchParams.get('max_price');
  const fuelType = searchParams.get('fuel_type');
  const transmission = searchParams.get('transmission');
  const seats = searchParams.get('min_seats');
  const available = searchParams.get('available');

  if (city)         q = q.ilike('city', `%${city}%`);
  if (zone)         q = q.eq('zone', zone);
  if (make)         q = q.ilike('make', `%${make}%`);
  if (hireType)     q = q.in('hire_type', [hireType, 'both']);
  if (minPrice)     q = q.gte('daily_rate', parseInt(minPrice));
  if (maxPrice)     q = q.lte('daily_rate', parseInt(maxPrice));
  if (fuelType)     q = q.eq('fuel_type', fuelType);
  if (transmission) q = q.eq('transmission', transmission);
  if (seats)        q = q.gte('seats', parseInt(seats));
  if (available === 'true') q = q.eq('availability', 'available');

  // Sort
  const sort = searchParams.get('sort');
  switch (sort) {
    case 'price_asc':  q = q.order('daily_rate', { ascending: true }); break;
    case 'price_desc': q = q.order('daily_rate', { ascending: false }); break;
    default:           q = q.order('created_at', { ascending: false }); break;
  }

  const { data, count, error } = await q.range(offset, offset + pageSize - 1);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ listings: data as unknown as HireListing[], total: count ?? 0 });
}

// POST /api/hire — Create a hire listing (sellers only)
export async function POST(request: NextRequest) {
  const auth = await requireSeller(request);
  if (!auth.authenticated) {
    // Also allow buyers to list for hire
    const authAny = await requireAuth(request);
    if (!authAny.authenticated) {
      return NextResponse.json({ error: authAny.error }, { status: authAny.status });
    }
    // Any authenticated user can create a hire listing
    return createHireListing(authAny.user.id, request);
  }

  return createHireListing(auth.user.id, request);
}

async function createHireListing(ownerId: string, request: NextRequest) {
  const parsed = await parseBody(createHireListingSchema, request, 'Annonce de location invalide.');
  if (!parsed.success) return parsed.response;
  const { launch_lead_id, ...hireListingData } = parsed.data;

  // The schema supplies every default, so the payload can be written straight
  // through — null-coalescing per field is no longer needed.
  const { data, error } = await supabaseAdmin
    .from('hire_listings')
    .insert({
      ...hireListingData,
      owner_id: ownerId,
      status: 'pending_review',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (launch_lead_id) {
    const { data: convertedLead } = await supabaseAdmin
      .from('launch_leads')
      .update({
        status: 'converted',
        converted_entity_type: 'hire_listing',
        converted_entity_id: data.id,
        next_follow_up_at: null,
      })
      .eq('id', launch_lead_id)
      .eq('lead_type', 'rental_owner')
      .neq('status', 'converted')
      .select('id')
      .maybeSingle();

    if (convertedLead) {
      await recordLeadActivity({
        leadId: launch_lead_id,
        actorId: ownerId,
        action: 'converted',
        summary: 'Lead converted into rental listing',
        meta: { hire_listing_id: data.id },
      });
    }
  }

  return NextResponse.json(data, { status: 201 });
}

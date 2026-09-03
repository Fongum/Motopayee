import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser, supabaseAdmin } from '@/lib/auth/server';
import { rateLimit } from '@/lib/rate-limit';

/**
 * Who is asking, and why.
 *
 * Only `buyer_requested` was ever created, so the other two allowed by the
 * check constraint could not happen: a seller could not have their own vehicle
 * inspected before publishing it, and no inspection could be raised against a
 * financing file. Each has different rules about the listing's state and who
 * may ask, which is why the route branches rather than just widening an enum.
 */
const REQUEST_TYPES = ['buyer_requested', 'seller_package', 'finance_check'] as const;
type RequestType = (typeof REQUEST_TYPES)[number];

const createSchema = z.object({
  listing_id: z.string().uuid(),
  request_type: z.enum(REQUEST_TYPES).default('buyer_requested'),
  requester_name: z.string().trim().min(2).max(120),
  requester_phone: z.string().trim().min(6).max(40),
  requester_email: z.string().trim().email().max(160).optional().or(z.literal('')),
  preferred_window: z.string().trim().max(160).optional().or(z.literal('')),
  notes: z.string().trim().max(1000).optional().or(z.literal('')),
});

function clientKey(request: Request, userId?: string) {
  if (userId) return `inspection-request:${userId}`;
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return `inspection-request:${forwarded || 'anonymous'}`;
}

export async function POST(request: Request) {
  const user = await getCurrentUser().catch(() => null);

  const rl = rateLimit(clientKey(request, user?.id), 5, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Trop de demandes. Reessayez dans un instant.' }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid inspection request.' }, { status: 400 });
  }

  const { data: listing } = await supabaseAdmin
    .from('listings')
    .select('id, status, seller_id, vehicle:vehicles(make, model, year, condition_grade)')
    .eq('id', parsed.data.listing_id)
    .maybeSingle();

  if (!listing) {
    return NextResponse.json({ error: 'Listing not available.' }, { status: 404 });
  }

  const requestType: RequestType = parsed.data.request_type;

  // A buyer can only ask about a vehicle that is actually on sale. A seller
  // asking for their own pre-listing inspection is the case the published-only
  // gate used to make impossible.
  if (requestType === 'buyer_requested' && listing.status !== 'published') {
    return NextResponse.json({ error: 'Listing not available.' }, { status: 404 });
  }

  if (requestType === 'seller_package') {
    if (!user || listing.seller_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the seller can request an inspection for their own listing.' },
        { status: 403 }
      );
    }
    if (['sold', 'withdrawn'].includes(listing.status)) {
      return NextResponse.json({ error: 'This listing is no longer active.' }, { status: 400 });
    }
  }

  // A finance check is raised by staff against a file they are assessing, not
  // by the public, so it does not go through the anonymous path at all.
  if (requestType === 'finance_check') {
    if (!user || !['admin', 'verifier', 'inspector'].includes(user.role)) {
      return NextResponse.json({ error: 'Staff only.' }, { status: 403 });
    }
  }

  const { data, error } = await supabaseAdmin
    .from('inspection_requests')
    .insert({
      listing_id: parsed.data.listing_id,
      requester_id: user?.id ?? null,
      requester_name: parsed.data.requester_name,
      requester_phone: parsed.data.requester_phone,
      requester_email: parsed.data.requester_email || null,
      preferred_window: parsed.data.preferred_window || null,
      notes: parsed.data.notes || null,
      request_type: requestType,
      status: 'submitted',
      fee_xaf: 15000,
    })
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to submit inspection request.' }, { status: 500 });
  }

  if (user) {
    await supabaseAdmin.from('audit_logs').insert({
      actor_id: user.id,
      actor_email: user.email,
      actor_role: user.role,
      action: 'create',
      entity_type: 'inspection_request',
      entity_id: data.id,
      meta: {
        listing_id: parsed.data.listing_id,
        vehicle: listing.vehicle,
      },
    });
  }

  return NextResponse.json({ inspection_request: data }, { status: 201 });
}

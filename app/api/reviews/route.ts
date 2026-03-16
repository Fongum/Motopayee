import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/auth/server';
import { requireAuth } from '@/lib/auth/middleware';

// GET /api/reviews?reviewed_id=X or ?entity_type=Y&entity_id=Z
export async function GET(request: Request) {
  const url = new URL(request.url);
  const reviewedId = url.searchParams.get('reviewed_id');
  const entityType = url.searchParams.get('entity_type');
  const entityId = url.searchParams.get('entity_id');

  let query = supabaseAdmin
    .from('reviews')
    .select('*, reviewer:profiles!reviewer_id(full_name), response:review_responses(comment, created_at, responder:profiles!responder_id(full_name))')
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  if (reviewedId) {
    query = query.eq('reviewed_id', reviewedId);
  } else if (entityType && entityId) {
    query = query.eq('entity_type', entityType).eq('entity_id', entityId);
  } else {
    return NextResponse.json({ error: 'reviewed_id or entity_type+entity_id required.' }, { status: 400 });
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Flatten the response array (single response per review)
  const reviews = (data ?? []).map((r: Record<string, unknown>) => ({
    ...r,
    response: Array.isArray(r.response) && r.response.length > 0 ? r.response[0] : null,
  }));

  return NextResponse.json(reviews);
}

// POST /api/reviews — create a review
export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json();
  const { entity_type, entity_id, reviewed_id, rating, title, comment } = body;

  if (!entity_type || !entity_id || !reviewed_id || !rating) {
    return NextResponse.json({ error: 'entity_type, entity_id, reviewed_id, and rating are required.' }, { status: 400 });
  }
  if (rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Rating must be 1-5.' }, { status: 400 });
  }
  if (auth.user.id === reviewed_id) {
    return NextResponse.json({ error: 'Vous ne pouvez pas vous noter vous-même.' }, { status: 400 });
  }

  // Validate transaction completion based on entity type
  if (entity_type === 'hire_booking') {
    const { data: booking } = await supabaseAdmin
      .from('hire_bookings')
      .select('status, renter_id')
      .eq('id', entity_id)
      .single();
    if (!booking || booking.status !== 'completed') {
      return NextResponse.json({ error: 'La réservation doit être terminée pour laisser un avis.' }, { status: 400 });
    }
    if (booking.renter_id !== auth.user.id) {
      return NextResponse.json({ error: 'Seul le locataire peut laisser un avis.' }, { status: 403 });
    }
  }

  const { data, error } = await supabaseAdmin
    .from('reviews')
    .insert({
      reviewer_id: auth.user.id,
      reviewed_id,
      entity_type,
      entity_id,
      rating,
      title: title ?? null,
      comment: comment ?? null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Vous avez déjà laissé un avis.' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Recompute profile rating
  await supabaseAdmin.rpc('recompute_profile_rating', { p_profile_id: reviewed_id });

  return NextResponse.json(data, { status: 201 });
}

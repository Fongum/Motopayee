import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/middleware';

// GET /api/admin/reviews — list all reviews (admin moderation)
export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get('status');

  let query = supabaseAdmin
    .from('reviews')
    .select('*, reviewer:profiles!reviewer_id(full_name, email), reviewed:profiles!reviewed_id(full_name, email)')
    .order('created_at', { ascending: false })
    .limit(100);

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

// PATCH /api/admin/reviews — moderate a review (hide/flag)
export async function PATCH(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json();
  const { review_id, status } = body;

  if (!review_id || !['published', 'hidden', 'flagged'].includes(status)) {
    return NextResponse.json({ error: 'review_id and valid status required.' }, { status: 400 });
  }

  const { data: review } = await supabaseAdmin
    .from('reviews')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', review_id)
    .select('reviewed_id')
    .single();

  if (!review) {
    return NextResponse.json({ error: 'Review not found.' }, { status: 404 });
  }

  // Recompute rating after moderation
  await supabaseAdmin.rpc('recompute_profile_rating', { p_profile_id: review.reviewed_id });

  return NextResponse.json({ success: true });
}

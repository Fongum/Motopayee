import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';
import { notifyListingPublished } from '@/lib/notifications';

interface RouteParams { params: { id: string } }

const VALID_TRANSITIONS: Record<string, string[]> = {
  ownership_submitted: ['ownership_verified'],
  ownership_verified: ['inspection_scheduled'],
  inspection_scheduled: ['media_done', 'inspected'],
  media_done: ['inspection_scheduled', 'inspected'],
  inspected: ['pricing_review', 'published'],
  pricing_review: ['published'],
};

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireAdmin(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let targetStatus: string = 'published';

  // Support form submission (status in body) or default to publish
  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const body = await request.json().catch(() => ({}));
    if (body.status) targetStatus = body.status;
  } else if (contentType.includes('application/x-www-form-urlencoded')) {
    const text = await request.text();
    const params2 = new URLSearchParams(text);
    const s = params2.get('status');
    if (s) targetStatus = s;
  }

  const { data: listing } = await supabaseAdmin
    .from('listings')
    .select('id, status, seller_id, vehicle_id')
    .eq('id', params.id)
    .single();

  if (!listing) {
    return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
  }

  const allowed = VALID_TRANSITIONS[listing.status] ?? [];
  if (!allowed.includes(targetStatus)) {
    return NextResponse.json(
      { error: `Cannot transition from ${listing.status} to ${targetStatus}.` },
      { status: 400 }
    );
  }

  const updates: Record<string, unknown> = { status: targetStatus };
  if (targetStatus === 'published') updates.published_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('listings')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to update listing status.' }, { status: 500 });
  }

  await supabaseAdmin.from('audit_logs').insert({
    actor_id: auth.user.id,
    actor_email: auth.user.email,
    actor_role: auth.user.role,
    action: `listing_status_${targetStatus}`,
    entity_type: 'listings',
    entity_id: params.id,
    meta: { from: listing.status, to: targetStatus },
  });

  // SMS notification to seller when published (fire-and-forget)
  if (targetStatus === 'published') {
    void (async () => {
      const l = listing as { seller_id: string; vehicle_id: string };
      const [sellerRes, vehicleRes] = await Promise.all([
        supabaseAdmin.from('profiles').select('phone').eq('id', l.seller_id).single(),
        supabaseAdmin.from('vehicles').select('make, model').eq('id', l.vehicle_id).single(),
      ]);
      notifyListingPublished(
        sellerRes.data?.phone ?? null,
        vehicleRes.data?.make ?? '',
        vehicleRes.data?.model ?? ''
      ).catch(console.error);
    })();
  }

  if (request.headers.get('accept')?.includes('text/html')) {
    return NextResponse.redirect(new URL(`/admin/listings/${params.id}`, request.url));
  }

  return NextResponse.json({ listing: data });
}

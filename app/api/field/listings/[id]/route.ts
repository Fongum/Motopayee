import { NextResponse } from 'next/server';
import { requireFieldAgent } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';

interface RouteParams { params: { id: string } }

/**
 * GET /api/field/listings/[id] — the vehicle a field agent is uploading for.
 *
 * The upload page fetched `/api/admin/listings-basic/[id]`, which does not
 * exist and never has. Its `r.ok ? r.json() : null` turned the 404 into null
 * and the catch swallowed the rest, so the "Annonce: {make} · Zone {zone}"
 * header simply never rendered: an agent uploading photos had nothing on
 * screen telling them which vehicle they were uploading against.
 *
 * The admin route it named would not have worked either — that one requires
 * admin, and a field agent is not one.
 *
 * Same guard as the media upload beside it: assigned agent, or admin.
 */
export async function GET(request: Request, { params }: RouteParams) {
  const auth = await requireFieldAgent(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data: listing } = await supabaseAdmin
    .from('listings')
    .select('id, status, zone, city, field_agent_id, vehicle:vehicles(make, model, year)')
    .eq('id', params.id)
    .single();

  if (!listing) {
    return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
  }

  if (auth.user.role !== 'admin' && listing.field_agent_id !== auth.user.id) {
    return NextResponse.json({ error: 'Not assigned to this listing.' }, { status: 403 });
  }

  // field_agent_id is the authorisation check above, not something the page
  // shows, so it is not echoed back. Built explicitly rather than destructured
  // away: an unused `_`-prefixed binding fails the lint rule that `next build`
  // enforces.
  return NextResponse.json({
    listing: {
      id: listing.id,
      status: listing.status,
      zone: listing.zone,
      city: listing.city,
      vehicle: listing.vehicle,
    },
  });
}

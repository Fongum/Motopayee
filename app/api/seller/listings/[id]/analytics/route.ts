import { NextResponse } from 'next/server';
import { requireSeller } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';
import { getListingAnalytics } from '@/lib/listing-analytics.server';

interface RouteParams { params: { id: string } }

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await requireSeller(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // Verify seller owns this listing
  const { data: listing } = await supabaseAdmin
    .from('listings')
    .select('id, seller_id')
    .eq('id', params.id)
    .single();

  if (!listing || (listing as { seller_id: string }).seller_id !== auth.user.id) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }

  return NextResponse.json(await getListingAnalytics(params.id));
}

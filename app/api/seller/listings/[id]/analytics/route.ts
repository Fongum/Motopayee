import { NextResponse } from 'next/server';
import { requireSeller } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';
import { getListingAnalytics } from '@/lib/listing-analytics.server';

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(request: Request, props: RouteParams) {
  const params = await props.params;
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

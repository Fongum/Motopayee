import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/auth/server';
import { reportError } from '@/lib/error-reporting';
import {
  LISTING_CARD_SELECT,
  applyListingSearch,
  listingRange,
  parseListingSearch,
} from '@/lib/listing-query';
import type { ListingQuery, RawSearchParams } from '@/lib/listing-query';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw: RawSearchParams = Object.fromEntries(searchParams.entries());
  const params = parseListingSearch(raw);
  const [from, to] = listingRange(params.page);

  const query = supabaseAdmin
    .from('listings')
    .select(LISTING_CARD_SELECT, { count: 'exact' })
    .eq('status', 'published');

  // Shared with the /listings page so the two surfaces cannot drift apart:
  // same filters, same sort, same primary-photo-only media embed.
  const shaped = applyListingSearch(
    query as unknown as ListingQuery,
    params,
    { mediaLimit: 1 }
  ) as unknown as typeof query;

  const { data, error, count } = await shaped.range(from, to);

  if (error) {
    reportError(error, { source: 'api/listings', route: '/api/listings' });
    return NextResponse.json({ error: 'Failed to fetch listings.' }, { status: 500 });
  }

  return NextResponse.json({ listings: data ?? [], total: count ?? 0 });
}

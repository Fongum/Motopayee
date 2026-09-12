import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/auth/server';
import { requireAuth } from '@/lib/auth/middleware';
import { shapeListingMedia } from '@/lib/listing-query';
import type { ListingQuery } from '@/lib/listing-query';
import { shapeHireMedia } from '@/lib/hire-query';
import type { HireQuery } from '@/lib/hire-query';

// GET /api/recommendations — personalized vehicle recommendations
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) return NextResponse.json({ error: auth.error }, { status: auth.status });

  // Get user's browsing history to extract preferences
  const { data: history } = await supabaseAdmin
    .from('browsing_history')
    .select('entity_type, entity_id')
    .eq('user_id', auth.user.id)
    .order('viewed_at', { ascending: false })
    .limit(20);

  const viewedListingIds = (history ?? [])
    .filter((h: Record<string, unknown>) => h.entity_type === 'listing')
    .map((h: Record<string, unknown>) => h.entity_id as string);

  const viewedHireIds = (history ?? [])
    .filter((h: Record<string, unknown>) => h.entity_type === 'hire_listing')
    .map((h: Record<string, unknown>) => h.entity_id as string);

  // Get makes/models from viewed listings to find similar
  let preferredMakes: string[] = [];
  if (viewedListingIds.length > 0) {
    const { data: viewedVehicles } = await supabaseAdmin
      .from('listings')
      .select('vehicle:vehicles(make)')
      .in('id', viewedListingIds);

    preferredMakes = Array.from(
      new Set(
        (viewedVehicles ?? [])
          .map((v: Record<string, unknown>) => {
            const vehicle = v.vehicle as unknown as { make: string } | null;
            return vehicle?.make;
          })
          .filter(Boolean) as string[]
      )
    );
  }

  // Get user's favourites for collaborative filtering signal
  const { data: favs } = await supabaseAdmin
    .from('favourites')
    .select('listing_id')
    .eq('user_id', auth.user.id);

  const favListingIds = (favs ?? []).map((f: Record<string, unknown>) => f.listing_id as string);
  const excludeIds = Array.from(new Set([...viewedListingIds, ...favListingIds]));

  // Recommend listings with similar makes, excluding already viewed/favourited
  const baseQuery = supabaseAdmin
    .from('listings')
    .select('id, asking_price, zone, price_band, vehicle:vehicles(make, model, year, mileage_km, fuel_type), media:media_assets(id)')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(10);

  // The carousel takes media[0] as its thumbnail, so the embed needs ordering
  // and has to exclude videos, which share the table.
  const query = shapeListingMedia(
    baseQuery as unknown as ListingQuery,
    { mediaLimit: 1 }
  ) as unknown as typeof baseQuery;

  if (preferredMakes.length > 0) {
    // Fetch by preferred makes first
    const byMakeQuery = supabaseAdmin
      .from('listings')
      .select('id, asking_price, zone, price_band, vehicle:vehicles!inner(make, model, year, mileage_km, fuel_type), media:media_assets(id)')
      .eq('status', 'published')
      .in('vehicle.make', preferredMakes)
      .order('created_at', { ascending: false })
      .limit(10);

    const { data: byMake } = await (shapeListingMedia(
      byMakeQuery as unknown as ListingQuery,
      { mediaLimit: 1 }
    ) as unknown as typeof byMakeQuery);

    const filtered = (byMake ?? []).filter(
      (l: Record<string, unknown>) => !excludeIds.includes(l.id as string)
    );

    if (filtered.length >= 4) {
      return NextResponse.json({ listings: filtered, hire_listings: [] });
    }
  }

  // Fallback: just return latest excluding viewed
  const { data: listings } = await query;
  const filteredListings = (listings ?? []).filter(
    (l: Record<string, unknown>) => !excludeIds.includes(l.id as string)
  );

  // Recommend hire listings
  let hireRecommendations: Record<string, unknown>[] = [];
  if (viewedHireIds.length > 0) {
    const hiresQuery = supabaseAdmin
      .from('hire_listings')
      .select('*, owner:profiles!owner_id(full_name, is_verified), media:hire_listing_media(id, storage_path, bucket, display_order)')
      .eq('status', 'published')
      .eq('availability', 'available')
      .order('created_at', { ascending: false })
      .limit(6);

    const { data: hires } = await (shapeHireMedia(
      hiresQuery as unknown as HireQuery
    ) as unknown as typeof hiresQuery);

    hireRecommendations = (hires ?? []).filter(
      (h: Record<string, unknown>) => !viewedHireIds.includes(h.id as string)
    );
  }

  return NextResponse.json({
    listings: filteredListings.slice(0, 8),
    hire_listings: hireRecommendations.slice(0, 4),
  });
}

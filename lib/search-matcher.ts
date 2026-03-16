// Shared search query builder — deduplicates filter logic between listing/hire search pages and cron alerts

import { supabaseAdmin } from '@/lib/auth/server';

export interface ListingFilters {
  make?: string;
  zone?: string;
  min_price?: string;
  max_price?: string;
  min_year?: string;
  max_year?: string;
  max_mileage?: string;
  fuel_type?: string;
  condition_grade?: string;
  financeable?: string;
  sort?: string;
}

export interface HireFilters {
  city?: string;
  make?: string;
  zone?: string;
  hire_type?: string;
  max_price?: string;
  fuel_type?: string;
  sort?: string;
}

/** Build and execute a listing search query. Returns { data, count }. */
export async function matchListings(filters: ListingFilters, limit = 50) {
  let query = supabaseAdmin
    .from('listings')
    .select('id, asking_price, zone, city, vehicle:vehicles(make, model, year, mileage_km, fuel_type)', { count: 'exact' })
    .eq('status', 'published');

  if (filters.make) query = query.eq('vehicle.make', filters.make);
  if (filters.zone) query = query.eq('zone', filters.zone);
  if (filters.min_price) query = query.gte('asking_price', Number(filters.min_price));
  if (filters.max_price) query = query.lte('asking_price', Number(filters.max_price));
  if (filters.financeable === 'true') query = query.eq('financeable', true);

  const { data, count } = await query.limit(limit);
  // Post-filter by vehicle fields (Supabase can't filter nested joins inline easily)
  let results = (data ?? []) as unknown as Array<{
    id: string; asking_price: number; zone: string; city: string | null;
    vehicle: { make: string; model: string; year: number; mileage_km: number; fuel_type: string } | null;
  }>;

  if (filters.min_year) results = results.filter((r) => r.vehicle && r.vehicle.year >= Number(filters.min_year));
  if (filters.max_year) results = results.filter((r) => r.vehicle && r.vehicle.year <= Number(filters.max_year));
  if (filters.max_mileage) results = results.filter((r) => r.vehicle && r.vehicle.mileage_km <= Number(filters.max_mileage));
  if (filters.fuel_type) results = results.filter((r) => r.vehicle && r.vehicle.fuel_type === filters.fuel_type);

  return { data: results, count: count ?? results.length };
}

/** Build and execute a hire listing search query. Returns { data, count }. */
export async function matchHireListings(filters: HireFilters, limit = 50) {
  let query = supabaseAdmin
    .from('hire_listings')
    .select('id, make, model, year, daily_rate, city, zone', { count: 'exact' })
    .eq('status', 'published');

  if (filters.city) query = query.ilike('city', `%${filters.city}%`);
  if (filters.make) query = query.ilike('make', `%${filters.make}%`);
  if (filters.zone) query = query.eq('zone', filters.zone);
  if (filters.hire_type) query = query.eq('hire_type', filters.hire_type);
  if (filters.max_price) query = query.lte('daily_rate', Number(filters.max_price));
  if (filters.fuel_type) query = query.eq('fuel_type', filters.fuel_type);

  const { data, count } = await query.limit(limit);
  return { data: data ?? [], count: count ?? (data ?? []).length };
}

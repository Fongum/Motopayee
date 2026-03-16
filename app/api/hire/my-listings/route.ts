import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/auth/server';
import { requireAuth } from '@/lib/auth/middleware';
import type { HireListing } from '@/lib/types';

// GET /api/hire/my-listings — Get current user's hire listings
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data, error } = await supabaseAdmin
    .from('hire_listings')
    .select('*, media:hire_listing_media(*)')
    .eq('owner_id', auth.user.id)
    .neq('status', 'withdrawn')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data as unknown as HireListing[]);
}

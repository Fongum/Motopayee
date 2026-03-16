import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/middleware';
import type { HireListing } from '@/lib/types';

// GET /api/admin/hire — List all hire listings (admin)
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = request.nextUrl;
  const status = searchParams.get('status');

  let q = supabaseAdmin
    .from('hire_listings')
    .select('*, owner:profiles!owner_id(full_name, email, phone, is_verified), media:hire_listing_media(id, storage_path, bucket, display_order)', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (status) q = q.eq('status', status);

  const { data, count, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ listings: data as unknown as HireListing[], total: count ?? 0 });
}

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/auth/server';

interface RouteParams {
  params: { id: string };
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { data, error } = await supabaseAdmin
    .from('listings')
    .select(
      `
      *,
      vehicle:vehicles(*),
      media:media_assets(id, storage_path, bucket, display_order, asset_type, caption)
      `
    )
    .eq('id', params.id)
    .eq('status', 'published')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
  }

  return NextResponse.json({ listing: data });
}

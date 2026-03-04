import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/auth/server';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { data: asset } = await supabaseAdmin
    .from('media_assets')
    .select('storage_path, bucket')
    .eq('id', params.id)
    .single();

  if (!asset) return new NextResponse(null, { status: 404 });

  const { data: signed } = await supabaseAdmin.storage
    .from(asset.bucket)
    .createSignedUrl(asset.storage_path, 3600);

  if (!signed?.signedUrl) return new NextResponse(null, { status: 404 });

  return NextResponse.redirect(signed.signedUrl, {
    status: 302,
    headers: {
      'Cache-Control': 'public, max-age=3500, stale-while-revalidate=300',
    },
  });
}

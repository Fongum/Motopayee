import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/auth/server';
import { PUBLIC_MEDIA_BUCKET } from '@/lib/storage-buckets';

/**
 * Public listing thumbnail. Deliberately unauthenticated — these images are
 * shown on the public marketplace — but narrowly so:
 *
 * `media_assets.bucket` is a free-text column, so this handler must not sign
 * whatever it happens to contain. Signing an arbitrary bucket would turn a
 * public image endpoint into a reader for private ownership and ID documents
 * for anyone holding an asset id. Only the public media bucket is served.
 */
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

  if (asset.bucket !== PUBLIC_MEDIA_BUCKET) {
    // Not "forbidden": a private asset should not be distinguishable from a
    // missing one through this endpoint.
    return new NextResponse(null, { status: 404 });
  }

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

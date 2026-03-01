import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';
import { isStaffRole } from '@/lib/auth/roles';
import { z } from 'zod';

// GET /api/files/signed-url?doc=<doc_id> — staff or document owner
export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const docId = searchParams.get('doc');

  if (!docId) {
    return NextResponse.json({ error: 'doc parameter required.' }, { status: 400 });
  }

  const { data: doc, error } = await supabaseAdmin
    .from('documents')
    .select('id, storage_path, bucket, uploader_id, entity_type, entity_id')
    .eq('id', docId)
    .single();

  if (error || !doc) {
    return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
  }

  // Staff can access all documents; others can only access their own uploads
  const canAccess =
    isStaffRole(auth.user.role) ||
    doc.uploader_id === auth.user.id;

  if (!canAccess) {
    return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
  }

  const { data: signedData, error: signError } = await supabaseAdmin
    .storage
    .from(doc.bucket)
    .createSignedUrl(doc.storage_path, 300); // 5-minute URL

  if (signError || !signedData) {
    return NextResponse.json({ error: 'Failed to generate signed URL.' }, { status: 500 });
  }

  // Redirect to the signed URL for direct download
  return NextResponse.redirect(signedData.signedUrl);
}

// POST /api/files/signed-url — body { bucket, path }
const postSchema = z.object({
  bucket: z.enum(['listing-media', 'documents-private']),
  path: z.string().min(1),
});

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!isStaffRole(auth.user.role)) {
    return NextResponse.json({ error: 'Staff access required.' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'bucket and path required.' }, { status: 400 });
  }

  const { data: signedData, error } = await supabaseAdmin
    .storage
    .from(parsed.data.bucket)
    .createSignedUrl(parsed.data.path, 300);

  if (error || !signedData) {
    return NextResponse.json({ error: 'Failed to generate signed URL.' }, { status: 500 });
  }

  return NextResponse.json({ signedUrl: signedData.signedUrl });
}

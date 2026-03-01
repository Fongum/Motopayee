import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';
import { z } from 'zod';
import { randomUUID } from 'crypto';

const schema = z.object({
  bucket: z.enum(['listing-media', 'documents-private']),
  filename: z.string().min(1),
  contentType: z.string().min(1),
});

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'bucket, filename, and contentType required.' }, { status: 400 });
  }

  const { bucket, filename } = parsed.data;

  // Build storage path: {user_id}/{uuid}-{filename}
  const ext = filename.split('.').pop() ?? '';
  const storagePath = `${auth.user.id}/${randomUUID()}.${ext}`;

  const { data, error } = await supabaseAdmin
    .storage
    .from(bucket)
    .createSignedUploadUrl(storagePath);

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to generate upload URL.' }, { status: 500 });
  }

  return NextResponse.json({
    signedUrl: data.signedUrl,
    path: storagePath,
    token: data.token,
  });
}

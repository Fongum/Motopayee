import { NextResponse } from 'next/server';
import { requireSeller } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';
import { z } from 'zod';

interface RouteParams { params: { id: string } }

const schema = z.object({
  doc_type: z.enum(['ownership_title', 'id_national', 'id_passport', 'other']).default('ownership_title'),
  storage_path: z.string().min(1),
  bucket: z.string().default('documents-private'),
  filename: z.string().min(1),
  content_type: z.string().min(1),
  file_size_bytes: z.number().optional(),
});

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireSeller(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data: listing } = await supabaseAdmin
    .from('listings')
    .select('id, seller_id, status')
    .eq('id', params.id)
    .single();

  if (!listing || listing.seller_id !== auth.user.id) {
    return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid document metadata.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('documents')
    .insert({
      entity_type: 'listing',
      entity_id: params.id,
      uploader_id: auth.user.id,
      ...parsed.data,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to save document.' }, { status: 500 });
  }

  return NextResponse.json({ document: data }, { status: 201 });
}

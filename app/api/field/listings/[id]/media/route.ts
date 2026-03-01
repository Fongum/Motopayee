import { NextResponse } from 'next/server';
import { requireFieldAgent } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';
import { z } from 'zod';

interface RouteParams { params: { id: string } }

const schema = z.object({
  storage_path: z.string().min(1),
  bucket: z.string().default('listing-media'),
  asset_type: z.enum(['photo', 'video']).default('photo'),
  caption: z.string().optional(),
  display_order: z.number().int().min(0).default(0),
  mark_done: z.boolean().default(false),
});

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireFieldAgent(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // Check listing exists and is assigned to this field agent (or admin)
  const { data: listing } = await supabaseAdmin
    .from('listings')
    .select('id, status, field_agent_id')
    .eq('id', params.id)
    .single();

  if (!listing) {
    return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
  }

  if (auth.user.role !== 'admin' && listing.field_agent_id !== auth.user.id) {
    return NextResponse.json({ error: 'Not assigned to this listing.' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid media metadata.' }, { status: 400 });
  }

  const { mark_done, ...mediaData } = parsed.data;

  const { data: media, error } = await supabaseAdmin
    .from('media_assets')
    .insert({
      listing_id: params.id,
      uploaded_by: auth.user.id,
      ...mediaData,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to save media.' }, { status: 500 });
  }

  // Optionally mark listing as media_done
  if (mark_done && listing.status === 'ownership_verified') {
    await supabaseAdmin
      .from('listings')
      .update({ status: 'media_done' })
      .eq('id', params.id);

    await supabaseAdmin.from('audit_logs').insert({
      actor_id: auth.user.id,
      actor_email: auth.user.email,
      actor_role: auth.user.role,
      action: 'listing_media_done',
      entity_type: 'listings',
      entity_id: params.id,
      meta: { from: 'ownership_verified', to: 'media_done' },
    });
  }

  return NextResponse.json({ media }, { status: 201 });
}

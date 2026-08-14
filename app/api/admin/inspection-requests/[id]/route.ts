import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireStaff } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';

const STATUSES = ['submitted', 'contacted', 'quoted', 'paid', 'scheduled', 'completed', 'cancelled'] as const;

const patchSchema = z.object({
  status: z.enum(STATUSES),
  inspector_id: z.string().uuid().optional(),
  note: z.string().trim().max(500).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireStaff(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid inspection request update.' }, { status: 400 });
  }

  const { data: existing } = await supabaseAdmin
    .from('inspection_requests')
    .select('id, status, notes, listing_id, listing:listings(id, status)')
    .eq('id', params.id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: 'Inspection request not found.' }, { status: 404 });
  }

  const nextNotes = parsed.data.note
    ? [existing.notes, `[${new Date().toISOString()}] ${auth.user.email}: ${parsed.data.note}`].filter(Boolean).join('\n')
    : existing.notes;

  let assignedInspector: { id: string; email: string | null; full_name: string | null } | null = null;
  if (parsed.data.inspector_id) {
    const { data: inspector } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, role, status')
      .eq('id', parsed.data.inspector_id)
      .maybeSingle();

    if (!inspector || inspector.role !== 'inspector' || inspector.status !== 'active') {
      return NextResponse.json({ error: 'Inspector not found or inactive.' }, { status: 400 });
    }

    assignedInspector = inspector;
  }

  const { data, error } = await supabaseAdmin
    .from('inspection_requests')
    .update({
      status: parsed.data.status,
      notes: nextNotes,
    })
    .eq('id', params.id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to update inspection request.' }, { status: 500 });
  }

  if (assignedInspector) {
    const listing = Array.isArray(existing.listing) ? existing.listing[0] : existing.listing;
    const listingUpdates: Record<string, unknown> = {
      inspector_id: assignedInspector.id,
    };

    if (parsed.data.status === 'scheduled' && ['ownership_verified', 'media_done'].includes(listing?.status ?? '')) {
      listingUpdates.status = 'inspection_scheduled';
    }

    await supabaseAdmin
      .from('listings')
      .update(listingUpdates)
      .eq('id', existing.listing_id);
  }

  await supabaseAdmin.from('audit_logs').insert({
    actor_id: auth.user.id,
    actor_email: auth.user.email,
    actor_role: auth.user.role,
    action: 'inspection_request_status_change',
    entity_type: 'inspection_request',
    entity_id: params.id,
    meta: {
      listing_id: existing.listing_id,
      previous_status: existing.status,
      new_status: parsed.data.status,
      inspector_id: assignedInspector?.id ?? null,
      note: parsed.data.note ?? null,
    },
  });

  return NextResponse.json({ inspection_request: data });
}

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/middleware';

// PATCH /api/admin/hire/[id] — Admin update hire listing status
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.status) {
    const validStatuses = ['draft', 'pending_review', 'published', 'suspended', 'withdrawn'];
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    updates.status = body.status;
    if (body.status === 'published') {
      updates.published_at = new Date().toISOString();
    }
  }

  if (body.availability) {
    updates.availability = body.availability;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('hire_listings')
    .update(updates)
    .eq('id', params.id)
    .select('*, owner:profiles!owner_id(full_name, email)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Audit log
  await supabaseAdmin.from('audit_logs').insert({
    actor_id: auth.user.id,
    actor_email: auth.user.email,
    actor_role: auth.user.role,
    action: 'hire_listing_status_change',
    entity_type: 'hire_listing',
    entity_id: params.id,
    meta: { new_status: body.status, new_availability: body.availability },
  });

  return NextResponse.json(data);
}

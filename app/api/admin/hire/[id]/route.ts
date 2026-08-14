import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { parseBody } from '@/lib/validation';

// Both enums mirror the hire_listings check constraints (migration 010).
// `availability` was previously written through unchecked.
const patchSchema = z
  .object({
    status: z.enum(['draft', 'pending_review', 'published', 'suspended', 'withdrawn']).optional(),
    availability: z.enum(['available', 'hired_out', 'maintenance', 'unavailable']).optional(),
  })
  .refine((v) => v.status !== undefined || v.availability !== undefined, {
    message: 'Nothing to update',
  });

// PATCH /api/admin/hire/[id] — Admin update hire listing status
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const parsed = await parseBody(patchSchema, request, 'Mise à jour invalide.');
  if (!parsed.success) return parsed.response;

  const { status, availability } = parsed.data;
  const updates: Record<string, unknown> = {};

  if (status) {
    updates.status = status;
    if (status === 'published') {
      updates.published_at = new Date().toISOString();
    }
  }

  if (availability) {
    updates.availability = availability;
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
    meta: { new_status: status, new_availability: availability },
  });

  return NextResponse.json(data);
}

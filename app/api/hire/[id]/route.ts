import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, supabaseAdmin } from '@/lib/auth/server';
import { requireAuth } from '@/lib/auth/middleware';
import { parseBody } from '@/lib/validation';
import { updateHireListingSchema } from '@/lib/hire-schemas';
import type { HireListing } from '@/lib/types';
import { isStaffRole } from '@/lib/auth/roles';

/** Stored on a hire listing but never displayed to the public. */
const HIRE_PRIVATE_COLUMNS = ['plate_number', 'latitude', 'longitude'] as const;

// GET /api/hire/[id] — Get hire listing detail (public for published)
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { data, error } = await supabaseAdmin
    .from('hire_listings')
    .select('*, owner:profiles!owner_id(id, full_name, phone, is_verified, city), media:hire_listing_media(*)')
    .eq('id', params.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // The owner and staff see the whole row in any status. This branch used to
  // say "check if requester is owner or admin" and then return the row to
  // anyone — drafts, listings under review and suspended ones included.
  const user = await getCurrentUser().catch(() => null);
  if (user && (user.id === data.owner_id || isStaffRole(user.role))) {
    return NextResponse.json(data as unknown as HireListing);
  }

  if (data.status !== 'published') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Everyone else: what /hire/[id] displays. The plate number and the owner's
  // exact coordinates are never shown publicly, so they are not served either.
  const publicListing: Record<string, unknown> = { ...data };
  for (const key of HIRE_PRIVATE_COLUMNS) delete publicListing[key];
  return NextResponse.json(publicListing as unknown as HireListing);
}

// PATCH /api/hire/[id] — Update own hire listing
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // Verify ownership
  const { data: existing } = await supabaseAdmin
    .from('hire_listings')
    .select('owner_id, status')
    .eq('id', params.id)
    .single();

  if (!existing || existing.owner_id !== auth.user.id) {
    return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
  }

  // Only allow edits on draft/pending_review/published
  if (['withdrawn', 'suspended'].includes(existing.status)) {
    return NextResponse.json({ error: 'Cannot edit in current status' }, { status: 400 });
  }

  // The schema is the field allowlist: unknown keys are stripped by zod, so
  // status/owner_id can't be smuggled in through a PATCH.
  const parsed = await parseBody(updateHireListingSchema, request, 'Mise à jour invalide.');
  if (!parsed.success) return parsed.response;

  const updates = parsed.data;

  const { data, error } = await supabaseAdmin
    .from('hire_listings')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE /api/hire/[id] — Withdraw own hire listing
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data: existing } = await supabaseAdmin
    .from('hire_listings')
    .select('owner_id')
    .eq('id', params.id)
    .single();

  if (!existing || existing.owner_id !== auth.user.id) {
    return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
  }

  const { error } = await supabaseAdmin
    .from('hire_listings')
    .update({ status: 'withdrawn' })
    .eq('id', params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

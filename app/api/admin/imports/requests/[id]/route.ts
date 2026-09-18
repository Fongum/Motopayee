import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';
import { reportError } from '@/lib/error-reporting';

interface RouteParams { params: { id: string } }

/**
 * POST /api/admin/imports/requests/[id] — move a request through triage.
 *
 * The admin list offers a "Reviewing" filter chip, but nothing could set that
 * status, so the tab was always empty. It sits between `submitted` (nobody has
 * looked) and `quoted` (a quote went out), and without it a team cannot tell an
 * untouched request from one somebody is already sourcing.
 *
 * Only the triage steps live here. `quoted` is set by the quote route when a
 * quote is actually sent, and `accepted` by the buyer accepting one — a status
 * that means "a thing happened" should be set by the thing happening, not by a
 * button that claims it did.
 */
const ALLOWED: Record<string, string[]> = {
  submitted: ['reviewing', 'cancelled'],
  reviewing: ['submitted', 'cancelled'],
  quoted: ['cancelled'],
};

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireStaff(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let target = '';
  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const body = await request.json().catch(() => null);
    target = typeof body?.status === 'string' ? body.status : '';
  } else {
    const form = await request.formData().catch(() => null);
    target = String(form?.get('status') ?? '');
  }

  const { data: existing } = await supabaseAdmin
    .from('import_requests')
    .select('id, status')
    .eq('id', params.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: 'Import request not found.' }, { status: 404 });
  }

  const allowed = ALLOWED[existing.status] ?? [];
  if (!allowed.includes(target)) {
    return NextResponse.json(
      { error: `Cannot move a request from ${existing.status} to ${target || 'nothing'}.` },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin
    .from('import_requests')
    .update({ status: target })
    .eq('id', params.id);

  if (error) {
    reportError(error, { source: 'api/admin/imports/requests', route: '/api/admin/imports/requests/[id]' });
    return NextResponse.json({ error: 'Failed to update the request.' }, { status: 500 });
  }

  await supabaseAdmin.from('audit_logs').insert({
    actor_id: auth.user.id,
    actor_email: auth.user.email,
    actor_role: auth.user.role,
    action: 'import_request_status_changed',
    entity_type: 'import_requests',
    entity_id: params.id,
    meta: { from: existing.status, to: target },
  });

  return NextResponse.redirect(new URL(`/admin/imports/requests/${params.id}`, request.url), 303);
}

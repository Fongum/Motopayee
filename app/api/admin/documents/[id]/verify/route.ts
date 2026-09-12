import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';
import { reportError } from '@/lib/error-reporting';

interface RouteParams { params: { id: string } }

/**
 * POST /api/admin/documents/[id]/verify — record that staff reviewed a document.
 *
 * `documents.verified`, `verified_by` and `verified_at` have existed since
 * migration 003 and nothing ever wrote them. docs/trust-verification-policy.md
 * defines a "Documents Checked" label meaning "MotoPayee has reviewed available
 * ownership or vehicle documents", and the launch dashboard specification lists
 * it among the trust labels — but with no way to record a review, the label
 * could never be shown honestly, so it was never shown at all.
 *
 * This records the review. It does not assert anything beyond what the policy
 * says the label means: documents were looked at, not that legal transfer is
 * complete or that no hidden claim exists.
 */
export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireStaff(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data: doc } = await supabaseAdmin
    .from('documents')
    .select('id, entity_type, entity_id, verified')
    .eq('id', params.id)
    .single();

  if (!doc) {
    return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
  }

  // Reading the current value first makes this idempotent and lets the audit
  // log record a real transition rather than a repeated claim.
  const alreadyVerified = doc.verified === true;

  const { error } = await supabaseAdmin
    .from('documents')
    .update({
      verified: true,
      verified_by: auth.user.id,
      verified_at: new Date().toISOString(),
    })
    .eq('id', params.id);

  if (error) {
    reportError(error, { source: 'api/admin/documents/verify', route: '/api/admin/documents/[id]/verify' });
    return NextResponse.json({ error: 'Failed to record the review.' }, { status: 500 });
  }

  if (!alreadyVerified) {
    await supabaseAdmin.from('audit_logs').insert({
      actor_id: auth.user.id,
      actor_email: auth.user.email,
      actor_role: auth.user.role,
      action: 'document_verified',
      entity_type: 'documents',
      entity_id: params.id,
      meta: { of_entity_type: doc.entity_type, of_entity_id: doc.entity_id },
    });
  }

  const back = doc.entity_type === 'listing'
    ? `/admin/listings/${doc.entity_id}`
    : `/admin/applications/${doc.entity_id}`;
  return NextResponse.redirect(new URL(back, request.url), 303);
}

import { z } from 'zod';
import { supabaseAdmin } from '@/lib/auth/server';
import { notifyDisbursed } from '@/lib/notifications';
import { updateImportPaymentStatus } from '@/lib/import-payments';
import { checkMomoPayment } from '@/lib/mobilemoney';
import { logFailure } from '@/lib/logger';

const STATUS_MAP: Record<string, 'successful' | 'failed' | 'cancelled'> = {
  SUCCESSFUL: 'successful',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
};

// Webhooks should ack with 200 even when we take no action, so the provider
// doesn't pointlessly retry.
const ack = () => new Response('OK', { status: 200 });

/**
 * MTN MoMo callback when a RequestToPay status changes.
 *
 * SECURITY: the callback body is NOT trusted. A POST can come from anyone, so
 * we treat the webhook only as a hint to re-poll, then read the authoritative
 * status from MTN via checkMomoPayment() before mutating anything. This makes a
 * forged "SUCCESSFUL" payload harmless. An optional shared secret
 * (MTN_WEBHOOK_SECRET) adds a first gate when configured.
 */
export async function POST(request: Request) {
  // Optional shared-secret gate (header or ?secret= on the callback URL).
  const secret = process.env.MTN_WEBHOOK_SECRET;
  if (secret) {
    const provided =
      request.headers.get('x-webhook-secret') ??
      new URL(request.url).searchParams.get('secret');
    if (provided !== secret) return new Response('Unauthorized', { status: 401 });
  }

  // Only the reference id is read; every other field is ignored by design.
  // It must be a UUID because it is looked up against uuid primary keys — a
  // malformed value would otherwise reach Postgres and raise 22P02.
  const body = await request.json().catch(() => undefined);
  const parsed = z.object({ referenceId: z.string().uuid() }).safeParse(body);
  if (!parsed.success) return ack();

  const { referenceId } = parsed.data;

  // Authoritative status — ignore body.status entirely.
  const live = await checkMomoPayment(referenceId);
  if (!live.status || live.status === 'PENDING') return ack(); // unknown / still in progress
  const newStatus = STATUS_MAP[live.status];
  if (!newStatus) return ack();

  const metaUpdate = live.financialTransactionId
    ? { financialTransactionId: live.financialTransactionId }
    : {};

  // Standard (financing) payment first.
  const { data: existing } = await supabaseAdmin
    .from('payments')
    .select('status, buyer_id, inspection_request_id, payment_type')
    .eq('id', referenceId)
    .maybeSingle();

  if (existing) {
    const wasSuccessful = (existing as { status: string }).status === 'successful';
    await supabaseAdmin
      .from('payments')
      .update({
        status: newStatus,
        completed_at: newStatus === 'successful' ? new Date().toISOString() : null,
        meta: metaUpdate,
      })
      .eq('id', referenceId);

    // Notify only on the pending → successful transition (webhooks can repeat).
    if (newStatus === 'successful' && !wasSuccessful) {
      const payment = existing as { buyer_id: string | null; inspection_request_id: string | null; payment_type: string };
      if (payment.payment_type === 'inspection_fee' && payment.inspection_request_id) {
        await supabaseAdmin
          .from('inspection_requests')
          .update({ status: 'paid' })
          .eq('id', payment.inspection_request_id)
          .in('status', ['submitted', 'contacted', 'quoted']);
      } else if (payment.buyer_id) {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('phone')
          .eq('id', payment.buyer_id)
          .single();
        if (profile) {
          notifyDisbursed((profile as { phone: string | null }).phone).catch(
            logFailure('Disbursement SMS failed', { referenceId })
          );
        }
      }
    }
    return ack();
  }

  // Otherwise it's an import payment (idempotent: order transition is guarded).
  await updateImportPaymentStatus(referenceId, newStatus, metaUpdate);
  return ack();
}

import { supabaseAdmin } from '@/lib/auth/server';
import { notifyDisbursed } from '@/lib/notifications';
import { updateImportPaymentStatus } from '@/lib/import-payments';

const STATUS_MAP: Record<string, string> = {
  SUCCESSFUL: 'successful',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
};

/** MTN MoMo calls this URL when RequestToPay status changes */
export async function POST(request: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return new Response('OK', { status: 200 });
  }

  const referenceId = body.referenceId as string | undefined;
  const momoStatus  = body.status as string | undefined;

  if (!referenceId || !momoStatus) return new Response('OK', { status: 200 });

  const newStatus = STATUS_MAP[momoStatus];
  if (!newStatus) return new Response('OK', { status: 200 });

  const { data: standardPayment } = await supabaseAdmin.from('payments').update({
    status: newStatus,
    completed_at: newStatus === 'successful' ? new Date().toISOString() : null,
    meta: body.financialTransactionId
      ? { financialTransactionId: body.financialTransactionId }
      : {},
  }).eq('id', referenceId).select('buyer_id, amount').maybeSingle();

  if (!standardPayment) {
    await updateImportPaymentStatus(
      referenceId,
      newStatus as 'successful' | 'failed' | 'cancelled',
      body.financialTransactionId ? { financialTransactionId: body.financialTransactionId } : {}
    );
    return new Response('OK', { status: 200 });
  }

  // On success, notify buyer
  if (newStatus === 'successful') {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('phone')
      .eq('id', standardPayment.buyer_id)
      .single();

    if (profile) {
      notifyDisbursed((profile as { phone: string | null }).phone).catch(console.error);
    }
  }

  return new Response('OK', { status: 200 });
}

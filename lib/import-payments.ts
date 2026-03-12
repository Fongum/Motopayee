import { supabaseAdmin } from '@/lib/auth/server';

export async function updateImportPaymentStatus(
  paymentId: string,
  status: 'pending' | 'processing' | 'successful' | 'failed' | 'cancelled',
  meta: Record<string, unknown> = {}
) {
  const { data: payment } = await supabaseAdmin
    .from('import_payments')
    .update({
      status,
      completed_at: status === 'successful' ? new Date().toISOString() : null,
      meta,
    })
    .eq('id', paymentId)
    .select('id, order_id, payment_type, buyer_id, amount')
    .maybeSingle();

  if (!payment) {
    return null;
  }

  if (status === 'successful' && payment.payment_type === 'reservation_deposit') {
    await supabaseAdmin
      .from('import_orders')
      .update({ status: 'deposit_paid' })
      .eq('id', payment.order_id)
      .in('status', ['deposit_pending', 'quote_sent']);
  }

  return payment as {
    id: string;
    order_id: string;
    payment_type: string;
    buyer_id: string;
    amount: number;
  };
}

import { supabaseAdmin } from '@/lib/auth/server';
import { notifyDisbursed } from '@/lib/notifications';

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

  await supabaseAdmin.from('payments').update({
    status: newStatus,
    completed_at: newStatus === 'successful' ? new Date().toISOString() : null,
    meta: body.financialTransactionId
      ? { financialTransactionId: body.financialTransactionId }
      : {},
  }).eq('id', referenceId);

  // On success, notify buyer
  if (newStatus === 'successful') {
    const { data: payment } = await supabaseAdmin
      .from('payments')
      .select('buyer_id, amount')
      .eq('id', referenceId)
      .single();

    if (payment) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('phone')
        .eq('id', (payment as { buyer_id: string }).buyer_id)
        .single();

      if (profile) {
        notifyDisbursed((profile as { phone: string | null }).phone).catch(console.error);
      }
    }
  }

  return new Response('OK', { status: 200 });
}

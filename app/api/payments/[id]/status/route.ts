import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';
import { checkMomoPayment } from '@/lib/mobilemoney';

interface RouteParams { params: { id: string } }

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data: payment } = await supabaseAdmin
    .from('payments')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!payment) {
    return NextResponse.json({ error: 'Payment not found.' }, { status: 404 });
  }

  const p = payment as { id: string; provider: string; status: string; completed_at: string | null };

  // For pending MTN payments, poll live status
  if (p.provider === 'mtn_momo' && p.status === 'pending') {
    const live = await checkMomoPayment(params.id);
    const mapped: Record<string, string> = {
      SUCCESSFUL: 'successful',
      FAILED: 'failed',
      CANCELLED: 'cancelled',
    };
    if (live.status && live.status !== 'PENDING') {
      const newStatus = mapped[live.status] ?? p.status;
      await supabaseAdmin.from('payments').update({
        status: newStatus,
        completed_at: newStatus === 'successful' ? new Date().toISOString() : null,
        meta: live.financialTransactionId ? { financialTransactionId: live.financialTransactionId } : {},
      }).eq('id', params.id);
      return NextResponse.json({ ...payment, status: newStatus });
    }
  }

  return NextResponse.json(payment);
}

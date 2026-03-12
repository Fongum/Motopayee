import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';
import { isAdminRole } from '@/lib/auth/roles';
import { checkMomoPayment } from '@/lib/mobilemoney';
import { updateImportPaymentStatus } from '@/lib/import-payments';

interface RouteParams {
  params: { id: string };
}

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data: payment } = await supabaseAdmin
    .from('import_payments')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!payment) {
    return NextResponse.json({ error: 'Import payment not found.' }, { status: 404 });
  }

  if (payment.buyer_id !== auth.user.id && !isAdminRole(auth.user.role)) {
    return NextResponse.json({ error: 'Not allowed to view this payment.' }, { status: 403 });
  }

  if (payment.provider === 'mtn_momo' && payment.status === 'pending') {
    const live = await checkMomoPayment(params.id);
    const mapped: Record<string, 'successful' | 'failed' | 'cancelled'> = {
      SUCCESSFUL: 'successful',
      FAILED: 'failed',
      CANCELLED: 'cancelled',
    };

    if (live.status && live.status !== 'PENDING') {
      const newStatus = mapped[live.status];
      if (newStatus) {
        await updateImportPaymentStatus(
          params.id,
          newStatus,
          live.financialTransactionId ? { financialTransactionId: live.financialTransactionId } : {}
        );
      }

      const { data: refreshed } = await supabaseAdmin
        .from('import_payments')
        .select('*')
        .eq('id', params.id)
        .single();

      return NextResponse.json(refreshed);
    }
  }

  return NextResponse.json(payment);
}

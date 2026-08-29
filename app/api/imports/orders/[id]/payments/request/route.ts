import { NextResponse } from 'next/server';
import { reportError } from '@/lib/error-reporting';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { requireBuyer } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';
import { requestMomoPayment, requestOrangePayment } from '@/lib/mobilemoney';
import { updateImportPaymentStatus } from '@/lib/import-payments';
import { parseBody, phoneSchema } from '@/lib/validation';

interface RouteParams {
  params: { id: string };
}

// The deposit amount is read from the order, never from the client.
const depositSchema = z.object({
  phone: phoneSchema,
  provider: z.enum(['mtn_momo', 'orange_money']),
});

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireBuyer(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const parsed = await parseBody(depositSchema, request, 'Demande de dépôt invalide.');
  if (!parsed.success) return parsed.response;

  const { phone, provider } = parsed.data;

  const { data: order } = await supabaseAdmin
    .from('import_orders')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!order || order.buyer_id !== auth.user.id) {
    return NextResponse.json({ error: 'Import order not found.' }, { status: 404 });
  }

  if (!['deposit_pending', 'quote_sent'].includes(order.status)) {
    return NextResponse.json({ error: 'Reservation deposit is not available for this order status.' }, { status: 400 });
  }

  const amount = Math.round(Number(order.reservation_deposit_amount ?? 0));
  if (amount <= 0) {
    return NextResponse.json({ error: 'This order does not have a deposit amount configured.' }, { status: 400 });
  }

  const { data: existing } = await supabaseAdmin
    .from('import_payments')
    .select('id, status')
    .eq('order_id', params.id)
    .eq('payment_type', 'reservation_deposit')
    .in('status', ['pending', 'processing', 'successful'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    if (existing.status === 'successful') {
      return NextResponse.json({ error: 'Reservation deposit already paid.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'A reservation deposit payment is already in progress.' }, { status: 409 });
  }

  const paymentId = randomUUID();
  const { data: payment, error } = await supabaseAdmin
    .from('import_payments')
    .insert({
      id: paymentId,
      order_id: params.id,
      buyer_id: auth.user.id,
      amount,
      provider,
      phone,
      payment_type: 'reservation_deposit',
      status: 'pending',
    })
    .select('*')
    .single();

  if (error || !payment) {
    // 23505 = unique violation from the partial index (migration 014): a
    // concurrent request already created an in-flight deposit. Don't double-charge.
    if ((error as { code?: string } | null)?.code === '23505') {
      return NextResponse.json({ error: 'A reservation deposit payment is already in progress.' }, { status: 409 });
    }
    reportError('Failed to create import payment record.', { source: 'api/imports/payments/request', cause: error });
    return NextResponse.json({ error: 'Failed to create import payment record.' }, { status: 500 });
  }

  let meta: Record<string, unknown> = {};
  let newStatus: 'pending' | 'processing' = 'pending';

  if (provider === 'mtn_momo') {
    const result = await requestMomoPayment(
      paymentId,
      amount,
      phone,
      'Reservation deposit MotoPayee import'
    );

    if (!result.ok) {
      await updateImportPaymentStatus(paymentId, 'failed', { error: result.error ?? 'Unknown MTN error' });
      return NextResponse.json({ error: result.error }, { status: 502 });
    }

    meta = { provider_initiated: true };
  } else {
    const result = requestOrangePayment(paymentId, amount, phone);
    meta = { reference: result.reference, instructions: result.instructions };
    newStatus = 'processing';
  }

  await supabaseAdmin.from('import_payments').update({ meta, status: newStatus }).eq('id', paymentId);

  return NextResponse.json({ payment: { ...payment, meta, status: newStatus } });
}

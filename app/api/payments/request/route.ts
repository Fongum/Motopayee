import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireVerifier } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';
import { requestMomoPayment, requestOrangePayment } from '@/lib/mobilemoney';
import { parseBody, phoneSchema, amountXaf } from '@/lib/validation';
import { randomUUID } from 'crypto';

// payment_type values must stay in sync with the payments_payment_type_check
// constraint (migration 016). `inspection_fee` is set by the inspection flow
// itself, not by a verifier raising a financing payment, so it is excluded here.
const requestSchema = z.object({
  application_id: z.string().uuid(),
  phone: phoneSchema,
  amount: amountXaf,
  provider: z.enum(['mtn_momo', 'orange_money', 'cash', 'bank_transfer']),
  payment_type: z.enum(['down_payment', 'monthly', 'fee']).default('down_payment'),
});

export async function POST(request: Request) {
  const auth = await requireVerifier(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const parsed = await parseBody(requestSchema, request, 'Demande de paiement invalide.');
  if (!parsed.success) return parsed.response;

  const { application_id, phone, amount, provider, payment_type: paymentType } = parsed.data;

  // Application must be approved
  const { data: app } = await supabaseAdmin
    .from('financing_applications')
    .select('id, status, buyer_id')
    .eq('id', application_id)
    .single();

  if (!app || (app as { status: string }).status !== 'approved') {
    return NextResponse.json({ error: 'Application not found or not in approved status.' }, { status: 400 });
  }

  // Idempotency guard: never fire a second prompt while one is in flight (or,
  // for one-time payments, when one already succeeded). The partial unique
  // index added in migration 014 is the race-proof backstop behind this.
  const { data: existing } = await supabaseAdmin
    .from('payments')
    .select('id, status')
    .eq('application_id', application_id)
    .eq('payment_type', paymentType)
    .in('status', ['pending', 'processing', 'successful'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    const oneTime = paymentType === 'down_payment' || paymentType === 'fee';
    if (existing.status === 'successful' && oneTime) {
      return NextResponse.json({ error: 'This payment has already been completed.' }, { status: 409 });
    }
    if (existing.status === 'pending' || existing.status === 'processing') {
      return NextResponse.json({ error: 'A payment is already in progress for this application.' }, { status: 409 });
    }
  }

  const referenceId = randomUUID();
  const amountInt = amount;

  // Create payment record (pending)
  const { data: payment, error: dbErr } = await supabaseAdmin
    .from('payments')
    .insert({
      id: referenceId,
      application_id,
      buyer_id: (app as { buyer_id: string }).buyer_id,
      amount: amountInt,
      payment_type: paymentType,
      provider,
      phone,
      status: 'pending',
    })
    .select()
    .single();

  if (dbErr) {
    // 23505 = unique violation from the partial index: a concurrent request won
    // the race and is already in flight. Treat as "in progress", not a 500.
    if ((dbErr as { code?: string }).code === '23505') {
      return NextResponse.json({ error: 'A payment is already in progress for this application.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create payment record.' }, { status: 500 });
  }

  // Trigger provider
  let meta: Record<string, unknown> = {};
  let newStatus = 'pending';

  if (provider === 'mtn_momo') {
    const result = await requestMomoPayment(
      referenceId,
      amountInt,
      phone,
      'Apport financement MotoPayee'
    );
    if (!result.ok) {
      await supabaseAdmin.from('payments').update({ status: 'failed', meta: { error: result.error } }).eq('id', referenceId);
      return NextResponse.json({ error: result.error }, { status: 502 });
    }
    meta = { provider_initiated: true };

  } else if (provider === 'orange_money') {
    const result = requestOrangePayment(referenceId, amountInt, phone);
    meta = { reference: result.reference, instructions: result.instructions };
    newStatus = 'processing';
  }

  await supabaseAdmin.from('payments').update({ meta, status: newStatus }).eq('id', referenceId);

  return NextResponse.json({ payment: { ...payment, meta, status: newStatus } });
}

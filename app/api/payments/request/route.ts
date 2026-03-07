import { NextResponse } from 'next/server';
import { requireVerifier } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';
import { requestMomoPayment, requestOrangePayment } from '@/lib/mobilemoney';
import { randomUUID } from 'crypto';

export async function POST(request: Request) {
  const auth = await requireVerifier(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => ({}));
  const { application_id, phone, amount, provider } = body as Record<string, string | number>;

  if (!application_id || !phone || !amount || !provider) {
    return NextResponse.json({ error: 'application_id, phone, amount, provider are required.' }, { status: 400 });
  }

  // Application must be approved
  const { data: app } = await supabaseAdmin
    .from('financing_applications')
    .select('id, status, buyer_id')
    .eq('id', application_id)
    .single();

  if (!app || (app as { status: string }).status !== 'approved') {
    return NextResponse.json({ error: 'Application not found or not in approved status.' }, { status: 400 });
  }

  const referenceId = randomUUID();
  const amountInt = Math.round(Number(amount));

  // Create payment record (pending)
  const { data: payment, error: dbErr } = await supabaseAdmin
    .from('payments')
    .insert({
      id: referenceId,
      application_id,
      buyer_id: (app as { buyer_id: string }).buyer_id,
      amount: amountInt,
      provider,
      phone: String(phone),
      status: 'pending',
    })
    .select()
    .single();

  if (dbErr) {
    return NextResponse.json({ error: 'Failed to create payment record.' }, { status: 500 });
  }

  // Trigger provider
  let meta: Record<string, unknown> = {};
  let newStatus = 'pending';

  if (provider === 'mtn_momo') {
    const result = await requestMomoPayment(
      referenceId,
      amountInt,
      String(phone),
      'Apport financement MotoPayee'
    );
    if (!result.ok) {
      await supabaseAdmin.from('payments').update({ status: 'failed', meta: { error: result.error } }).eq('id', referenceId);
      return NextResponse.json({ error: result.error }, { status: 502 });
    }
    meta = { provider_initiated: true };

  } else if (provider === 'orange_money') {
    const result = requestOrangePayment(referenceId, amountInt, String(phone));
    meta = { reference: result.reference, instructions: result.instructions };
    newStatus = 'processing';
  }

  await supabaseAdmin.from('payments').update({ meta, status: newStatus }).eq('id', referenceId);

  return NextResponse.json({ payment: { ...payment, meta, status: newStatus } });
}

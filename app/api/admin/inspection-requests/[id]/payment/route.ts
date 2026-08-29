import { NextRequest, NextResponse } from 'next/server';
import { reportError } from '@/lib/error-reporting';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { requireStaff } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';
import { requestMomoPayment, requestOrangePayment } from '@/lib/mobilemoney';

const schema = z.object({
  provider: z.enum(['mtn_momo', 'orange_money', 'cash', 'bank_transfer']),
  phone: z.string().trim().min(3).max(40),
  amount: z.number().int().positive().max(5_000_000),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireStaff(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payment request.' }, { status: 400 });
  }

  const { data: inspectionRequest } = await supabaseAdmin
    .from('inspection_requests')
    .select('id, requester_id, requester_phone, status, fee_xaf, listing_id')
    .eq('id', params.id)
    .maybeSingle();

  if (!inspectionRequest) {
    return NextResponse.json({ error: 'Inspection request not found.' }, { status: 404 });
  }

  if (['completed', 'cancelled'].includes(inspectionRequest.status as string)) {
    return NextResponse.json({ error: 'This inspection request is already closed.' }, { status: 409 });
  }

  const { data: existing } = await supabaseAdmin
    .from('payments')
    .select('id, status')
    .eq('inspection_request_id', params.id)
    .eq('payment_type', 'inspection_fee')
    .in('status', ['pending', 'processing', 'successful'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    if (existing.status === 'successful') {
      return NextResponse.json({ error: 'This inspection fee has already been paid.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'A payment is already in progress for this inspection request.' }, { status: 409 });
  }

  const referenceId = randomUUID();
  const amount = parsed.data.amount;
  const immediateSuccess = parsed.data.provider === 'cash' || parsed.data.provider === 'bank_transfer';
  const initialStatus = immediateSuccess ? 'successful' : 'pending';
  const completedAt = immediateSuccess ? new Date().toISOString() : null;
  const baseMeta = {
    created_by: auth.user.email,
    listing_id: inspectionRequest.listing_id,
  };

  const { data: payment, error: dbError } = await supabaseAdmin
    .from('payments')
    .insert({
      id: referenceId,
      application_id: null,
      inspection_request_id: params.id,
      buyer_id: inspectionRequest.requester_id ?? null,
      amount,
      payment_type: 'inspection_fee',
      provider: parsed.data.provider,
      phone: parsed.data.phone || inspectionRequest.requester_phone,
      status: initialStatus,
      completed_at: completedAt,
      meta: baseMeta,
    })
    .select()
    .single();

  if (dbError || !payment) {
    if ((dbError as { code?: string } | null)?.code === '23505') {
      return NextResponse.json({ error: 'A payment is already in progress for this inspection request.' }, { status: 409 });
    }
    reportError('Failed to create payment record.', { source: 'api/admin/inspection-requests/payment', cause: dbError });
    return NextResponse.json({ error: 'Failed to create payment record.' }, { status: 500 });
  }

  let meta: Record<string, unknown> = baseMeta;
  let status = initialStatus;

  if (parsed.data.provider === 'mtn_momo') {
    const result = await requestMomoPayment(referenceId, amount, parsed.data.phone, 'Inspection MotoPayee');
    if (!result.ok) {
      await supabaseAdmin.from('payments').update({ status: 'failed', meta: { ...meta, error: result.error } }).eq('id', referenceId);
      return NextResponse.json({ error: result.error }, { status: 502 });
    }
    meta = { ...meta, provider_initiated: true };
  } else if (parsed.data.provider === 'orange_money') {
    const result = requestOrangePayment(referenceId, amount, parsed.data.phone);
    meta = { ...meta, reference: result.reference, instructions: result.instructions };
    status = 'processing';
  }

  await supabaseAdmin.from('payments').update({ meta, status }).eq('id', referenceId);

  if (immediateSuccess) {
    await supabaseAdmin
      .from('inspection_requests')
      .update({ status: 'paid' })
      .eq('id', params.id);
  }

  await supabaseAdmin.from('audit_logs').insert({
    actor_id: auth.user.id,
    actor_email: auth.user.email,
    actor_role: auth.user.role,
    action: 'inspection_payment_requested',
    entity_type: 'inspection_request',
    entity_id: params.id,
    meta: {
      payment_id: referenceId,
      amount,
      provider: parsed.data.provider,
      status,
    },
  });

  return NextResponse.json({ payment: { ...payment, meta, status } }, { status: 201 });
}

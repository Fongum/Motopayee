import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireBuyer } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';

const acceptSchema = z.object({
  quote_id: z.string().uuid(),
  clearing_mode: z.enum(['self_clear', 'broker_assist']).default('self_clear'),
  destination_port: z.string().trim().max(120).optional().nullable(),
  destination_city: z.string().trim().max(120).optional().nullable(),
  acknowledge_terms: z.boolean().refine((value) => value === true),
});

export async function POST(request: Request) {
  const auth = await requireBuyer(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = acceptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid acceptance payload.' }, { status: 400 });
  }

  const { data: quote } = await supabaseAdmin
    .from('import_quotes')
    .select('*')
    .eq('id', parsed.data.quote_id)
    .single();

  if (!quote) {
    return NextResponse.json({ error: 'Quote not found.' }, { status: 404 });
  }

  const { data: importRequest } = await supabaseAdmin
    .from('import_requests')
    .select('id, buyer_id, status')
    .eq('id', quote.request_id)
    .single();

  if (!importRequest || importRequest.buyer_id !== auth.user.id) {
    return NextResponse.json({ error: 'Quote not available to this buyer.' }, { status: 403 });
  }

  if (quote.status !== 'sent') {
    return NextResponse.json({ error: 'Only active sent quotes can be accepted.' }, { status: 400 });
  }

  if (new Date(quote.expires_at) <= new Date()) {
    await supabaseAdmin.from('import_quotes').update({ status: 'expired' }).eq('id', quote.id);
    return NextResponse.json({ error: 'This quote has expired.' }, { status: 400 });
  }

  if (Number(quote.reservation_deposit_amount ?? 0) <= 0) {
    return NextResponse.json({ error: 'This quote is missing a reservation deposit amount.' }, { status: 400 });
  }

  const { data: existingOrder } = await supabaseAdmin
    .from('import_orders')
    .select('*')
    .eq('request_id', quote.request_id)
    .maybeSingle();

  if (existingOrder) {
    return NextResponse.json({ order: existingOrder, already_exists: true });
  }

  const reservationDepositAmount = Number(quote.reservation_deposit_amount);
  const totalEstimatedXaf = Number(quote.total_estimated_xaf);
  const purchaseAmountDue = Math.max(0, totalEstimatedXaf - reservationDepositAmount);

  const { data: order, error } = await supabaseAdmin
    .from('import_orders')
    .insert({
      buyer_id: auth.user.id,
      request_id: quote.request_id,
      accepted_quote_id: quote.id,
      partner_name: quote.partner_name,
      status: 'deposit_pending',
      clearing_mode: parsed.data.clearing_mode,
      destination_port: parsed.data.destination_port || null,
      destination_city: parsed.data.destination_city || null,
      reservation_deposit_amount: reservationDepositAmount,
      purchase_amount_due: purchaseAmountDue,
      final_amount_due: purchaseAmountDue,
      currency: 'XAF',
      fx_rate_locked: quote.fx_rate_to_xaf ?? null,
      buyer_acknowledged_terms: true,
    })
    .select('*')
    .single();

  if (error || !order) {
    return NextResponse.json({ error: 'Failed to create import order.' }, { status: 500 });
  }

  await Promise.all([
    supabaseAdmin.from('import_quotes').update({ status: 'accepted' }).eq('id', quote.id),
    supabaseAdmin
      .from('import_quotes')
      .update({ status: 'superseded' })
      .eq('request_id', quote.request_id)
      .eq('status', 'sent')
      .neq('id', quote.id),
    supabaseAdmin.from('import_requests').update({ status: 'accepted' }).eq('id', quote.request_id),
    supabaseAdmin.from('audit_logs').insert({
      actor_id: auth.user.id,
      actor_email: auth.user.email,
      actor_role: auth.user.role,
      action: 'import_quote_accepted',
      entity_type: 'import_orders',
      entity_id: order.id,
      meta: {
        request_id: quote.request_id,
        quote_id: quote.id,
        clearing_mode: parsed.data.clearing_mode,
        reservation_deposit_amount: reservationDepositAmount,
      },
    }),
  ]);

  return NextResponse.json({ order }, { status: 201 });
}

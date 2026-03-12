import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';

const createSchema = z.object({
  request_id: z.string().uuid(),
  partner_name: z.string().trim().min(2).max(120),
  currency: z.string().trim().min(3).max(8).default('XAF'),
  fx_rate_to_xaf: z.number().positive().optional().nullable(),
  vehicle_price: z.number().min(0),
  auction_fee: z.number().min(0),
  inland_transport_fee: z.number().min(0),
  shipping_fee: z.number().min(0),
  insurance_fee: z.number().min(0),
  documentation_fee: z.number().min(0),
  motopayee_fee: z.number().min(0),
  estimated_customs_fee: z.number().min(0),
  estimated_port_fee: z.number().min(0),
  reservation_deposit_amount: z.number().min(0),
  quote_terms: z.string().trim().max(5000).optional().nullable(),
  expires_at: z.string().datetime(),
});

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid quote data.' }, { status: 400 });
  }

  const expiresAt = new Date(parsed.data.expires_at);
  if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
    return NextResponse.json({ error: 'Quote expiry must be in the future.' }, { status: 400 });
  }

  const { data: requestRow } = await supabaseAdmin
    .from('import_requests')
    .select('id, status, buyer_id, make, model')
    .eq('id', parsed.data.request_id)
    .single();

  if (!requestRow) {
    return NextResponse.json({ error: 'Import request not found.' }, { status: 404 });
  }

  if (['accepted', 'cancelled', 'expired'].includes(requestRow.status)) {
    return NextResponse.json({ error: 'This import request cannot receive a new quote.' }, { status: 400 });
  }

  const { data: latestQuote } = await supabaseAdmin
    .from('import_quotes')
    .select('quote_version')
    .eq('request_id', parsed.data.request_id)
    .order('quote_version', { ascending: false })
    .limit(1)
    .maybeSingle();

  const quoteVersion = Number(latestQuote?.quote_version ?? 0) + 1;
  const totalEstimatedXaf = [
    parsed.data.vehicle_price,
    parsed.data.auction_fee,
    parsed.data.inland_transport_fee,
    parsed.data.shipping_fee,
    parsed.data.insurance_fee,
    parsed.data.documentation_fee,
    parsed.data.motopayee_fee,
    parsed.data.estimated_customs_fee,
    parsed.data.estimated_port_fee,
  ].reduce((sum, value) => sum + value, 0);

  const insertPayload = {
    request_id: parsed.data.request_id,
    partner_name: parsed.data.partner_name,
    currency: parsed.data.currency,
    fx_rate_to_xaf: parsed.data.fx_rate_to_xaf ?? null,
    vehicle_price: parsed.data.vehicle_price,
    auction_fee: parsed.data.auction_fee,
    inland_transport_fee: parsed.data.inland_transport_fee,
    shipping_fee: parsed.data.shipping_fee,
    insurance_fee: parsed.data.insurance_fee,
    documentation_fee: parsed.data.documentation_fee,
    motopayee_fee: parsed.data.motopayee_fee,
    estimated_customs_fee: parsed.data.estimated_customs_fee,
    estimated_port_fee: parsed.data.estimated_port_fee,
    total_estimated_xaf: totalEstimatedXaf,
    reservation_deposit_amount: parsed.data.reservation_deposit_amount,
    quote_terms: parsed.data.quote_terms || null,
    expires_at: expiresAt.toISOString(),
    quote_version: quoteVersion,
    status: 'sent',
    created_by: auth.user.id,
  };

  const { data, error } = await supabaseAdmin
    .from('import_quotes')
    .insert(insertPayload)
    .select('*')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to create import quote.' }, { status: 500 });
  }

  await Promise.all([
    supabaseAdmin
      .from('import_quotes')
      .update({ status: 'superseded' })
      .eq('request_id', parsed.data.request_id)
      .eq('status', 'sent')
      .neq('id', data.id),
    supabaseAdmin
      .from('import_requests')
      .update({ status: 'quoted' })
      .eq('id', parsed.data.request_id),
    supabaseAdmin
      .from('audit_logs')
      .insert({
        actor_id: auth.user.id,
        actor_email: auth.user.email,
        actor_role: auth.user.role,
        action: 'import_quote_created',
        entity_type: 'import_quotes',
        entity_id: data.id,
        meta: {
          request_id: parsed.data.request_id,
          quote_version: quoteVersion,
          partner_name: parsed.data.partner_name,
          total_estimated_xaf: totalEstimatedXaf,
          request_make: requestRow.make,
          request_model: requestRow.model,
        },
      }),
  ]);

  return NextResponse.json({ quote: data }, { status: 201 });
}

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';

interface RouteParams {
  params: { id: string };
}

const schema = z.object({
  status: z.enum([
    'quote_sent',
    'deposit_pending',
    'deposit_paid',
    'purchase_authorized',
    'purchased',
    'docs_pending',
    'shipping_booked',
    'in_transit',
    'arrived_cameroon',
    'ready_for_clearing',
    'clearing_in_progress',
    'completed',
    'cancelled',
    'refund_pending',
    'refunded',
    'disputed',
  ]),
  destination_port: z.string().trim().max(120).optional().nullable(),
  destination_city: z.string().trim().max(120).optional().nullable(),
  cancellation_reason: z.string().trim().max(2000).optional().nullable(),
});

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireAdmin(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data: order } = await supabaseAdmin
    .from('import_orders')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!order) {
    return NextResponse.json({ error: 'Import order not found.' }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid order status payload.' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {
    status: parsed.data.status,
  };

  if (parsed.data.destination_port !== undefined) updates.destination_port = parsed.data.destination_port || null;
  if (parsed.data.destination_city !== undefined) updates.destination_city = parsed.data.destination_city || null;

  if (parsed.data.status === 'arrived_cameroon' && !order.arrived_at) {
    updates.arrived_at = new Date().toISOString();
  }

  if (parsed.data.status === 'completed') {
    updates.completed_at = new Date().toISOString();
  }

  if (parsed.data.status === 'cancelled') {
    updates.cancelled_at = new Date().toISOString();
    updates.cancellation_reason = parsed.data.cancellation_reason || order.cancellation_reason || null;
  } else if (parsed.data.cancellation_reason !== undefined) {
    updates.cancellation_reason = parsed.data.cancellation_reason || null;
  }

  const { data, error } = await supabaseAdmin
    .from('import_orders')
    .update(updates)
    .eq('id', params.id)
    .select('*')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to update import order.' }, { status: 500 });
  }

  await supabaseAdmin.from('audit_logs').insert({
    actor_id: auth.user.id,
    actor_email: auth.user.email,
    actor_role: auth.user.role,
    action: 'import_order_status_updated',
    entity_type: 'import_orders',
    entity_id: data.id,
    meta: {
      from: order.status,
      to: data.status,
      destination_port: data.destination_port,
      destination_city: data.destination_city,
    },
  });

  return NextResponse.json({ order: data });
}

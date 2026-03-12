import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';
import { syncOrderStatusFromShipment } from '@/lib/import-orders';

interface RouteParams {
  params: { id: string };
}

const schema = z.object({
  carrier_name: z.string().trim().min(2).max(120).optional(),
  container_type: z.string().trim().max(60).optional().nullable(),
  container_no: z.string().trim().max(120).optional().nullable(),
  booking_ref: z.string().trim().max(120).optional().nullable(),
  bill_of_lading_no: z.string().trim().max(120).optional().nullable(),
  port_of_loading: z.string().trim().max(120).optional().nullable(),
  port_of_discharge: z.string().trim().max(120).optional().nullable(),
  etd: z.string().datetime().optional().nullable(),
  eta: z.string().datetime().optional().nullable(),
  actual_departure_at: z.string().datetime().optional().nullable(),
  actual_arrival_at: z.string().datetime().optional().nullable(),
  status: z.enum(['draft', 'booked', 'departed', 'arrived', 'released', 'closed']).optional(),
  notes: z.string().trim().max(4000).optional().nullable(),
});

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireAdmin(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data: shipment } = await supabaseAdmin
    .from('import_shipments')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!shipment) {
    return NextResponse.json({ error: 'Shipment not found.' }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid shipment update.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('import_shipments')
    .update(parsed.data)
    .eq('id', params.id)
    .select('*')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to update shipment.' }, { status: 500 });
  }

  if (data.status !== shipment.status) {
    await syncOrderStatusFromShipment(data.order_id, data.status, data.actual_arrival_at);
  }

  await supabaseAdmin.from('audit_logs').insert({
    actor_id: auth.user.id,
    actor_email: auth.user.email,
    actor_role: auth.user.role,
    action: 'import_shipment_updated',
    entity_type: 'import_shipments',
    entity_id: data.id,
    meta: {
      order_id: data.order_id,
      from: shipment.status,
      to: data.status,
    },
  });

  return NextResponse.json({ shipment: data });
}

import { supabaseAdmin } from '@/lib/auth/server';

export async function syncOrderStatusFromShipment(
  orderId: string,
  // The column is text (CHECK-constrained), so the DB row types it as string;
  // a status this function does not handle simply changes nothing.
  shipmentStatus: string,
  actualArrivalAt?: string | null
) {
  if (shipmentStatus === 'booked') {
    await supabaseAdmin
      .from('import_orders')
      .update({ status: 'shipping_booked' })
      .eq('id', orderId)
      .in('status', ['deposit_paid', 'purchase_authorized', 'purchased', 'docs_pending', 'shipping_booked']);
    return;
  }

  if (shipmentStatus === 'departed') {
    await supabaseAdmin
      .from('import_orders')
      .update({ status: 'in_transit' })
      .eq('id', orderId)
      .in('status', ['deposit_paid', 'purchase_authorized', 'purchased', 'docs_pending', 'shipping_booked', 'in_transit']);
    return;
  }

  if (shipmentStatus === 'arrived') {
    await supabaseAdmin
      .from('import_orders')
      .update({
        status: 'arrived_cameroon',
        arrived_at: actualArrivalAt ?? new Date().toISOString(),
      })
      .eq('id', orderId)
      .in('status', ['shipping_booked', 'in_transit', 'arrived_cameroon']);
    return;
  }

  if (shipmentStatus === 'released' || shipmentStatus === 'closed') {
    await supabaseAdmin
      .from('import_orders')
      .update({ status: 'ready_for_clearing' })
      .eq('id', orderId)
      .in('status', ['shipping_booked', 'in_transit', 'arrived_cameroon', 'ready_for_clearing']);
  }
}

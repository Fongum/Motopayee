import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/auth/server';

// POST /api/cron/price-alerts — daily cron: check for price drops
export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get all active price alerts with their listings
  const { data: alerts } = await supabaseAdmin
    .from('price_alerts')
    .select('*, listing:listings(asking_price, previous_price, vehicle:vehicles(make, model, year)), user:profiles!user_id(phone, email)')
    .eq('active', true);

  if (!alerts || alerts.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  let notified = 0;

  for (const alert of alerts) {
    const listing = alert.listing as unknown as { asking_price: number; previous_price: number | null; vehicle: { make: string; model: string; year: number } | null };
    const user = alert.user as unknown as { phone: string | null; email: string };

    if (!listing) continue;

    // Check if price dropped below threshold
    if (listing.asking_price <= alert.threshold_price) {
      const v = listing.vehicle;
      const label = v ? `${v.year} ${v.make} ${v.model}` : 'Véhicule';
      const price = listing.asking_price.toLocaleString('fr-FR');
      console.log(`[price-alert] → ${user.phone ?? user.email}: ${label} est maintenant à ${price} XAF (seuil: ${alert.threshold_price.toLocaleString('fr-FR')} XAF)`);
      notified++;

      // Mark as notified
      await supabaseAdmin
        .from('price_alerts')
        .update({ last_notified_at: new Date().toISOString() })
        .eq('id', alert.id);
    }
  }

  return NextResponse.json({ processed: alerts.length, notified });
}

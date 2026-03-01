import { NextResponse } from 'next/server';
import { requireVerifier } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';

interface RouteParams { params: { id: string } }

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await requireVerifier(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data: app, error } = await supabaseAdmin
    .from('financing_applications')
    .select(`
      *,
      listing:listings(
        *,
        vehicle:vehicles(*),
        media:media_assets(id, asset_type, display_order, caption)
      ),
      buyer:profiles!buyer_id(id, email, full_name, phone, city, zone),
      verifier:profiles!verifier_id(id, email, full_name),
      documents(*)
    `)
    .eq('id', params.id)
    .single();

  if (error || !app) {
    return NextResponse.json({ error: 'Application not found.' }, { status: 404 });
  }

  const listing = app.listing as Record<string, unknown> | null;
  const inspection = listing
    ? await supabaseAdmin
        .from('inspections')
        .select('*')
        .eq('listing_id', listing.id as string)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
        .then((r) => r.data)
    : null;

  // MFI export packet
  const packet = {
    export_generated_at: new Date().toISOString(),
    export_version: '1.0',
    application: {
      id: app.id,
      status: app.status,
      submitted_at: app.submitted_at,
      decided_at: app.decided_at,
      income_grade: app.income_grade,
      down_payment_percent: app.down_payment_percent,
      max_tenor: app.max_tenor,
      manual_review_required: app.manual_review_required,
      notes: app.notes,
    },
    buyer: app.buyer,
    listing: listing
      ? {
          id: listing.id,
          status: listing.status,
          asking_price: listing.asking_price,
          suggested_price: listing.suggested_price,
          mve_low: listing.mve_low,
          mve_high: listing.mve_high,
          price_band: listing.price_band,
          zone: listing.zone,
          city: listing.city,
          financeable: listing.financeable,
        }
      : null,
    vehicle: listing ? (listing.vehicle as Record<string, unknown> | null) : null,
    inspection: inspection ?? null,
    documents: (app.documents ?? []).map((d: Record<string, unknown>) => ({
      id: d.id,
      doc_type: d.doc_type,
      filename: d.filename,
      content_type: d.content_type,
      file_size_bytes: d.file_size_bytes,
      verified: d.verified,
      verified_at: d.verified_at,
    })),
    processed_by: {
      verifier_id: auth.user.id,
      verifier_email: auth.user.email,
    },
  };

  await supabaseAdmin.from('audit_logs').insert({
    actor_id: auth.user.id,
    actor_email: auth.user.email,
    actor_role: auth.user.role,
    action: 'mfi_export_generated',
    entity_type: 'financing_applications',
    entity_id: params.id,
    meta: { export_version: '1.0' },
  });

  return new NextResponse(JSON.stringify(packet, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="motopayee-application-${params.id}.json"`,
    },
  });
}

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';

interface RouteParams {
  params: { id: string };
}

const schema = z.object({
  shipment_id: z.string().uuid().optional().nullable(),
  doc_type: z.enum([
    'auction_invoice',
    'bill_of_sale',
    'title',
    'partner_condition_report',
    'export_certificate',
    'insurance_certificate',
    'bill_of_lading',
    'ectn',
    'fimex_record',
    'customs_notice',
    'delivery_note',
    'other',
  ]),
  storage_path: z.string().min(1),
  bucket: z.string().default('documents-private'),
  filename: z.string().min(1),
  content_type: z.string().min(1),
  file_size_bytes: z.number().optional().nullable(),
  verified: z.boolean().optional().default(false),
});

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireAdmin(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data: order } = await supabaseAdmin
    .from('import_orders')
    .select('id')
    .eq('id', params.id)
    .single();

  if (!order) {
    return NextResponse.json({ error: 'Import order not found.' }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid import document payload.' }, { status: 400 });
  }

  if (parsed.data.shipment_id) {
    const { data: shipment } = await supabaseAdmin
      .from('import_shipments')
      .select('id')
      .eq('id', parsed.data.shipment_id)
      .eq('order_id', params.id)
      .maybeSingle();

    if (!shipment) {
      return NextResponse.json({ error: 'Shipment not found for this order.' }, { status: 400 });
    }
  }

  const { data, error } = await supabaseAdmin
    .from('import_documents')
    .insert({
      order_id: params.id,
      shipment_id: parsed.data.shipment_id ?? null,
      uploader_id: auth.user.id,
      doc_type: parsed.data.doc_type,
      storage_path: parsed.data.storage_path,
      bucket: parsed.data.bucket,
      filename: parsed.data.filename,
      content_type: parsed.data.content_type,
      file_size_bytes: parsed.data.file_size_bytes ?? null,
      verified: parsed.data.verified,
      verified_by: parsed.data.verified ? auth.user.id : null,
      verified_at: parsed.data.verified ? new Date().toISOString() : null,
    })
    .select('*')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to save import document.' }, { status: 500 });
  }

  await supabaseAdmin.from('audit_logs').insert({
    actor_id: auth.user.id,
    actor_email: auth.user.email,
    actor_role: auth.user.role,
    action: 'import_document_uploaded',
    entity_type: 'import_documents',
    entity_id: data.id,
    meta: {
      order_id: params.id,
      doc_type: data.doc_type,
      shipment_id: data.shipment_id,
    },
  });

  return NextResponse.json({ document: data }, { status: 201 });
}

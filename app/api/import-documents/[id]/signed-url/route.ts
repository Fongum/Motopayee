import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';
import { isStaffRole } from '@/lib/auth/roles';

interface RouteParams {
  params: { id: string };
}

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data: document } = await supabaseAdmin
    .from('import_documents')
    .select('id, order_id, storage_path, bucket')
    .eq('id', params.id)
    .single();

  if (!document) {
    return NextResponse.json({ error: 'Import document not found.' }, { status: 404 });
  }

  let canAccess = isStaffRole(auth.user.role);

  if (!canAccess) {
    const { data: order } = await supabaseAdmin
      .from('import_orders')
      .select('buyer_id')
      .eq('id', document.order_id)
      .maybeSingle();

    canAccess = order?.buyer_id === auth.user.id;
  }

  if (!canAccess) {
    return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
  }

  const { data: signedData, error } = await supabaseAdmin
    .storage
    .from(document.bucket)
    .createSignedUrl(document.storage_path, 300);

  if (error || !signedData) {
    return NextResponse.json({ error: 'Failed to generate signed URL.' }, { status: 500 });
  }

  return NextResponse.redirect(signedData.signedUrl);
}

import { NextResponse } from 'next/server';
import { requireInspector } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';

interface RouteParams {
  params: { id: string };
}

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await requireInspector(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data, error } = await supabaseAdmin
    .from('listings')
    .select(`
      *,
      vehicle:vehicles(*),
      seller:profiles!seller_id(id, full_name, phone),
      inspection_requests(id, status, requester_name, requester_phone, preferred_window, notes)
    `)
    .eq('id', params.id)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
  }

  const listing = data as { inspector_id: string | null };
  if (auth.user.role !== 'admin' && listing.inspector_id !== auth.user.id) {
    return NextResponse.json({ error: 'Not assigned to this listing.' }, { status: 403 });
  }

  return NextResponse.json({ listing: data });
}

import { NextResponse } from 'next/server';
import { requireInspector } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';
import { isQueryFailure } from '@/lib/query-result';
import { reportError } from '@/lib/error-reporting';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, props: RouteParams) {
  const params = await props.params;
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

  // A missing row is a 404; anything else is a failure and must not be one.
  if (isQueryFailure(error)) {
    reportError(error, { source: 'api', route: '/api/inspector/listings/[id]' });
    return NextResponse.json({ error: 'Failed to load.' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
  }

  const listing = data as { inspector_id: string | null };
  if (auth.user.role !== 'admin' && listing.inspector_id !== auth.user.id) {
    return NextResponse.json({ error: 'Not assigned to this listing.' }, { status: 403 });
  }

  return NextResponse.json({ listing: data });
}

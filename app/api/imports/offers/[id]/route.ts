import { NextResponse } from 'next/server';
import { IMPORT_OFFER_PUBLIC_COLUMNS } from '@/lib/import-offer-public';
import { supabaseAdmin } from '@/lib/auth/server';
import { isQueryFailure } from '@/lib/query-result';
import { reportError } from '@/lib/error-reporting';

interface RouteParams {
  params: { id: string };
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { data, error } = await supabaseAdmin
    .from('import_offers')
    .select(IMPORT_OFFER_PUBLIC_COLUMNS)
    .eq('id', params.id)
    .eq('status', 'active')
    .single();

  // A missing row is a 404; anything else is a failure and must not be one.
  if (isQueryFailure(error)) {
    reportError(error, { source: 'api', route: '/api/imports/offers/[id]' });
    return NextResponse.json({ error: 'Failed to load.' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Import offer not found.' }, { status: 404 });
  }

  return NextResponse.json({ offer: data });
}

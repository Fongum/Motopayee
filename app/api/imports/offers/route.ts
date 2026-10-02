import { NextResponse } from 'next/server';
import { IMPORT_OFFER_PUBLIC_COLUMNS } from '@/lib/import-offer-public';
import { supabaseAdmin } from '@/lib/auth/server';

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('import_offers')
    .select(IMPORT_OFFER_PUBLIC_COLUMNS)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch import offers.' }, { status: 500 });
  }

  return NextResponse.json({ offers: data ?? [] });
}

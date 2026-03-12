import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/auth/server';

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('import_offers')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch import offers.' }, { status: 500 });
  }

  return NextResponse.json({ offers: data ?? [] });
}

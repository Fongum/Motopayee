import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/auth/server';

interface RouteParams {
  params: { id: string };
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { data, error } = await supabaseAdmin
    .from('import_offers')
    .select('*')
    .eq('id', params.id)
    .eq('status', 'active')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Import offer not found.' }, { status: 404 });
  }

  return NextResponse.json({ offer: data });
}

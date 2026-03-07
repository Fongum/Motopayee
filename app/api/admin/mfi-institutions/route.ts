import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data, error } = await supabaseAdmin
    .from('mfi_institutions')
    .select('id, name, code, city')
    .eq('active', true)
    .order('name');

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch institutions.' }, { status: 500 });
  }

  return NextResponse.json({ institutions: data ?? [] });
}

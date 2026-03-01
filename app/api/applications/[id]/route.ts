import { NextResponse } from 'next/server';
import { requireBuyer } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';

interface RouteParams { params: { id: string } }

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await requireBuyer(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data, error } = await supabaseAdmin
    .from('financing_applications')
    .select('*, listing:listings(*, vehicle:vehicles(*)), documents(*)')
    .eq('id', params.id)
    .eq('buyer_id', auth.user.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Application not found.' }, { status: 404 });
  }

  return NextResponse.json({ application: data });
}

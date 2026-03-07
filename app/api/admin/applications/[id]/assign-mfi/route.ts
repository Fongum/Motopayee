import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';
import { z } from 'zod';

interface RouteParams { params: { id: string } }

const schema = z.object({ mfi_institution_id: z.string().uuid() });

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireAdmin(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'mfi_institution_id (UUID) is required.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('financing_applications')
    .update({ mfi_institution_id: parsed.data.mfi_institution_id })
    .eq('id', params.id)
    .select('id, mfi_institution_id')
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to assign MFI.' }, { status: 500 });
  }

  return NextResponse.json({ application: data });
}

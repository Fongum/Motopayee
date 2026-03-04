import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';

interface RouteParams { params: { id: string } }

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireAdmin(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('is_verified, role')
    .eq('id', params.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  }

  const newValue = !(profile as { is_verified: boolean }).is_verified;

  const { data } = await supabaseAdmin
    .from('profiles')
    .update({ is_verified: newValue })
    .eq('id', params.id)
    .select('is_verified')
    .single();

  await supabaseAdmin.from('audit_logs').insert({
    actor_id: auth.user.id,
    actor_email: auth.user.email,
    actor_role: auth.user.role,
    action: newValue ? 'seller_verified' : 'seller_unverified',
    entity_type: 'profiles',
    entity_id: params.id,
    meta: { is_verified: newValue },
  });

  return NextResponse.json({ is_verified: (data as { is_verified: boolean } | null)?.is_verified ?? newValue });
}

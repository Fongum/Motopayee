import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';
import { z } from 'zod';

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const role = searchParams.get('role');
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const PAGE_SIZE = 30;

  let query = supabaseAdmin
    .from('profiles')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (role) query = query.eq('role', role);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch users.' }, { status: 500 });
  }

  return NextResponse.json({ users: data ?? [], total: count ?? 0 });
}

const patchSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(['buyer', 'seller_individual', 'seller_dealer', 'field_agent', 'inspector', 'verifier', 'admin']),
});

export async function PATCH(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({ role: parsed.data.role })
    .eq('id', parsed.data.user_id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to update user role.' }, { status: 500 });
  }

  await supabaseAdmin.from('audit_logs').insert({
    actor_id: auth.user.id,
    actor_email: auth.user.email,
    actor_role: auth.user.role,
    action: 'user_role_changed',
    entity_type: 'profiles',
    entity_id: parsed.data.user_id,
    meta: { new_role: parsed.data.role },
  });

  return NextResponse.json({ user: data });
}

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';
import { z } from 'zod';

const ROLE_VALUES = ['buyer', 'seller_individual', 'seller_dealer', 'field_agent', 'inspector', 'verifier', 'admin', 'mfi_partner'] as const;

async function parseBody(request: Request): Promise<Record<string, unknown>> {
  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) return request.json().catch(() => ({}));
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const text = await request.text();
    const params = new URLSearchParams(text);
    const body: Record<string, unknown> = {};
    params.forEach((value, key) => { body[key] = value; });
    return body;
  }
  return {};
}

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
  role: z.enum(ROLE_VALUES),
  mfi_institution_id: z.string().uuid().optional().nullable(),
});

const postSchema = z.object({
  email: z.string().trim().email(),
  full_name: z.string().trim().min(2).optional(),
  phone: z.string().trim().optional(),
  city: z.string().trim().optional(),
  role: z.enum(ROLE_VALUES).default('buyer'),
  mfi_institution_id: z.string().uuid().optional().nullable(),
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

  if (parsed.data.role === 'mfi_partner' && !parsed.data.mfi_institution_id) {
    return NextResponse.json({ error: 'mfi_institution_id is required for MFI partners.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({
      role: parsed.data.role,
      mfi_institution_id: parsed.data.role === 'mfi_partner' ? parsed.data.mfi_institution_id : null,
    })
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
    meta: { new_role: parsed.data.role, mfi_institution_id: parsed.data.mfi_institution_id ?? null },
  });

  return NextResponse.json({ user: data });
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const parsed = postSchema.safeParse(await parseBody(request));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid user.' }, { status: 400 });
  }

  if (parsed.data.role === 'mfi_partner' && !parsed.data.mfi_institution_id) {
    return NextResponse.json({ error: 'mfi_institution_id is required for MFI partners.' }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const { data: existing } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  const values = {
    email,
    full_name: parsed.data.full_name || null,
    phone: parsed.data.phone || null,
    city: parsed.data.city || null,
    role: parsed.data.role,
    status: 'active',
    mfi_institution_id: parsed.data.role === 'mfi_partner' ? parsed.data.mfi_institution_id : null,
  };

  const result = existing
    ? await supabaseAdmin
        .from('profiles')
        .update(values)
        .eq('id', existing.id)
        .select()
        .single()
    : await supabaseAdmin
        .from('profiles')
        .insert(values)
        .select()
        .single();

  if (result.error || !result.data) {
    return NextResponse.json({ error: 'Failed to save user.' }, { status: 500 });
  }

  await supabaseAdmin.from('audit_logs').insert({
    actor_id: auth.user.id,
    actor_email: auth.user.email,
    actor_role: auth.user.role,
    action: existing ? 'user_profile_linked' : 'user_profile_created',
    entity_type: 'profiles',
    entity_id: result.data.id,
    meta: { role: parsed.data.role, email, mfi_institution_id: parsed.data.mfi_institution_id ?? null },
  });

  if (request.headers.get('accept')?.includes('text/html')) {
    const destination = parsed.data.role === 'mfi_partner' ? '/admin/finance/partners' : `/admin/users?role=${parsed.data.role}`;
    return NextResponse.redirect(new URL(destination, request.url));
  }

  return NextResponse.json({ user: result.data }, { status: existing ? 200 : 201 });
}

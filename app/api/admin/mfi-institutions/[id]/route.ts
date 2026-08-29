import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';
import { z } from 'zod';

interface RouteParams { params: { id: string } }

const schema = z.object({
  active: z.enum(['true', 'false']),
});

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

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireAdmin(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const parsed = schema.safeParse(await parseBody(request));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid institution update.' }, { status: 400 });
  }

  const active = parsed.data.active === 'true';
  const { data, error } = await supabaseAdmin
    .from('mfi_institutions')
    .update({ active })
    .eq('id', params.id)
    .select('id, name, code')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to update institution.' }, { status: 500 });
  }

  await supabaseAdmin.from('audit_logs').insert({
    actor_id: auth.user.id,
    actor_email: auth.user.email,
    actor_role: auth.user.role,
    action: active ? 'mfi_institution_activated' : 'mfi_institution_deactivated',
    entity_type: 'mfi_institutions',
    entity_id: params.id,
    meta: { name: data.name, code: data.code },
  });

  if (request.headers.get('accept')?.includes('text/html')) {
    return NextResponse.redirect(new URL('/admin/finance/partners', request.url));
  }

  return NextResponse.json({ institution: data });
}

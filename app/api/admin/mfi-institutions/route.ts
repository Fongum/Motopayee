import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';
import { z } from 'zod';

const createSchema = z.object({
  name: z.string().trim().min(2),
  code: z.string().trim().min(2).max(24).optional(),
  contact_email: z.string().trim().email().optional().or(z.literal('')),
  contact_phone: z.string().trim().optional(),
  city: z.string().trim().optional(),
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

function codeFromName(name: string) {
  const base = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
    .slice(0, 12);
  return `${base || 'MFI'}${Date.now().toString().slice(-4)}`;
}

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

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const parsed = createSchema.safeParse(await parseBody(request));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid institution.' }, { status: 400 });
  }

  const sanitizedCode = (parsed.data.code || '')
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 24);
  const code = sanitizedCode || codeFromName(parsed.data.name);
  const { data, error } = await supabaseAdmin
    .from('mfi_institutions')
    .insert({
      name: parsed.data.name,
      code,
      contact_email: parsed.data.contact_email || null,
      contact_phone: parsed.data.contact_phone || null,
      city: parsed.data.city || null,
      active: true,
    })
    .select('id')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to create institution.' }, { status: 500 });
  }

  await supabaseAdmin.from('audit_logs').insert({
    actor_id: auth.user.id,
    actor_email: auth.user.email,
    actor_role: auth.user.role,
    action: 'mfi_institution_created',
    entity_type: 'mfi_institutions',
    entity_id: data.id,
    meta: { code, name: parsed.data.name },
  });

  if (request.headers.get('accept')?.includes('text/html')) {
    return NextResponse.redirect(new URL('/admin/finance/partners', request.url));
  }

  return NextResponse.json({ institution_id: data.id }, { status: 201 });
}

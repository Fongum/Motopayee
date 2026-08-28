import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';
import { z } from 'zod';

const schema = z.object({
  key: z.enum(['whatsapp_business', 'inquiry_handling', 'rental_rules', 'trust_labels']),
  status: z.enum(['not_started', 'in_progress', 'ready', 'blocked']),
  notes: z.string().trim().max(1000).optional(),
});

export async function POST(request: Request) {
  const auth = await requireStaff(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: Record<string, unknown> = {};
  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    body = await request.json().catch(() => ({}));
  } else if (contentType.includes('application/x-www-form-urlencoded')) {
    const text = await request.text();
    const form = new URLSearchParams(text);
    form.forEach((value, key) => { body[key] = value; });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid readiness update.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('launch_readiness_checks')
    .update({
      status: parsed.data.status,
      notes: parsed.data.notes || null,
      updated_by: auth.user.id,
    })
    .eq('key', parsed.data.key)
    .select('key, status, notes')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to update readiness check.' }, { status: 500 });
  }

  await supabaseAdmin.from('audit_logs').insert({
    actor_id: auth.user.id,
    actor_email: auth.user.email,
    actor_role: auth.user.role,
    action: 'launch_readiness_check_update',
    entity_type: 'launch_readiness_checks',
    entity_id: parsed.data.key,
    meta: { status: parsed.data.status },
  });

  if (request.headers.get('accept')?.includes('text/html')) {
    const referer = request.headers.get('referer');
    if (referer) {
      try {
        if (new URL(referer).origin === new URL(request.url).origin) {
          return NextResponse.redirect(referer);
        }
      } catch {}
    }
    return NextResponse.redirect(new URL('/admin/launch', request.url));
  }

  return NextResponse.json({ check: data });
}

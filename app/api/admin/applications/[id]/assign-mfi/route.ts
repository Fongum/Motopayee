import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';
import { z } from 'zod';

interface RouteParams { params: { id: string } }

const schema = z.object({
  mfi_institution_id: z.string().uuid(),
  return_to: z.string().trim().optional(),
});

async function parseBody(request: Request): Promise<Record<string, unknown>> {
  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) return request.json().catch(() => ({}));
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const text = await request.text();
    const form = new URLSearchParams(text);
    const body: Record<string, unknown> = {};
    form.forEach((value, key) => { body[key] = value; });
    return body;
  }
  return {};
}

async function assignMfi(request: Request, { params }: RouteParams) {
  const auth = await requireAdmin(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await parseBody(request);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'mfi_institution_id (UUID) is required.' }, { status: 400 });
  }

  const { data: existing } = await supabaseAdmin
    .from('financing_applications')
    .select('id, mfi_institution_id, follow_up_status')
    .eq('id', params.id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: 'Application not found.' }, { status: 404 });
  }

  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('financing_applications')
    .update({
      mfi_institution_id: parsed.data.mfi_institution_id,
      follow_up_status: 'waiting_mfi',
      next_follow_up_at: existing.follow_up_status === 'closed' ? null : now,
      follow_up_actor_id: auth.user.id,
      follow_up_updated_at: now,
      verifier_id: auth.user.id,
    })
    .eq('id', params.id)
    .select('id, mfi_institution_id')
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to assign MFI.' }, { status: 500 });
  }

  await supabaseAdmin.from('audit_logs').insert({
    actor_id: auth.user.id,
    actor_email: auth.user.email,
    actor_role: auth.user.role,
    action: 'application_mfi_assigned',
    entity_type: 'financing_applications',
    entity_id: params.id,
    meta: {
      previous_mfi_institution_id: existing.mfi_institution_id,
      new_mfi_institution_id: parsed.data.mfi_institution_id,
    },
  });

  if (request.headers.get('accept')?.includes('text/html')) {
    const returnTo = parsed.data.return_to?.startsWith('/admin/applications')
      ? parsed.data.return_to
      : `/admin/applications/${params.id}`;
    return NextResponse.redirect(new URL(returnTo, request.url));
  }

  return NextResponse.json({ application: data });
}

export async function PATCH(request: Request, context: RouteParams) {
  return assignMfi(request, context);
}

export async function POST(request: Request, context: RouteParams) {
  return assignMfi(request, context);
}

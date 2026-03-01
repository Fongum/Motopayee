import { NextResponse } from 'next/server';
import { requireVerifier } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';
import { z } from 'zod';

interface RouteParams { params: { id: string } }

const VALID_TRANSITIONS: Record<string, string[]> = {
  submitted: ['docs_pending', 'under_review', 'withdrawn'],
  docs_pending: ['docs_received', 'withdrawn'],
  docs_received: ['under_review', 'withdrawn'],
  under_review: ['approved', 'rejected'],
  approved: ['disbursed'],
};

const schema = z.object({
  status: z.string(),
  income_grade: z.enum(['A', 'B', 'C', 'D']).optional(),
  notes: z.string().optional(),
  down_payment_percent: z.number().optional(),
  max_tenor: z.number().int().optional(),
});

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireVerifier(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: Record<string, unknown> = {};
  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    body = await request.json().catch(() => ({}));
  } else if (contentType.includes('application/x-www-form-urlencoded')) {
    const text = await request.text();
    const p = new URLSearchParams(text);
    p.forEach((v, k) => { body[k] = v; });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const { data: app } = await supabaseAdmin
    .from('financing_applications')
    .select('id, status')
    .eq('id', params.id)
    .single();

  if (!app) {
    return NextResponse.json({ error: 'Application not found.' }, { status: 404 });
  }

  const allowed = VALID_TRANSITIONS[app.status] ?? [];
  if (!allowed.includes(parsed.data.status)) {
    return NextResponse.json(
      { error: `Cannot transition from ${app.status} to ${parsed.data.status}.` },
      { status: 400 }
    );
  }

  const updates: Record<string, unknown> = {
    status: parsed.data.status,
    verifier_id: auth.user.id,
  };
  if (parsed.data.income_grade) updates.income_grade = parsed.data.income_grade;
  if (parsed.data.notes) updates.notes = parsed.data.notes;
  if (parsed.data.down_payment_percent) updates.down_payment_percent = parsed.data.down_payment_percent;
  if (parsed.data.max_tenor) updates.max_tenor = parsed.data.max_tenor;
  if (['approved', 'rejected'].includes(parsed.data.status)) {
    updates.decided_at = new Date().toISOString();
  }

  const { data, error } = await supabaseAdmin
    .from('financing_applications')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to update application.' }, { status: 500 });
  }

  await supabaseAdmin.from('audit_logs').insert({
    actor_id: auth.user.id,
    actor_email: auth.user.email,
    actor_role: auth.user.role,
    action: `application_status_${parsed.data.status}`,
    entity_type: 'financing_applications',
    entity_id: params.id,
    meta: { from: app.status, to: parsed.data.status, income_grade: parsed.data.income_grade },
  });

  if (request.headers.get('accept')?.includes('text/html')) {
    return NextResponse.redirect(new URL(`/admin/applications/${params.id}`, request.url));
  }

  return NextResponse.json({ application: data });
}

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireVerifier } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';

interface RouteParams {
  params: { id: string };
}

const schema = z.object({
  follow_up_status: z.enum(['none', 'call_needed', 'contacted', 'waiting_buyer', 'waiting_mfi', 'closed']),
  follow_up_notes: z.string().trim().max(2000).optional().nullable(),
  next_follow_up_at: z.string().trim().optional().nullable(),
  return_to: z.string().trim().optional(),
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
    p.forEach((value, key) => {
      body[key] = value;
    });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid follow-up update.' }, { status: 400 });
  }

  const { data: existing } = await supabaseAdmin
    .from('financing_applications')
    .select('id, follow_up_status, follow_up_notes, next_follow_up_at')
    .eq('id', params.id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: 'Application not found.' }, { status: 404 });
  }

  if (parsed.data.next_follow_up_at && Number.isNaN(Date.parse(parsed.data.next_follow_up_at))) {
    return NextResponse.json({ error: 'Invalid follow-up date.' }, { status: 400 });
  }

  const hasFollowUpNotes = Object.prototype.hasOwnProperty.call(body, 'follow_up_notes');
  const hasNextFollowUpAt = Object.prototype.hasOwnProperty.call(body, 'next_follow_up_at');
  const nextFollowUpAt = hasNextFollowUpAt
    ? parsed.data.next_follow_up_at
      ? new Date(parsed.data.next_follow_up_at).toISOString()
      : null
    : existing.next_follow_up_at;

  const updates = {
    follow_up_status: parsed.data.follow_up_status,
    follow_up_notes: hasFollowUpNotes ? parsed.data.follow_up_notes || null : existing.follow_up_notes,
    next_follow_up_at: nextFollowUpAt,
    follow_up_actor_id: auth.user.id,
    follow_up_updated_at: new Date().toISOString(),
    verifier_id: auth.user.id,
  };

  const { data, error } = await supabaseAdmin
    .from('financing_applications')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to update follow-up.' }, { status: 500 });
  }

  await supabaseAdmin.from('audit_logs').insert({
    actor_id: auth.user.id,
    actor_email: auth.user.email,
    actor_role: auth.user.role,
    action: 'application_follow_up_updated',
    entity_type: 'financing_applications',
    entity_id: params.id,
    meta: {
      previous_status: existing.follow_up_status,
      new_status: parsed.data.follow_up_status,
      next_follow_up_at: nextFollowUpAt,
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

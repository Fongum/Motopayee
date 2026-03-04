import { NextResponse } from 'next/server';
import { requireBuyer } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';
import { notifyApplicationSubmitted } from '@/lib/notifications';

interface RouteParams { params: { id: string } }

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireBuyer(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // Verify ownership and draft status
  const { data: app } = await supabaseAdmin
    .from('financing_applications')
    .select('id, status, buyer_id')
    .eq('id', params.id)
    .single();

  if (!app || app.buyer_id !== auth.user.id) {
    return NextResponse.json({ error: 'Application not found.' }, { status: 404 });
  }

  if (app.status !== 'draft') {
    return NextResponse.json({ error: 'Application already submitted.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('financing_applications')
    .update({ status: 'submitted', submitted_at: new Date().toISOString() })
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to submit application.' }, { status: 500 });
  }

  // Audit log
  await supabaseAdmin.from('audit_logs').insert({
    actor_id: auth.user.id,
    actor_email: auth.user.email,
    actor_role: auth.user.role,
    action: 'application_submitted',
    entity_type: 'financing_applications',
    entity_id: params.id,
    meta: { from: 'draft', to: 'submitted' },
  });

  // SMS notification (fire-and-forget)
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('phone')
    .eq('id', auth.user.id)
    .single();
  notifyApplicationSubmitted(profile?.phone ?? null, params.id).catch(console.error);

  return NextResponse.json({ application: data });
}

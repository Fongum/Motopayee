import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';
import { z } from 'zod';

interface RouteParams { params: { id: string } }

const schema = z.object({
  status: z.enum(['expected', 'invoiced', 'paid', 'waived', 'refunded']),
  notes: z.string().optional(),
});

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireAdmin(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: Record<string, unknown> = {};
  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    body = await request.json().catch(() => ({}));
  } else if (contentType.includes('application/x-www-form-urlencoded')) {
    const text = await request.text();
    const paramsBody = new URLSearchParams(text);
    paramsBody.forEach((value, key) => { body[key] = value; });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid service fee status.' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {
    status: parsed.data.status,
    notes: parsed.data.notes || null,
    paid_at: parsed.data.status === 'paid' ? new Date().toISOString() : null,
  };

  const { data, error } = await supabaseAdmin
    .from('hire_service_fees')
    .update(updates)
    .eq('id', params.id)
    .select('id, hire_booking_id, status')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to update service fee.' }, { status: 500 });
  }

  await supabaseAdmin.from('audit_logs').insert({
    actor_id: auth.user.id,
    actor_email: auth.user.email,
    actor_role: auth.user.role,
    action: 'hire_service_fee_status_update',
    entity_type: 'hire_service_fees',
    entity_id: params.id,
    meta: { status: parsed.data.status, hire_booking_id: data.hire_booking_id },
  });

  if (request.headers.get('accept')?.includes('text/html')) {
    return NextResponse.redirect(new URL('/admin/hire/bookings', request.url));
  }

  return NextResponse.json({ service_fee: data });
}

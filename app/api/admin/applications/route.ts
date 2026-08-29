import { NextResponse } from 'next/server';
import { requireVerifier } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';
import { recordLeadActivity } from '@/lib/launch-lead-activities';
import { z } from 'zod';

const schema = z.object({
  buyer_id: z.string().uuid(),
  listing_id: z.string().uuid(),
  launch_lead_id: z.string().uuid().optional().or(z.literal('')),
  notes: z.string().trim().max(2000).optional(),
  return_to: z.string().trim().optional(),
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

export async function POST(request: Request) {
  const auth = await requireVerifier(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const parsed = schema.safeParse(await parseBody(request));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid application.' }, { status: 400 });
  }

  const [{ data: buyer }, { data: listing }] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select('id, role, email, full_name')
      .eq('id', parsed.data.buyer_id)
      .maybeSingle(),
    supabaseAdmin
      .from('listings')
      .select('id, status, financeable')
      .eq('id', parsed.data.listing_id)
      .maybeSingle(),
  ]);

  if (!buyer || buyer.role !== 'buyer') {
    return NextResponse.json({ error: 'Buyer profile is required.' }, { status: 400 });
  }
  if (!listing || listing.status !== 'published' || !listing.financeable) {
    return NextResponse.json({ error: 'Listing must be published and finance eligible.' }, { status: 400 });
  }

  const { data: existing } = await supabaseAdmin
    .from('financing_applications')
    .select('id')
    .eq('buyer_id', parsed.data.buyer_id)
    .eq('listing_id', parsed.data.listing_id)
    .not('status', 'eq', 'withdrawn')
    .maybeSingle();

  if (existing) {
    if (request.headers.get('accept')?.includes('text/html')) {
      return NextResponse.redirect(new URL(`/admin/applications/${existing.id}`, request.url));
    }
    return NextResponse.json({ error: 'Application already exists.', application_id: existing.id }, { status: 409 });
  }

  const notes = parsed.data.notes || 'Created by staff from buyer finance matching queue.';
  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from('financing_applications')
    .insert({
      buyer_id: parsed.data.buyer_id,
      listing_id: parsed.data.listing_id,
      status: 'submitted',
      submitted_at: now,
      verifier_id: auth.user.id,
      follow_up_status: 'call_needed',
      next_follow_up_at: now,
      follow_up_actor_id: auth.user.id,
      follow_up_updated_at: now,
      notes,
    })
    .select('id')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to create application.' }, { status: 500 });
  }

  if (parsed.data.launch_lead_id) {
    await supabaseAdmin
      .from('launch_leads')
      .update({
        converted_entity_type: 'financing_application',
        converted_entity_id: data.id,
        status: 'converted',
        next_follow_up_at: null,
      })
      .eq('id', parsed.data.launch_lead_id);

    await recordLeadActivity({
      leadId: parsed.data.launch_lead_id,
      actorId: auth.user.id,
      action: 'converted',
      summary: 'Financing application created from buyer lead.',
      meta: { application_id: data.id, buyer_id: parsed.data.buyer_id, listing_id: parsed.data.listing_id },
    });
  }

  await supabaseAdmin.from('audit_logs').insert({
    actor_id: auth.user.id,
    actor_email: auth.user.email,
    actor_role: auth.user.role,
    action: 'admin_financing_application_created',
    entity_type: 'financing_applications',
    entity_id: data.id,
    meta: {
      buyer_id: parsed.data.buyer_id,
      listing_id: parsed.data.listing_id,
      launch_lead_id: parsed.data.launch_lead_id || null,
    },
  });

  if (request.headers.get('accept')?.includes('text/html')) {
    return NextResponse.redirect(new URL(`/admin/applications/${data.id}`, request.url));
  }

  return NextResponse.json({ application_id: data.id }, { status: 201 });
}

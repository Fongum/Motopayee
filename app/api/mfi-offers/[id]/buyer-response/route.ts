import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireBuyer } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';

interface RouteParams {
  params: { id: string };
}

const schema = z.object({
  buyer_response: z.enum(['interested', 'not_interested']),
});

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireBuyer(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid buyer response.' }, { status: 400 });
  }

  const { data: offer } = await supabaseAdmin
    .from('mfi_application_offers')
    .select('id, application_id, status, institution:mfi_institutions(name, code), application:financing_applications(id, buyer_id, status, follow_up_status, follow_up_notes)')
    .eq('id', params.id)
    .maybeSingle();

  const application = Array.isArray(offer?.application) ? offer?.application[0] : offer?.application;
  const institution = Array.isArray(offer?.institution) ? offer?.institution[0] : offer?.institution;

  if (!offer || !application || application.buyer_id !== auth.user.id) {
    return NextResponse.json({ error: 'Offer not found.' }, { status: 404 });
  }

  if (!['submitted', 'shortlisted', 'accepted'].includes(offer.status as string)) {
    return NextResponse.json({ error: 'This offer is no longer available.' }, { status: 409 });
  }

  if (['rejected', 'disbursed', 'withdrawn'].includes(application.status as string)) {
    return NextResponse.json({ error: 'Application is closed.' }, { status: 409 });
  }

  const { data, error } = await supabaseAdmin
    .from('mfi_application_offers')
    .update({
      buyer_response: parsed.data.buyer_response,
      buyer_responded_at: new Date().toISOString(),
    })
    .eq('id', params.id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to save buyer response.' }, { status: 500 });
  }

  const appRow = application as {
    id: string;
    follow_up_status?: string | null;
    follow_up_notes?: string | null;
  };
  const institutionName = (institution as { name?: string | null; code?: string | null } | null)?.name
    ?? (institution as { code?: string | null } | null)?.code
    ?? 'IMF offer';
  const shouldAutoQueue = !appRow.follow_up_status
    || ['none', 'closed', 'waiting_buyer', 'waiting_mfi'].includes(appRow.follow_up_status);

  if (shouldAutoQueue) {
    await supabaseAdmin
      .from('financing_applications')
      .update({
        follow_up_status: 'call_needed',
        follow_up_notes: parsed.data.buyer_response === 'interested'
          ? `Buyer marked interest in ${institutionName}. Staff should call buyer and coordinate next steps with the MFI.`
          : `Buyer declined the offer from ${institutionName}. Staff should confirm whether to seek another offer.`,
        next_follow_up_at: new Date().toISOString(),
        follow_up_actor_id: auth.user.id,
        follow_up_updated_at: new Date().toISOString(),
      })
      .eq('id', appRow.id);
  }

  await supabaseAdmin.from('audit_logs').insert({
    actor_id: auth.user.id,
    actor_email: auth.user.email,
    actor_role: auth.user.role,
    action: `mfi_offer_buyer_${parsed.data.buyer_response}`,
    entity_type: 'financing_applications',
    entity_id: application.id,
    meta: {
      offer_id: params.id,
      buyer_response: parsed.data.buyer_response,
    },
  });

  return NextResponse.json({ offer: data });
}

import { NextRequest, NextResponse } from 'next/server';
import { reportError } from '@/lib/error-reporting';
import { z } from 'zod';
import { requireVerifier } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';
import { ensureFinanceCommission } from '@/lib/finance-commissions';

const schema = z.object({
  status: z.enum(['shortlisted', 'accepted', 'declined']).optional(),
  buyer_response: z.enum(['interested', 'not_interested']).nullable().optional(),
}).refine((value) => value.status || value.buyer_response !== undefined, {
  message: 'Offer status or buyer response is required.',
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireVerifier(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid offer status.' }, { status: 400 });
  }

  const { data: offer } = await supabaseAdmin
    .from('mfi_application_offers')
    .select('*, institution:mfi_institutions(name, code)')
    .eq('id', params.id)
    .maybeSingle();

  if (!offer) {
    return NextResponse.json({ error: 'Offer not found.' }, { status: 404 });
  }

  const offerRow = offer as {
    id: string;
    application_id: string;
    mfi_institution_id: string;
    status: string;
    proposed_down_payment_percent: number | null;
    proposed_tenor_months: number | null;
    institution?: { name?: string | null; code?: string | null } | null;
  };

  if (parsed.data.status && offerRow.status === 'withdrawn') {
    return NextResponse.json({ error: 'Withdrawn offers cannot be updated.' }, { status: 409 });
  }

  const { data: app } = await supabaseAdmin
    .from('financing_applications')
    .select('id, status, follow_up_status')
    .eq('id', offerRow.application_id)
    .maybeSingle();

  if (!app || ['rejected', 'disbursed', 'withdrawn'].includes(app.status as string)) {
    return NextResponse.json({ error: 'Application is closed.' }, { status: 409 });
  }

  if (parsed.data.buyer_response !== undefined && !['submitted', 'shortlisted', 'accepted'].includes(offerRow.status)) {
    return NextResponse.json({ error: 'Buyer response can only be recorded for active offers.' }, { status: 409 });
  }

  const offerUpdates: Record<string, unknown> = {};
  if (parsed.data.status) {
    offerUpdates.status = parsed.data.status;
  }
  if (parsed.data.buyer_response !== undefined) {
    offerUpdates.buyer_response = parsed.data.buyer_response;
    offerUpdates.buyer_responded_at = parsed.data.buyer_response ? new Date().toISOString() : null;
  }

  const { data, error } = await supabaseAdmin
    .from('mfi_application_offers')
    .update(offerUpdates)
    .eq('id', params.id)
    .select()
    .single();

  if (error || !data) {
    reportError('Failed to update offer.', { source: 'api/admin/mfi-offers', cause: error });
    return NextResponse.json({ error: 'Failed to update offer.' }, { status: 500 });
  }

  if (parsed.data.status === 'accepted') {
    await supabaseAdmin
      .from('mfi_application_offers')
      .update({ status: 'declined' })
      .eq('application_id', offerRow.application_id)
      .neq('id', params.id)
      .in('status', ['submitted', 'shortlisted']);

    const updates: Record<string, unknown> = {
      mfi_institution_id: offerRow.mfi_institution_id,
      status: 'approved',
      verifier_id: auth.user.id,
      decided_at: new Date().toISOString(),
    };
    if (offerRow.proposed_down_payment_percent != null) {
      updates.down_payment_percent = offerRow.proposed_down_payment_percent;
    }
    if (offerRow.proposed_tenor_months != null) {
      updates.max_tenor = offerRow.proposed_tenor_months;
    }

    await supabaseAdmin
      .from('financing_applications')
      .update(updates)
      .eq('id', offerRow.application_id);

    await ensureFinanceCommission(offerRow.application_id, auth.user.id);
  }

  if (parsed.data.buyer_response) {
    const appRow = app as { id: string; follow_up_status?: string | null };
    const institutionName = offerRow.institution?.name ?? offerRow.institution?.code ?? 'IMF offer';
    const shouldQueueFollowUp = !appRow.follow_up_status
      || ['none', 'closed', 'waiting_buyer', 'waiting_mfi'].includes(appRow.follow_up_status);

    if (shouldQueueFollowUp) {
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
          verifier_id: auth.user.id,
        })
        .eq('id', appRow.id);
    }
  }

  await supabaseAdmin.from('audit_logs').insert({
    actor_id: auth.user.id,
    actor_email: auth.user.email,
    actor_role: auth.user.role,
    action: parsed.data.status
      ? `mfi_offer_${parsed.data.status}`
      : `mfi_offer_buyer_${parsed.data.buyer_response}`,
    entity_type: 'financing_applications',
    entity_id: offerRow.application_id,
    meta: {
      offer_id: offerRow.id,
      mfi_institution_id: offerRow.mfi_institution_id,
      previous_status: offerRow.status,
      new_status: parsed.data.status ?? offerRow.status,
      buyer_response: parsed.data.buyer_response,
    },
  });

  return NextResponse.json({ offer: data });
}

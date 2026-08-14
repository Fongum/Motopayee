import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireVerifier } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';

const schema = z.object({
  status: z.enum(['shortlisted', 'accepted', 'declined']),
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
    .select('*')
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
  };

  if (offerRow.status === 'withdrawn') {
    return NextResponse.json({ error: 'Withdrawn offers cannot be updated.' }, { status: 409 });
  }

  const { data: app } = await supabaseAdmin
    .from('financing_applications')
    .select('id, status')
    .eq('id', offerRow.application_id)
    .maybeSingle();

  if (!app || ['rejected', 'disbursed', 'withdrawn'].includes(app.status as string)) {
    return NextResponse.json({ error: 'Application is closed.' }, { status: 409 });
  }

  const { data, error } = await supabaseAdmin
    .from('mfi_application_offers')
    .update({ status: parsed.data.status })
    .eq('id', params.id)
    .select()
    .single();

  if (error || !data) {
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
  }

  await supabaseAdmin.from('audit_logs').insert({
    actor_id: auth.user.id,
    actor_email: auth.user.email,
    actor_role: auth.user.role,
    action: `mfi_offer_${parsed.data.status}`,
    entity_type: 'financing_applications',
    entity_id: offerRow.application_id,
    meta: {
      offer_id: offerRow.id,
      mfi_institution_id: offerRow.mfi_institution_id,
      previous_status: offerRow.status,
      new_status: parsed.data.status,
    },
  });

  return NextResponse.json({ offer: data });
}

import { NextResponse } from 'next/server';
import { supabaseAdmin, getCurrentUser } from '@/lib/auth/server';
import { notifyDisbursed } from '@/lib/notifications';

interface RouteParams { params: { id: string } }

export async function POST(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'mfi_partner' && user.role !== 'admin')) {
    return NextResponse.json({ error: 'MFI partner access required.' }, { status: 403 });
  }

  // Get this user's institution (skip check for admin)
  let institutionId: string | null = null;
  if (user.role === 'mfi_partner') {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('mfi_institution_id')
      .eq('id', user.id)
      .single();
    institutionId = (profile as { mfi_institution_id: string | null } | null)?.mfi_institution_id ?? null;
    if (!institutionId) {
      return NextResponse.json({ error: 'No MFI institution linked to your account.' }, { status: 403 });
    }
  }

  // Fetch application
  const { data: app } = await supabaseAdmin
    .from('financing_applications')
    .select('id, status, buyer_id, mfi_institution_id')
    .eq('id', params.id)
    .single();

  if (!app) {
    return NextResponse.json({ error: 'Application not found.' }, { status: 404 });
  }

  const a = app as { id: string; status: string; buyer_id: string; mfi_institution_id: string | null };

  // MFI partner can only disburse applications assigned to their institution
  if (institutionId && a.mfi_institution_id !== institutionId) {
    return NextResponse.json({ error: 'This application is not assigned to your institution.' }, { status: 403 });
  }

  if (a.status !== 'approved') {
    return NextResponse.json({ error: `Cannot disburse from status "${a.status}".` }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('financing_applications')
    .update({ status: 'disbursed', disbursed_at: new Date().toISOString() })
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to update application.' }, { status: 500 });
  }

  await supabaseAdmin.from('audit_logs').insert({
    actor_id: user.id,
    actor_email: user.email,
    actor_role: user.role,
    action: 'application_disbursed',
    entity_type: 'financing_applications',
    entity_id: params.id,
    meta: { from: 'approved', to: 'disbursed' },
  });

  // Notify buyer
  const { data: buyerProfile } = await supabaseAdmin
    .from('profiles').select('phone').eq('id', a.buyer_id).single();
  notifyDisbursed((buyerProfile as { phone: string | null } | null)?.phone ?? null).catch(console.error);

  return NextResponse.json({ application: data });
}

import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';

const STATUS_VALUES = ['new', 'contacted', 'interested', 'qualified', 'awaiting_assets', 'ready_for_listing', 'onboarding', 'converted', 'not_fit', 'closed'];
const TYPE_VALUES = ['seller', 'dealer', 'rental_owner', 'buyer', 'renter', 'mfi', 'inspection', 'other'];
const SOURCE_VALUES = ['website', 'whatsapp', 'referral', 'facebook', 'field', 'dealer_visit', 'staff', 'other'];
const PRIORITY_VALUES = ['low', 'normal', 'high'];
const OPEN_STATUSES = ['new', 'contacted', 'interested', 'qualified', 'awaiting_assets', 'ready_for_listing', 'onboarding'];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function csvCell(value: unknown) {
  const text = value == null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function ageInDays(date: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / (24 * 60 * 60 * 1000)));
}

export async function GET(request: Request) {
  const auth = await requireStaff(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const type = searchParams.get('type');
  const source = searchParams.get('source');
  const assigned = searchParams.get('assigned');
  const priority = searchParams.get('priority');
  const campaign = searchParams.get('campaign');

  let query = supabaseAdmin
    .from('launch_leads')
    .select(`
      id,
      lead_type,
      source,
      status,
      priority,
      name,
      business_name,
      phone,
      email,
      city,
      interest,
      campaign_name,
      notes,
      next_follow_up_at,
      converted_entity_type,
      converted_entity_id,
      created_at,
      assigned:profiles!assigned_to(full_name, email)
    `)
    .order('created_at', { ascending: false });

  if (status === 'due') {
    query = query.in('status', OPEN_STATUSES).lte('next_follow_up_at', new Date().toISOString());
  } else if (status === 'today') {
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    query = query
      .in('status', OPEN_STATUSES)
      .gt('next_follow_up_at', new Date().toISOString())
      .lte('next_follow_up_at', endOfDay.toISOString());
  } else if (status === 'upcoming') {
    const start = new Date();
    start.setHours(23, 59, 59, 999);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    query = query
      .in('status', OPEN_STATUSES)
      .gt('next_follow_up_at', start.toISOString())
      .lte('next_follow_up_at', end.toISOString());
  } else if (status === 'new_aging') {
    query = query.eq('status', 'new').lte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  } else if (status === 'stale') {
    query = query.in('status', OPEN_STATUSES).lte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
  } else if (status && STATUS_VALUES.includes(status)) {
    query = query.eq('status', status);
  }

  if (type && TYPE_VALUES.includes(type)) {
    query = query.eq('lead_type', type);
  }

  if (source && SOURCE_VALUES.includes(source)) {
    query = query.eq('source', source);
  }

  if (campaign === '__none') {
    query = query.is('campaign_name', null);
  } else if (campaign) {
    query = query.eq('campaign_name', campaign);
  }

  if (assigned === 'me') {
    query = query.eq('assigned_to', auth.user.id);
  } else if (assigned === 'unassigned') {
    query = query.is('assigned_to', null);
  } else if (assigned && UUID_PATTERN.test(assigned)) {
    query = query.eq('assigned_to', assigned);
  }

  if (priority && PRIORITY_VALUES.includes(priority)) {
    query = query.eq('priority', priority);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: 'Failed to export leads.' }, { status: 500 });
  }

  const rows = (data ?? []) as unknown as Array<{
    id: string;
    lead_type: string;
    source: string;
    status: string;
    priority: string;
    name: string;
    business_name: string | null;
    phone: string | null;
    email: string | null;
    city: string | null;
    interest: string | null;
    campaign_name: string | null;
    notes: string | null;
    next_follow_up_at: string | null;
    converted_entity_type: string | null;
    converted_entity_id: string | null;
    created_at: string;
    assigned?: { full_name: string | null; email: string | null } | Array<{ full_name: string | null; email: string | null }> | null;
  }>;

  const header = [
    'lead_id',
    'created_at',
    'age_days',
    'lead_type',
    'source',
    'status',
    'priority',
    'name',
    'business_name',
    'phone',
    'email',
    'city',
    'interest',
    'campaign_name',
    'notes',
    'assigned_to',
    'next_follow_up_at',
    'converted_entity_type',
    'converted_entity_id',
  ];

  const lines = [
    header.map(csvCell).join(','),
    ...rows.map((lead) => {
      const assigned = Array.isArray(lead.assigned) ? lead.assigned[0] : lead.assigned;
      return [
        lead.id,
        lead.created_at,
        ageInDays(lead.created_at),
        lead.lead_type,
        lead.source,
        lead.status,
        lead.priority,
        lead.name,
        lead.business_name,
        lead.phone,
        lead.email,
        lead.city,
        lead.interest,
        lead.campaign_name,
        lead.notes,
        assigned?.full_name ?? assigned?.email ?? '',
        lead.next_follow_up_at,
        lead.converted_entity_type,
        lead.converted_entity_id,
      ].map(csvCell).join(',');
    }),
  ];

  await supabaseAdmin.from('audit_logs').insert({
    actor_id: auth.user.id,
    actor_email: auth.user.email,
    actor_role: auth.user.role,
    action: 'launch_leads_exported',
    entity_type: 'launch_leads',
    entity_id: auth.user.id,
    meta: { status, type, source, assigned, priority, campaign, count: rows.length },
  });

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="motopayee-launch-leads-${date}.csv"`,
    },
  });
}

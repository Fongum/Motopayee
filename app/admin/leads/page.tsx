import { supabaseAdmin } from '@/lib/auth/server';
import { requireAdminPage } from '@/lib/auth/admin-access';
import Link from 'next/link';
import TruncationNotice from '../../(components)/TruncationNotice';
import { buildContactUrl } from '@/lib/whatsapp';
import { QUICK_LEAD_ACTIVITY_TEMPLATES, buildLeadOutreachMessage } from '@/lib/launch-lead-playbooks';
import { DEFAULT_RESPONSE_SLA_MINUTES, INBOUND_LEAD_TYPES } from '@/lib/inbound-response';
import {
  OPEN_LEAD_STATUSES,
  STALE_LEAD_DAYS,
  campaignLabel,
  campaignPerformance as buildCampaignPerformance,
  conversionRate as computeConversionRate,
  topN,
  windowStart,
  workloadByStaff as buildWorkloadByStaff,
} from '@/lib/launch-lead-metrics';
import type { KeyCount } from '@/lib/launch-lead-metrics';
import {
  fetchActivityOutcomes,
  fetchLeadMetrics,
  fetchLeadWorkload,
} from '@/lib/launch-lead-metrics.server';

const TYPE_LABELS: Record<string, string> = {
  seller: 'Vendeur',
  dealer: 'Concessionnaire',
  rental_owner: 'Location',
  buyer: 'Acheteur',
  renter: 'Locataire',
  mfi: 'IMF',
  inspection: 'Inspection',
  other: 'Autre',
};

const STATUS_LABELS: Record<string, string> = {
  new: 'Nouveau',
  contacted: 'Contacte',
  interested: 'Interesse',
  qualified: 'Qualifie',
  awaiting_assets: 'Attente photos/docs',
  ready_for_listing: 'Pret listing',
  onboarding: 'Onboarding',
  converted: 'Converti',
  not_fit: 'Pas adapte',
  closed: 'Clos',
};

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-amber-50 text-amber-700',
  contacted: 'bg-blue-50 text-blue-700',
  interested: 'bg-green-50 text-green-700',
  qualified: 'bg-indigo-50 text-indigo-700',
  awaiting_assets: 'bg-orange-50 text-orange-700',
  ready_for_listing: 'bg-teal-50 text-teal-700',
  onboarding: 'bg-purple-50 text-purple-700',
  converted: 'bg-emerald-50 text-emerald-700',
  not_fit: 'bg-gray-100 text-gray-600',
  closed: 'bg-gray-100 text-gray-600',
};

// One vocabulary, shared with the SQL metric functions it is passed into.
const OPEN_STATUSES: readonly string[] = OPEN_LEAD_STATUSES;

/**
 * How many leads the table renders. Each row carries its full activity history,
 * so this is the real payload driver on the page — and it is a deliberate cap
 * now, announced to the user, rather than PostgREST quietly stopping at 1000.
 */
const LEAD_LIST_LIMIT = 200;

const FILTERS = [
  { value: '', label: 'Tous' },
  { value: 'due', label: 'Relances dues' },
  { value: 'today', label: 'A faire aujourd hui' },
  { value: 'upcoming', label: '7 prochains jours' },
  { value: 'new_aging', label: 'Nouveaux >24h' },
  { value: 'stale', label: 'Aging 7j+' },
  { value: 'new', label: 'Nouveaux' },
  { value: 'contacted', label: 'Contactes' },
  { value: 'interested', label: 'Interesses' },
  { value: 'qualified', label: 'Qualifies' },
  { value: 'awaiting_assets', label: 'Attente photos/docs' },
  { value: 'ready_for_listing', label: 'Prets listing' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'converted', label: 'Convertis' },
];

const TYPE_FILTERS = [
  { value: '', label: 'Tous types' },
  { value: 'seller', label: 'Vendeurs' },
  { value: 'dealer', label: 'Dealers' },
  { value: 'rental_owner', label: 'Location' },
  { value: 'buyer', label: 'Acheteurs' },
  { value: 'renter', label: 'Locataires' },
  { value: 'mfi', label: 'IMF' },
];

const SOURCE_LABELS: Record<string, string> = {
  website: 'Website',
  whatsapp: 'WhatsApp',
  referral: 'Referral',
  facebook: 'Facebook',
  field: 'Terrain',
  dealer_visit: 'Visite dealer',
  staff: 'Staff',
  other: 'Autre',
};

const SOURCE_FILTERS = [
  { value: '', label: 'Toutes sources' },
  { value: 'website', label: 'Website' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'referral', label: 'Referral' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'field', label: 'Terrain' },
  { value: 'dealer_visit', label: 'Visite dealer' },
  { value: 'staff', label: 'Staff' },
  { value: 'other', label: 'Autre' },
];

const PRIORITY_FILTERS = [
  { value: '', label: 'Toutes priorites' },
  { value: 'high', label: 'Haute' },
  { value: 'normal', label: 'Normale' },
  { value: 'low', label: 'Basse' },
];

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ACTIVITY_ACTIONS = [
  { value: 'call', label: 'Appel' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
  { value: 'meeting', label: 'Rendez-vous' },
  { value: 'documents', label: 'Documents' },
  { value: 'note', label: 'Note' },
  { value: 'other', label: 'Autre' },
];

const ACTIVITY_OUTCOMES = [
  { value: '', label: 'Resultat' },
  { value: 'reached_interested', label: 'Interesse' },
  { value: 'reached_not_ready', label: 'Pas pret' },
  { value: 'no_answer', label: 'Pas de reponse' },
  { value: 'meeting_booked', label: 'RDV fixe' },
  { value: 'documents_requested', label: 'Docs demandes' },
  { value: 'not_fit', label: 'Pas adapte' },
  { value: 'converted', label: 'Converti' },
  { value: 'other', label: 'Autre' },
];

const FOLLOW_UP_PRESETS = [
  { value: '', label: 'Relance' },
  { value: 'later_today', label: 'Plus tard' },
  { value: 'tomorrow', label: 'Demain' },
  { value: 'three_days', label: 'Dans 3j' },
  { value: 'next_week', label: 'Semaine pro.' },
  { value: 'clear', label: 'Effacer' },
];

const OUTCOME_LABELS: Record<string, string> = Object.fromEntries(
  ACTIVITY_OUTCOMES.filter((outcome) => outcome.value).map((outcome) => [outcome.value, outcome.label])
);

type LeadRow = {
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
  assigned_to: string | null;
  next_follow_up_at: string | null;
  converted_entity_type: string | null;
  converted_entity_id: string | null;
  created_at: string;
  updated_at: string;
  assigned?: { full_name: string | null; email: string | null } | null;
  activities?: Array<{
    id: string;
    action: string;
    summary: string | null;
    meta?: { outcome?: string | null } | null;
    created_at: string;
    actor?: { full_name: string | null; email: string | null } | null;
  }>;
};

const CONVERSION_ACTIONS: Record<string, Array<{ label: string; href: string }>> = {
  seller: [
    { label: 'Nouvelle annonce admin', href: '/admin/listings/new' },
    { label: 'File inventory', href: '/admin/leads/inventory' },
  ],
  dealer: [
    { label: 'Nouvelle annonce admin', href: '/admin/listings/new' },
    { label: 'Programme dealer', href: '/dealers' },
  ],
  rental_owner: [
    { label: 'Nouvelle location admin', href: '/admin/hire/new' },
    { label: 'Reservations', href: '/admin/hire/bookings' },
  ],
  buyer: [
    { label: 'Matching finance', href: '/admin/finance/matches' },
    { label: 'Demandes finance', href: '/admin/applications' },
  ],
  renter: [
    { label: 'Location', href: '/hire' },
    { label: 'Reservations', href: '/admin/hire/bookings' },
  ],
  mfi: [
    { label: 'Partenaires finance', href: '/admin/finance/partners' },
    { label: 'Page partenaires', href: '/finance-partners' },
  ],
  inspection: [
    { label: 'Inspections', href: '/admin/inspection-requests' },
    { label: 'Listings', href: '/admin/listings' },
  ],
};

const CONVERSION_CHECKLISTS: Record<string, string[]> = {
  seller: [
    'Confirmer identite et droit de vendre.',
    'Collecter carte grise, photos, prix et localisation.',
    'Creer profil vendeur et annonce vente.',
    'Demander inspection ou verification avant publication.',
  ],
  dealer: [
    'Verifier responsable, localisation et volume potentiel.',
    'Presenter le pilote gratuit et les regles MotoPayee.',
    'Creer profil dealer et planifier import du stock.',
    'Definir cadence de suivi et opportunites finance/location.',
  ],
  rental_owner: [
    'Verifier proprietaire, vehicule, disponibilites, tarifs et caution.',
    'Collecter documents, photos et conditions de location.',
    'Creer annonce location.',
    'Confirmer reservation, paiement et remise du vehicule.',
  ],
  buyer: [
    'Qualifier budget, ville, delai et vehicule recherche.',
    'Verifier besoin achat cash ou financement.',
    'Associer une annonce finance eligible.',
    'Creer dossier de financement et suivre documents.',
  ],
  renter: [
    'Confirmer dates, ville, vehicule souhaite et permis.',
    'Proposer vehicules disponibles et clarifier caution.',
    'Creer reservation location.',
    'Planifier remise, verification et retour.',
  ],
  mfi: [
    'Identifier decisionnaire, produits credit et criteres.',
    'Valider documents requis et delais de reponse.',
    'Creer partenaire IMF.',
    'Aligner commission, reporting et workflow.',
  ],
  inspection: [
    'Confirmer vehicule, localisation et contact.',
    'Collecter frais ou accord de paiement inspection.',
    'Creer demande inspection.',
    'Assigner inspecteur et publier resume de confiance.',
  ],
  other: [
    'Clarifier objectif commercial.',
    'Assigner responsable interne.',
    'Definir prochaine action et date de relance.',
    'Convertir vers l objet MotoPayee correspondant.',
  ],
};

function ageInDays(date: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / (24 * 60 * 60 * 1000)));
}

function leadSla(lead: Pick<LeadRow, 'status' | 'created_at' | 'next_follow_up_at'>) {
  const ageDays = ageInDays(lead.created_at);
  if (lead.next_follow_up_at && new Date(lead.next_follow_up_at) <= new Date()) {
    return { label: 'Relance due', className: 'bg-red-50 text-red-700' };
  }
  if (lead.status === 'new' && ageDays >= 1) {
    return { label: `Nouveau ${ageDays}j`, className: 'bg-orange-50 text-orange-700' };
  }
  if (OPEN_STATUSES.includes(lead.status) && ageDays >= STALE_LEAD_DAYS) {
    return { label: `Aging ${ageDays}j`, className: 'bg-rose-50 text-rose-700' };
  }
  return { label: `${ageDays}j`, className: 'bg-gray-100 text-gray-600' };
}

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: { status?: string; type?: string; source?: string; assigned?: string; priority?: string; campaign?: string; inbound?: string };
}) {
  const user = await requireAdminPage('leads');

  // Bounded explicitly. Unbounded, PostgREST stopped at db-max-rows and the
  // page showed a silently truncated list; with an exact count it can at least
  // say so out loud.
  let query = supabaseAdmin
    .from('launch_leads')
    .select(
      '*, assigned:profiles!assigned_to(full_name, email), activities:launch_lead_activities(id, action, summary, meta, created_at, actor:profiles!actor_id(full_name, email))',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .limit(LEAD_LIST_LIMIT);

  if (searchParams.status && STATUS_LABELS[searchParams.status]) {
    query = query.eq('status', searchParams.status);
  }
  if (searchParams.status === 'due') {
    query = query
      .in('status', OPEN_STATUSES)
      .lte('next_follow_up_at', new Date().toISOString());
  }
  if (searchParams.status === 'today') {
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    query = query
      .in('status', OPEN_STATUSES)
      .gt('next_follow_up_at', new Date().toISOString())
      .lte('next_follow_up_at', endOfDay.toISOString());
  }
  if (searchParams.status === 'upcoming') {
    const start = new Date();
    start.setHours(23, 59, 59, 999);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    query = query
      .in('status', OPEN_STATUSES)
      .gt('next_follow_up_at', start.toISOString())
      .lte('next_follow_up_at', end.toISOString());
  }
  if (searchParams.status === 'new_aging') {
    query = query
      .eq('status', 'new')
      .lte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  }
  if (searchParams.status === 'stale') {
    query = query
      .in('status', OPEN_STATUSES)
      .lte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
  }
  if (searchParams.type && TYPE_LABELS[searchParams.type]) {
    query = query.eq('lead_type', searchParams.type);
  }
  if (searchParams.source && SOURCE_LABELS[searchParams.source]) {
    query = query.eq('source', searchParams.source);
  }
  if (searchParams.campaign === '__none') {
    query = query.is('campaign_name', null);
  } else if (searchParams.campaign) {
    query = query.eq('campaign_name', searchParams.campaign);
  }
  if (searchParams.assigned === 'me') {
    query = query.eq('assigned_to', user.id);
  } else if (searchParams.assigned === 'unassigned') {
    query = query.is('assigned_to', null);
  } else if (searchParams.assigned && UUID_PATTERN.test(searchParams.assigned)) {
    query = query.eq('assigned_to', searchParams.assigned);
  }
  if (searchParams.priority && ['low', 'normal', 'high'].includes(searchParams.priority)) {
    query = query.eq('priority', searchParams.priority);
  }
  // Callback requests from the public site. "late" narrows to the ones past
  // the response promise; the SLA cut is applied in SQL so paging stays honest.
  if (searchParams.inbound === 'waiting' || searchParams.inbound === 'late') {
    query = query
      .eq('status', 'new')
      .eq('source', 'website')
      .in('lead_type', INBOUND_LEAD_TYPES as unknown as string[]);

    if (searchParams.inbound === 'late') {
      query = query.lte(
        'created_at',
        new Date(Date.now() - DEFAULT_RESPONSE_SLA_MINUTES * 60_000).toISOString()
      );
    }
  }

  const [{ data, count: matchingLeadCount }, { data: staffData }] = await Promise.all([
    query,
    supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, role')
      .in('role', ['field_agent', 'inspector', 'verifier', 'admin'])
      .eq('status', 'active')
      .order('full_name'),
  ]);

  // Counted in Postgres (migration 036). These three panels used to fetch whole
  // tables and tally them here with .filter()/.reduce(), which PostgREST
  // truncated at 1000 rows — so every number below silently under-reported once
  // the lead table outgrew that, with no error to notice.
  const since = windowStart();
  const [metrics, workload, outcomeRows] = await Promise.all([
    fetchLeadMetrics(since),
    fetchLeadWorkload(),
    fetchActivityOutcomes(since),
  ]);

  const leads = (data ?? []) as unknown as LeadRow[];
  const staff = (staffData ?? []) as Array<{ id: string; full_name: string | null; email: string; role: string }>;
  const openLeads = leads.filter((lead) => !['converted', 'not_fit', 'closed'].includes(lead.status));
  const dueLeads = openLeads.filter((lead) => lead.next_follow_up_at && new Date(lead.next_follow_up_at) <= new Date());
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  const todayLeads = openLeads.filter((lead) => {
    if (!lead.next_follow_up_at) return false;
    const followUp = new Date(lead.next_follow_up_at);
    return followUp > new Date() && followUp <= endOfDay;
  });
  const sevenDaysFromNow = new Date(endOfDay);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  const upcomingLeads = openLeads.filter((lead) => {
    if (!lead.next_follow_up_at) return false;
    const followUp = new Date(lead.next_follow_up_at);
    return followUp > endOfDay && followUp <= sevenDaysFromNow;
  });
  const agingNewLeads = openLeads.filter((lead) => lead.status === 'new' && ageInDays(lead.created_at) >= 1);
  const staleLeads = openLeads.filter((lead) => ageInDays(lead.created_at) >= STALE_LEAD_DAYS);
  const unassignedOpenLeads = workload.unassigned;
  const staleWorkloadLeads = workload.stale;
  const workloadByStaff = buildWorkloadByStaff(staff, workload.by_staff);

  // The database already returns these ordered by count, so the page only has
  // to take the top slice and adapt them to the [label, count] tuples the JSX
  // below was written against.
  const asTuples = (rows: KeyCount[], limit: number): [string, number][] =>
    topN(rows, limit).map((row) => [row.key, row.count]);

  const campaignPerformance = buildCampaignPerformance(metrics.by_campaign, workload.due_by_campaign);
  const totalMetricLeads = metrics.total;
  const convertedMetricLeads = metrics.converted;
  const openMetricLeads = metrics.open;
  const conversionRate = computeConversionRate(metrics.converted, metrics.total);
  const topSources = asTuples(metrics.by_source, 5);
  const topCampaigns = topN(metrics.by_campaign, 5).map(
    (row): [string, number] => [campaignLabel(row.campaign), row.total]
  );
  const topTypes = asTuples(metrics.by_type, 6);
  const topOutcomes = asTuples(outcomeRows, 6);
  const recordedOutcomes = outcomeRows.reduce((sum, row) => sum + row.count, 0);

  const stats = [
    { label: 'Ouverts', value: openLeads.length, color: 'text-blue-700' },
    { label: 'Nouveaux', value: leads.filter((lead) => lead.status === 'new').length, color: 'text-amber-600' },
    { label: 'Relances dues', value: dueLeads.length, color: 'text-red-600' },
    { label: 'A faire aujourd hui', value: todayLeads.length, color: 'text-blue-700' },
    { label: '7 prochains jours', value: upcomingLeads.length, color: 'text-indigo-700' },
    { label: 'Aging 7j+', value: staleLeads.length, color: 'text-rose-700' },
    { label: 'Convertis', value: leads.filter((lead) => lead.status === 'converted').length, color: 'text-green-700' },
  ];
  const exportParams = new URLSearchParams();
  if (searchParams.status) exportParams.set('status', searchParams.status);
  if (searchParams.type) exportParams.set('type', searchParams.type);
  if (searchParams.source) exportParams.set('source', searchParams.source);
  if (searchParams.assigned) exportParams.set('assigned', searchParams.assigned);
  if (searchParams.priority) exportParams.set('priority', searchParams.priority);
  if (searchParams.campaign) exportParams.set('campaign', searchParams.campaign);
  const exportHref = exportParams.toString()
    ? `/api/admin/leads/export?${exportParams.toString()}`
    : '/api/admin/leads/export';
  const filterHref = (next: { status?: string; type?: string; source?: string; assigned?: string; priority?: string; campaign?: string }) => {
    const params = new URLSearchParams();
    const status = next.status !== undefined ? next.status : searchParams.status;
    const type = next.type !== undefined ? next.type : searchParams.type;
    const source = next.source !== undefined ? next.source : searchParams.source;
    const assigned = next.assigned !== undefined ? next.assigned : searchParams.assigned;
    const priority = next.priority !== undefined ? next.priority : searchParams.priority;
    const campaign = next.campaign !== undefined ? next.campaign : searchParams.campaign;
    if (status) params.set('status', status);
    if (type) params.set('type', type);
    if (source) params.set('source', source);
    if (assigned) params.set('assigned', assigned);
    if (priority) params.set('priority', priority);
    if (campaign) params.set('campaign', campaign);
    const queryString = params.toString();
    return queryString ? `/admin/leads?${queryString}` : '/admin/leads';
  };
  const campaignBuilderHref = (campaign: string) => {
    const params = new URLSearchParams();
    if (campaign !== 'Sans campagne') params.set('campaign', campaign);
    if (searchParams.source) params.set('source', searchParams.source);
    const queryString = params.toString();
    return queryString ? `/admin/leads/campaign-links?${queryString}` : '/admin/leads/campaign-links';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads lancement</h1>
          <p className="mt-1 text-sm text-gray-500">Capture et suivi des vendeurs, dealers, loueurs, acheteurs, locataires et partenaires.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/leads/action-board" className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
            Action board
          </Link>
          <Link href="/admin/leads/inventory" className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-100">
            File inventory
          </Link>
          <a href={exportHref} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
            Export CSV
          </a>
          <Link href="/admin/leads/import" className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
            Import CSV
          </Link>
          <Link href="/admin/leads/new" className="rounded-lg bg-[#1a3a6b] px-4 py-2 text-sm font-semibold text-white hover:bg-[#132a4d]">
            Nouveau lead
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="mt-1 text-sm text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">30 derniers jours</p>
              <h2 className="mt-1 font-bold text-gray-900">Performance</h2>
            </div>
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
              {totalMetricLeads} leads
            </span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-700">{openMetricLeads}</p>
              <p className="mt-1 text-xs text-gray-500">Ouverts</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700">{convertedMetricLeads}</p>
              <p className="mt-1 text-xs text-gray-500">Convertis</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{conversionRate}%</p>
              <p className="mt-1 text-xs text-gray-500">Conversion</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="font-bold text-gray-900">Sources</h2>
          <div className="mt-4 space-y-3">
            {topSources.length === 0 ? (
              <p className="text-sm text-gray-400">Aucune source recente.</p>
            ) : topSources.map(([source, count]) => {
              const percent = totalMetricLeads > 0 ? Math.round((count / totalMetricLeads) * 100) : 0;
              return (
                <Link key={source} href={filterHref({ source })} className="block">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">{SOURCE_LABELS[source] ?? source}</span>
                    <span className="text-gray-500">{count}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-gray-100">
                    <div className="h-2 rounded-full bg-[#1a3a6b]" style={{ width: `${percent}%` }} />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="font-bold text-gray-900">Campagnes</h2>
          <div className="mt-4 space-y-3">
            {topCampaigns.length === 0 ? (
              <p className="text-sm text-gray-400">Aucune campagne recente.</p>
            ) : topCampaigns.map(([campaign, count]) => (
              <div
                key={campaign}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  (searchParams.campaign === '__none' && campaign === 'Sans campagne') || searchParams.campaign === campaign
                    ? 'border-[#1a3a6b] bg-blue-50'
                    : 'border-gray-100'
                }`}
              >
                <Link
                  href={filterHref({ campaign: campaign === 'Sans campagne' ? '__none' : campaign })}
                  className="flex items-center justify-between hover:underline"
                >
                  <span className="font-medium text-gray-700">{campaign}</span>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">{count}</span>
                </Link>
                {campaign !== 'Sans campagne' && (
                  <Link
                    href={campaignBuilderHref(campaign)}
                    className="mt-2 inline-flex text-xs font-semibold text-[#1a3a6b] hover:underline"
                  >
                    Creer lien
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="font-bold text-gray-900">Demande par type</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {topTypes.length === 0 ? (
              <p className="text-sm text-gray-400">Aucun lead recent.</p>
            ) : topTypes.map(([type, count]) => (
              <Link
                key={type}
                href={`/admin/leads?type=${type}`}
                className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 text-sm hover:bg-gray-50"
              >
                <span className="font-medium text-gray-700">{TYPE_LABELS[type] ?? type}</span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">{count}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-gray-900">Performance campagnes</h2>
            <p className="mt-1 text-sm text-gray-500">Comparaison 30 jours: volume, conversion et relances dues.</p>
          </div>
          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
            {campaignPerformance.length} campagnes
          </span>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="py-2 pr-4 font-semibold">Campagne</th>
                <th className="py-2 pr-4 font-semibold">Total</th>
                <th className="py-2 pr-4 font-semibold">Ouverts</th>
                <th className="py-2 pr-4 font-semibold">Convertis</th>
                <th className="py-2 pr-4 font-semibold">Relances dues</th>
                <th className="py-2 pr-4 font-semibold">Taux</th>
                <th className="py-2 pr-4 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {campaignPerformance.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-gray-400">Aucune campagne recente.</td>
                </tr>
              ) : campaignPerformance.map((campaign) => (
                <tr key={campaign.campaign} className="hover:bg-gray-50">
                  <td className="py-3 pr-4">
                    <Link
                      href={filterHref({ campaign: campaign.campaign === 'Sans campagne' ? '__none' : campaign.campaign })}
                      className="font-semibold text-[#1a3a6b] hover:underline"
                    >
                      {campaign.campaign}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 text-gray-700">{campaign.total}</td>
                  <td className="py-3 pr-4 text-blue-700">{campaign.open}</td>
                  <td className="py-3 pr-4 text-green-700">{campaign.converted}</td>
                  <td className={`py-3 pr-4 ${campaign.due > 0 ? 'font-semibold text-red-600' : 'text-gray-500'}`}>{campaign.due}</td>
                  <td className="py-3 pr-4 font-semibold text-gray-900">{campaign.conversionRate}%</td>
                  <td className="py-3 pr-4">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/admin/leads/action-board?campaign=${encodeURIComponent(campaign.campaign === 'Sans campagne' ? '__none' : campaign.campaign)}`}
                        className="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        Board
                      </Link>
                      {campaign.campaign !== 'Sans campagne' && (
                        <Link
                          href={campaignBuilderHref(campaign.campaign)}
                          className="rounded-md border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-[#1a3a6b] hover:bg-blue-100"
                        >
                          Lien
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-gray-900">Resultats de suivi</h2>
            <p className="mt-1 text-sm text-gray-500">Outcomes enregistres dans les 30 derniers jours.</p>
          </div>
          {/* Counts activities that actually recorded an outcome, which is what
              this panel breaks down. It previously showed every activity row,
              so the total never matched the sum of the cards below it. */}
          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
            {recordedOutcomes} resultats
          </span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {topOutcomes.length === 0 ? (
            <p className="text-sm text-gray-400">Aucun resultat structure pour le moment.</p>
          ) : topOutcomes.map(([outcome, count]) => (
            <div key={outcome} className="rounded-xl border border-gray-100 px-4 py-3">
              <p className="text-sm font-semibold text-gray-900">{OUTCOME_LABELS[outcome] ?? outcome}</p>
              <p className="mt-2 text-2xl font-bold text-[#1a3a6b]">{count}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-gray-900">Charge equipe</h2>
            <p className="mt-1 text-sm text-gray-500">Leads ouverts par responsable, avec les relances dues.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={filterHref({ status: 'new_aging' })}
              className={`rounded-full border px-3 py-1.5 text-xs transition ${
                searchParams.status === 'new_aging'
                  ? 'border-orange-600 bg-orange-600 text-white'
                  : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Nouveaux &gt;24h ({agingNewLeads.length})
            </Link>
            <Link
              href={filterHref({ status: 'stale' })}
              className={`rounded-full border px-3 py-1.5 text-xs transition ${
                searchParams.status === 'stale'
                  ? 'border-rose-600 bg-rose-600 text-white'
                  : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Aging 7j+ ({staleWorkloadLeads})
            </Link>
            <Link
              href={filterHref({ assigned: 'me' })}
              className={`rounded-full border px-3 py-1.5 text-xs transition ${
                searchParams.assigned === 'me'
                  ? 'border-[#1a3a6b] bg-[#1a3a6b] text-white'
                  : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Mes leads
            </Link>
            <Link
              href={filterHref({ assigned: 'unassigned' })}
              className={`rounded-full border px-3 py-1.5 text-xs transition ${
                searchParams.assigned === 'unassigned'
                  ? 'border-red-600 bg-red-600 text-white'
                  : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Non assignes ({unassignedOpenLeads})
            </Link>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {workloadByStaff.map((member) => (
            <Link
              key={member.id}
              href={filterHref({ assigned: member.id })}
              className={`rounded-xl border px-4 py-3 transition hover:bg-gray-50 ${
                searchParams.assigned === member.id ? 'border-[#3d9e3d] bg-green-50' : 'border-gray-100 bg-white'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-gray-900">{member.name}</p>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">{member.open}</span>
              </div>
              <p className={`mt-2 text-xs ${member.due > 0 ? 'font-semibold text-red-600' : 'text-gray-400'}`}>
                {member.due} relance{member.due === 1 ? '' : 's'} due{member.due === 1 ? '' : 's'}
              </p>
            </Link>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <Link
            key={filter.value}
            href={filterHref({ status: filter.value })}
            className={`rounded-full border px-3 py-1.5 text-xs transition ${
              (searchParams.status ?? '') === filter.value
                ? 'border-[#1a3a6b] bg-[#1a3a6b] text-white'
                : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {TYPE_FILTERS.map((filter) => {
          return (
            <Link
              key={filter.value}
              href={filterHref({ type: filter.value })}
              className={`rounded-full border px-3 py-1.5 text-xs transition ${
                (searchParams.type ?? '') === filter.value
                  ? 'border-[#3d9e3d] bg-[#3d9e3d] text-white'
                  : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {filter.label}
            </Link>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        {SOURCE_FILTERS.map((filter) => (
          <Link
            key={filter.value}
            href={filterHref({ source: filter.value })}
            className={`rounded-full border px-3 py-1.5 text-xs transition ${
              (searchParams.source ?? '') === filter.value
                ? 'border-gray-900 bg-gray-900 text-white'
                : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {PRIORITY_FILTERS.map((filter) => (
          <Link
            key={filter.value}
            href={filterHref({ priority: filter.value })}
            className={`rounded-full border px-3 py-1.5 text-xs transition ${
              (searchParams.priority ?? '') === filter.value
                ? 'border-rose-600 bg-rose-600 text-white'
                : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      {searchParams.campaign && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm">
          <span className="font-medium text-blue-900">
            Campagne: {searchParams.campaign === '__none' ? 'Sans campagne' : searchParams.campaign}
          </span>
          <Link href={filterHref({ campaign: '' })} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100">
            Effacer
          </Link>
        </div>
      )}

      <form id="bulk-leads-form" action="/api/admin/leads/bulk" method="POST" className="rounded-2xl border border-gray-200 bg-white p-4">
        {leads.slice(0, 100).map((lead) => (
          <input key={lead.id} type="hidden" name="visible_lead_ids" value={lead.id} />
        ))}
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Actions groupees</p>
            <p className="mt-1 text-xs text-gray-400">Cochez les leads ou appliquez aux 100 premiers leads visibles.</p>
          </div>
          <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-1 text-xs">
            <label className="flex items-center gap-1 rounded-md px-2 py-1 text-gray-700">
              <input type="radio" name="selection_scope" value="selected" defaultChecked className="h-3 w-3" />
              Selection
            </label>
            <label className="flex items-center gap-1 rounded-md px-2 py-1 text-gray-700">
              <input type="radio" name="selection_scope" value="visible" className="h-3 w-3" />
              Visibles ({Math.min(leads.length, 100)})
            </label>
          </div>
          <select name="assigned_to" defaultValue="__no_change" className="rounded-lg border border-gray-300 px-3 py-2 text-xs">
            <option value="__no_change">Responsable inchange</option>
            <option value="">Non assigne</option>
            {staff.map((member) => (
              <option key={member.id} value={member.id}>
                {member.full_name ?? member.email}
              </option>
            ))}
          </select>
          <select name="status" defaultValue="__no_change" className="rounded-lg border border-gray-300 px-3 py-2 text-xs">
            <option value="__no_change">Statut inchange</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <select name="priority" defaultValue="__no_change" className="rounded-lg border border-gray-300 px-3 py-2 text-xs">
            <option value="__no_change">Priorite inchangee</option>
            <option value="low">Basse</option>
            <option value="normal">Normale</option>
            <option value="high">Haute</option>
          </select>
          <select name="campaign_action" defaultValue="__no_change" className="rounded-lg border border-gray-300 px-3 py-2 text-xs">
            <option value="__no_change">Campagne inchangee</option>
            <option value="set">Definir campagne</option>
            <option value="clear">Effacer campagne</option>
          </select>
          <input
            name="campaign_name"
            placeholder="Nom campagne"
            className="rounded-lg border border-gray-300 px-3 py-2 text-xs"
          />
          <select name="follow_up_preset" defaultValue="__no_change" className="rounded-lg border border-gray-300 px-3 py-2 text-xs">
            <option value="__no_change">Relance inchangee</option>
            <option value="later_today">Plus tard</option>
            <option value="tomorrow">Demain</option>
            <option value="three_days">Dans 3j</option>
            <option value="next_week">Semaine pro.</option>
            <option value="clear">Effacer relance</option>
          </select>
          <select name="activity_template" defaultValue="__no_change" className="rounded-lg border border-gray-300 px-3 py-2 text-xs">
            <option value="__no_change">Aucun log rapide</option>
            {QUICK_LEAD_ACTIVITY_TEMPLATES.map((template) => (
              <option key={template.id} value={template.id}>{template.label}</option>
            ))}
          </select>
          <button type="submit" className="rounded-lg bg-[#1a3a6b] px-4 py-2 text-xs font-semibold text-white hover:bg-[#132a4d]">
            Appliquer
          </button>
        </div>
      </form>

      <TruncationNotice shown={leads.length} total={matchingLeadCount} noun="leads" />

            <div className="space-y-3">
        {leads.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-400">
            Aucun lead a afficher.
          </div>
        ) : leads.map((lead) => {
          const statusColor = STATUS_COLORS[lead.status] ?? 'bg-gray-100 text-gray-600';
          const sla = leadSla(lead);
          const conversionChecklist = CONVERSION_CHECKLISTS[lead.lead_type] ?? CONVERSION_CHECKLISTS.other;
          const whatsappMessage = buildLeadOutreachMessage(lead);
          return (
            <div key={lead.id} className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 gap-3">
                  <input
                    form="bulk-leads-form"
                    type="checkbox"
                    name="lead_ids"
                    value={lead.id}
                    aria-label={`Selectionner ${lead.business_name || lead.name}`}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-[#1a3a6b]"
                  />
                  <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-bold text-gray-900">{lead.business_name || lead.name}</h2>
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                      {TYPE_LABELS[lead.lead_type] ?? lead.lead_type}
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusColor}`}>
                      {STATUS_LABELS[lead.status] ?? lead.status}
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${sla.className}`}>
                      {sla.label}
                    </span>
                  </div>
                  {lead.business_name && <p className="mt-1 text-sm text-gray-500">Contact: {lead.name}</p>}
                  <p className="mt-1 text-xs text-gray-500">
                    {lead.phone ?? '-'}{lead.email ? ` - ${lead.email}` : ''}{lead.city ? ` - ${lead.city}` : ''}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Link
                      href={`/admin/leads/${lead.id}`}
                      className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Detail
                    </Link>
                    {lead.phone && (
                      <>
                        <a
                          href={`tel:${lead.phone}`}
                          className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Appeler
                        </a>
                        <a
                          href={buildContactUrl(lead.phone, whatsappMessage)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-md border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-100"
                        >
                          WhatsApp
                        </a>
                      </>
                    )}
                    {lead.email && (
                      <a
                        href={`mailto:${lead.email}?subject=${encodeURIComponent('Suivi MotoPayee')}&body=${encodeURIComponent(whatsappMessage)}`}
                        className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                      >
                        Email
                      </a>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    Source: {lead.source}{lead.campaign_name ? ` - Campagne: ${lead.campaign_name}` : ''} - Cree le {new Date(lead.created_at).toLocaleDateString('fr-FR')} - MAJ {new Date(lead.updated_at).toLocaleDateString('fr-FR')}
                  </p>
                  </div>
                </div>
                <div className="text-right text-xs text-gray-500">
                  <p>Priorite: {lead.priority}</p>
                  <p>Assigne: {lead.assigned?.full_name ?? lead.assigned?.email ?? '-'}</p>
                  <p>Relance: {lead.next_follow_up_at ? new Date(lead.next_follow_up_at).toLocaleDateString('fr-FR') : '-'}</p>
                </div>
              </div>

              {lead.interest && <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">{lead.interest}</p>}

              <div className="mt-3 flex flex-wrap gap-2">
                {QUICK_LEAD_ACTIVITY_TEMPLATES.slice(0, 4).map((template) => (
                  <form key={template.id} action={`/api/admin/leads/${lead.id}/activities`} method="POST">
                    <input type="hidden" name="action" value={template.action} />
                    <input type="hidden" name="outcome" value={template.outcome} />
                    <input type="hidden" name="follow_up_preset" value={template.followUpPreset} />
                    <input type="hidden" name="summary" value={template.summary} />
                    <button type="submit" className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50">
                      {template.label}
                    </button>
                  </form>
                ))}
              </div>

              {lead.activities && lead.activities.length > 0 && (
                <div className="mt-3 rounded-xl border border-gray-100 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Historique</p>
                  <div className="mt-2 space-y-2">
                    {[...lead.activities]
                      .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
                      .slice(0, 3)
                      .map((activity) => (
                        <div key={activity.id} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <span className="text-gray-700">
                            {activity.summary ?? activity.action}
                            {activity.meta?.outcome && OUTCOME_LABELS[activity.meta.outcome] && (
                              <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                                {OUTCOME_LABELS[activity.meta.outcome]}
                              </span>
                            )}
                            <span className="text-gray-400">
                              {' '}par {activity.actor?.full_name ?? activity.actor?.email ?? 'staff'}
                            </span>
                          </span>
                          <span className="text-gray-400">{new Date(activity.created_at).toLocaleDateString('fr-FR')}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <form action={`/api/admin/leads/${lead.id}/activities`} method="POST" className="mt-3 grid gap-2 rounded-xl border border-gray-100 bg-gray-50 p-3 md:grid-cols-[120px_140px_125px_1fr_180px_100px]">
                <select name="action" defaultValue="call" className="rounded-lg border border-gray-300 px-3 py-2 text-xs">
                  {ACTIVITY_ACTIONS.map((action) => (
                    <option key={action.value} value={action.value}>{action.label}</option>
                  ))}
                </select>
                <select name="outcome" defaultValue="" className="rounded-lg border border-gray-300 px-3 py-2 text-xs">
                  {ACTIVITY_OUTCOMES.map((outcome) => (
                    <option key={outcome.value || 'none'} value={outcome.value}>{outcome.label}</option>
                  ))}
                </select>
                <select name="follow_up_preset" defaultValue="" className="rounded-lg border border-gray-300 px-3 py-2 text-xs">
                  {FOLLOW_UP_PRESETS.map((preset) => (
                    <option key={preset.value || 'none'} value={preset.value}>{preset.label}</option>
                  ))}
                </select>
                <input
                  name="summary"
                  placeholder="Ex: Appel effectue, interesse, demande photos et prix final"
                  className="rounded-lg border border-gray-300 px-3 py-2 text-xs"
                  required
                />
                <input
                  type="datetime-local"
                  name="next_follow_up_at"
                  defaultValue={lead.next_follow_up_at ? lead.next_follow_up_at.slice(0, 16) : ''}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-xs"
                />
                <button type="submit" className="rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white hover:bg-gray-800">
                  Ajouter
                </button>
              </form>

              <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Conversion</p>
                    {lead.converted_entity_type ? (
                      <p className="mt-1 text-xs text-green-700">
                        Converti en {lead.converted_entity_type}{lead.converted_entity_id ? ` - ${lead.converted_entity_id}` : ''}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-gray-500">Lier ce lead a l&apos;objet cree quand il devient operationnel.</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {['seller', 'dealer'].includes(lead.lead_type) ? (
                      <form action={`/api/admin/leads/${lead.id}/profile`} method="POST">
                        <input type="hidden" name="role" value={lead.lead_type === 'dealer' ? 'seller_dealer' : 'seller_individual'} />
                        <input type="hidden" name="next" value="sale_listing" />
                        <button type="submit" className="rounded-md bg-gray-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-gray-800">
                          Creer profil + vente
                        </button>
                      </form>
                    ) : null}
                    {lead.lead_type === 'rental_owner' ? (
                      <form action={`/api/admin/leads/${lead.id}/profile`} method="POST">
                        <input type="hidden" name="role" value="seller_individual" />
                        <input type="hidden" name="next" value="hire_listing" />
                        <button type="submit" className="rounded-md bg-gray-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-gray-800">
                          Creer profil + location
                        </button>
                      </form>
                    ) : null}
                    {(CONVERSION_ACTIONS[lead.lead_type] ?? CONVERSION_ACTIONS.other ?? []).map((action) => (
                      <Link
                        key={action.href}
                        href={action.href}
                        className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        {action.label}
                      </Link>
                    ))}
                  </div>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {conversionChecklist.slice(0, 2).map((step) => (
                    <div key={step} className="flex gap-2 rounded-lg border border-green-100 bg-green-50 px-3 py-2 text-xs text-green-900">
                      <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-600" />
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
                <form action={`/api/admin/leads/${lead.id}`} method="POST" className="mt-3 grid gap-2 md:grid-cols-[160px_1fr_110px]">
                  <input type="hidden" name="status" value="converted" />
                  <select name="converted_entity_type" defaultValue={lead.converted_entity_type ?? ''} className="rounded-lg border border-gray-300 px-3 py-2 text-xs">
                    <option value="">Type conversion</option>
                    <option value="profile">Profil</option>
                    <option value="dealer">Dealer</option>
                    <option value="listing">Annonce vente</option>
                    <option value="hire_listing">Annonce location</option>
                    <option value="mfi_institution">Institution IMF</option>
                    <option value="inspection_request">Inspection</option>
                    <option value="financing_application">Dossier finance</option>
                    <option value="other">Autre</option>
                  </select>
                  <input
                    name="converted_entity_id"
                    defaultValue={lead.converted_entity_id ?? ''}
                    placeholder="ID de l'objet cree (optionnel)"
                    className="rounded-lg border border-gray-300 px-3 py-2 text-xs"
                  />
                  <button type="submit" className="rounded-lg bg-[#3d9e3d] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2d8a2d]">
                    Convertir
                  </button>
                </form>
              </div>

              <form action={`/api/admin/leads/${lead.id}`} method="POST" className="mt-3 grid gap-3 md:grid-cols-6">
                <select name="status" defaultValue={lead.status} className="rounded-lg border border-gray-300 px-3 py-2 text-xs">
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <select name="priority" defaultValue={lead.priority} className="rounded-lg border border-gray-300 px-3 py-2 text-xs">
                  <option value="low">Basse</option>
                  <option value="normal">Normale</option>
                  <option value="high">Haute</option>
                </select>
                <select name="assigned_to" defaultValue={lead.assigned_to ?? ''} className="rounded-lg border border-gray-300 px-3 py-2 text-xs">
                  <option value="">Non assigne</option>
                  {staff.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.full_name ?? member.email}
                    </option>
                  ))}
                </select>
                <input
                  type="datetime-local"
                  name="next_follow_up_at"
                  defaultValue={lead.next_follow_up_at ? lead.next_follow_up_at.slice(0, 16) : ''}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-xs"
                />
                <input
                  name="campaign_name"
                  defaultValue={lead.campaign_name ?? ''}
                  placeholder="Campagne"
                  className="rounded-lg border border-gray-300 px-3 py-2 text-xs"
                />
                <button type="submit" className="rounded-lg bg-[#1a3a6b] px-3 py-2 text-xs font-semibold text-white hover:bg-[#132a4d]">
                  Mettre a jour
                </button>
                <textarea
                  name="notes"
                  defaultValue={lead.notes ?? ''}
                  placeholder="Notes de suivi"
                  rows={2}
                  className="md:col-span-6 rounded-lg border border-gray-300 px-3 py-2 text-xs"
                />
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}

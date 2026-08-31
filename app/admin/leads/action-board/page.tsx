import { supabaseAdmin } from '@/lib/auth/server';
import { requireAdminPage } from '@/lib/auth/admin-access';
import { buildContactUrl } from '@/lib/whatsapp';
import { QUICK_LEAD_ACTIVITY_TEMPLATES, buildLeadOutreachMessage } from '@/lib/launch-lead-playbooks';
import Link from 'next/link';
import TruncationNotice from '../../../(components)/TruncationNotice';

const OPEN_STATUSES = ['new', 'contacted', 'interested', 'qualified', 'awaiting_assets', 'ready_for_listing', 'onboarding'];

/** Leads the board renders. The heading shows the true matching count. */
const ACTION_BOARD_LIMIT = 300;

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
  not_fit: 'Pas adapte',
  closed: 'Clos',
};

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
  assigned_to: string | null;
  next_follow_up_at: string | null;
  created_at: string;
  updated_at: string;
  assigned?: { full_name: string | null; email: string | null } | null;
};

type StaffRow = {
  id: string;
  full_name: string | null;
  email: string;
};

function ageInDays(date: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / (24 * 60 * 60 * 1000)));
}

function LeadActionCard({ lead, staff }: { lead: LeadRow; staff: StaffRow[] }) {
  const whatsappMessage = buildLeadOutreachMessage(lead);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/admin/leads/${lead.id}`} className="font-semibold text-gray-900 hover:text-[#1a3a6b]">
              {lead.business_name || lead.name}
            </Link>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
              {TYPE_LABELS[lead.lead_type] ?? lead.lead_type}
            </span>
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
              {STATUS_LABELS[lead.status] ?? lead.status}
            </span>
            {lead.priority === 'high' && (
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">Haute priorite</span>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {lead.phone ?? '-'}{lead.email ? ` - ${lead.email}` : ''}{lead.city ? ` - ${lead.city}` : ''}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Source: {lead.source}{lead.campaign_name ? ` - campagne: ${lead.campaign_name}` : ''} - age {ageInDays(lead.created_at)}j - assigne: {lead.assigned?.full_name ?? lead.assigned?.email ?? '-'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {lead.phone && (
            <>
              <a href={`tel:${lead.phone}`} className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50">
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

      <form action={`/api/admin/leads/${lead.id}`} method="POST" className="mt-3 grid gap-2 md:grid-cols-[1fr_135px_130px_120px]">
        <select name="assigned_to" defaultValue={lead.assigned_to ?? ''} className="rounded-lg border border-gray-300 px-3 py-2 text-xs">
          <option value="">Non assigne</option>
          {staff.map((member) => (
            <option key={member.id} value={member.id}>
              {member.full_name ?? member.email}
            </option>
          ))}
        </select>
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
        <button type="submit" className="rounded-lg border border-[#1a3a6b] px-3 py-2 text-xs font-semibold text-[#1a3a6b] hover:bg-blue-50">
          Sauver
        </button>
      </form>

      <form action={`/api/admin/leads/${lead.id}/activities`} method="POST" className="mt-3 grid gap-2 md:grid-cols-[110px_135px_125px_1fr_165px_90px]">
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
          placeholder="Resume de l'action"
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
          Log
        </button>
      </form>
    </div>
  );
}

function BoardSection({
  title,
  description,
  href,
  leads,
  staff,
}: {
  title: string;
  description: string;
  href: string;
  leads: LeadRow[];
  staff: StaffRow[];
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-gray-900">{title}</h2>
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        </div>
        <Link href={href} className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200">
          {leads.length} lead{leads.length === 1 ? '' : 's'}
        </Link>
      </div>
      <div className="mt-4 space-y-3">
        {leads.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-200 py-6 text-center text-sm text-gray-400">Aucun lead dans cette file.</p>
        ) : leads.slice(0, 8).map((lead) => (
          <LeadActionCard key={lead.id} lead={lead} staff={staff} />
        ))}
      </div>
    </section>
  );
}

export default async function LeadActionBoardPage({
  searchParams,
}: {
  searchParams: { scope?: string; campaign?: string };
}) {
  const user = await requireAdminPage('leads');
  const isMine = searchParams.scope === 'mine';
  const campaignParam = searchParams.campaign;
  const campaignListQuery = campaignParam ? `&campaign=${encodeURIComponent(campaignParam)}` : '';

  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  // The campaign and "mine" filters used to run in JavaScript over every open
  // lead. They have to move into the query before the list can be bounded at
  // all: capping first and filtering afterwards would return some arbitrary
  // subset of the cap, not the newest N matches.
  let leadQuery = supabaseAdmin
    .from('launch_leads')
    .select('*, assigned:profiles!assigned_to(full_name, email)', { count: 'exact' })
    .in('status', OPEN_STATUSES);

  if (campaignParam === '__none') {
    leadQuery = leadQuery.is('campaign_name', null);
  } else if (campaignParam) {
    leadQuery = leadQuery.eq('campaign_name', campaignParam);
  }

  if (isMine) {
    leadQuery = leadQuery.eq('assigned_to', user.id);
  }

  const [{ data, count: matchingLeadCount }, { data: staffData }] = await Promise.all([
    leadQuery
      .order('next_follow_up_at', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })
      .limit(ACTION_BOARD_LIMIT),
    supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, role')
      .in('role', ['field_agent', 'inspector', 'verifier', 'admin'])
      .eq('status', 'active')
      .order('full_name'),
  ]);

  const leads = (data ?? []) as unknown as LeadRow[];
  const staff = (staffData ?? []) as StaffRow[];
  const unassigned = leads.filter((lead) => !lead.assigned_to);
  const overdue = leads.filter((lead) => lead.next_follow_up_at && new Date(lead.next_follow_up_at) <= now);
  const dueToday = leads.filter((lead) => {
    if (!lead.next_follow_up_at) return false;
    const followUp = new Date(lead.next_follow_up_at);
    return followUp > now && followUp <= endOfDay;
  });
  const sevenDaysFromNow = new Date(endOfDay);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  const upcoming = leads.filter((lead) => {
    if (!lead.next_follow_up_at) return false;
    const followUp = new Date(lead.next_follow_up_at);
    return followUp > endOfDay && followUp <= sevenDaysFromNow;
  });
  const agingNew = leads.filter((lead) => lead.status === 'new' && ageInDays(lead.created_at) >= 1);
  const highPriority = leads.filter((lead) => lead.priority === 'high');
  const assignedFilter = `${isMine ? '&assigned=me' : ''}${campaignListQuery}`;
  const boardHref = (scope?: 'mine') => {
    const params = new URLSearchParams();
    if (scope) params.set('scope', scope);
    if (campaignParam) params.set('campaign', campaignParam);
    const query = params.toString();
    return query ? `/admin/leads/action-board?${query}` : '/admin/leads/action-board';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Action board leads</h1>
          <p className="mt-1 text-sm text-gray-500">
            {isMine
              ? 'Vue quotidienne de vos leads assignes.'
              : 'Vue quotidienne pour assigner, appeler, relancer et nettoyer le pipeline lancement.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={boardHref()}
            className={`rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-gray-50 ${
              isMine ? 'border-gray-200 bg-white text-gray-700' : 'border-[#1a3a6b] bg-[#1a3a6b] text-white hover:bg-[#132a4d]'
            }`}
          >
            Equipe
          </Link>
          <Link
            href={boardHref('mine')}
            className={`rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-gray-50 ${
              isMine ? 'border-[#1a3a6b] bg-[#1a3a6b] text-white hover:bg-[#132a4d]' : 'border-gray-200 bg-white text-gray-700'
            }`}
          >
            Mes leads
          </Link>
          <Link href="/admin/leads" className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
            File complete
          </Link>
          <Link href="/admin/leads/new" className="rounded-lg bg-[#1a3a6b] px-4 py-2 text-sm font-semibold text-white hover:bg-[#132a4d]">
            Nouveau lead
          </Link>
        </div>
      </div>

      <TruncationNotice shown={leads.length} total={matchingLeadCount} noun="leads ouverts" />

      {campaignParam && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm">
          <span className="font-medium text-blue-900">
            Campagne: {campaignParam === '__none' ? 'Sans campagne' : campaignParam}
          </span>
          <Link href={isMine ? '/admin/leads/action-board?scope=mine' : '/admin/leads/action-board'} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100">
            Effacer
          </Link>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        {[
          ...(!isMine ? [{ label: 'Non assignes', value: unassigned.length, color: 'text-red-600', href: `/admin/leads?assigned=unassigned${campaignListQuery}` }] : []),
          { label: 'En retard', value: overdue.length, color: 'text-red-700', href: `/admin/leads?status=due${assignedFilter}` },
          { label: 'A faire aujourd hui', value: dueToday.length, color: 'text-blue-700', href: `/admin/leads?status=today${assignedFilter}` },
          { label: '7 prochains jours', value: upcoming.length, color: 'text-indigo-700', href: `/admin/leads?status=upcoming${assignedFilter}` },
          { label: 'Nouveaux >24h', value: agingNew.length, color: 'text-orange-600', href: `/admin/leads?status=new_aging${assignedFilter}` },
          { label: 'Haute priorite', value: highPriority.length, color: 'text-rose-700', href: `/admin/leads?priority=high${assignedFilter}` },
        ].map((stat) => (
          <Link key={stat.label} href={stat.href} className="rounded-2xl border border-gray-200 bg-white p-5 hover:bg-gray-50">
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="mt-1 text-sm text-gray-500">{stat.label}</p>
          </Link>
        ))}
      </div>

      <div className="space-y-5">
        {!isMine && (
          <BoardSection
            title="Non assignes"
            description="Premier tri: attribuer ou contacter rapidement avant que les leads se perdent."
            href={`/admin/leads?assigned=unassigned${campaignListQuery}`}
            leads={unassigned}
            staff={staff}
          />
        )}
        <BoardSection
          title="Relances en retard"
          description="A traiter avant toute autre prospection."
          href={`/admin/leads?status=due${assignedFilter}`}
          leads={overdue}
          staff={staff}
        />
        <BoardSection
          title="A faire aujourd hui"
          description="Relances planifiees avant la fin de journee."
          href={`/admin/leads?status=today${assignedFilter}`}
          leads={dueToday}
          staff={staff}
        />
        <BoardSection
          title="7 prochains jours"
          description="Relances planifiees apres aujourd hui, a preparer avant qu'elles deviennent urgentes."
          href={`/admin/leads?status=upcoming${assignedFilter}`}
          leads={upcoming}
          staff={staff}
        />
        <BoardSection
          title="Nouveaux >24h"
          description="Nouveaux contacts qui n'ont pas encore assez avance."
          href={`/admin/leads?status=new_aging${assignedFilter}`}
          leads={agingNew}
          staff={staff}
        />
        <BoardSection
          title="Haute priorite"
          description="Leads a fort potentiel ou urgents, peu importe leur source."
          href={`/admin/leads?priority=high${assignedFilter}`}
          leads={highPriority}
          staff={staff}
        />
      </div>
    </div>
  );
}

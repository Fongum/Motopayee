import { getCurrentUser, supabaseAdmin } from '@/lib/auth/server';
import { buildContactUrl } from '@/lib/whatsapp';
import { QUICK_LEAD_ACTIVITY_TEMPLATES, buildLeadOutreachMessage } from '@/lib/launch-lead-playbooks';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

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

const OPEN_STATUSES = ['new', 'contacted', 'interested', 'qualified', 'awaiting_assets', 'ready_for_listing', 'onboarding'];

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

const ACTIVITY_LABELS: Record<string, string> = {
  created: 'Creation',
  updated: 'Mise a jour',
  converted: 'Conversion',
  profile_created: 'Profil cree',
  call: 'Appel',
  whatsapp: 'WhatsApp',
  email: 'Email',
  meeting: 'Rendez-vous',
  documents: 'Documents',
  checklist: 'Checklist',
  note: 'Note',
  other: 'Autre',
};

const OUTCOME_LABELS: Record<string, string> = Object.fromEntries(
  ACTIVITY_OUTCOMES.filter((outcome) => outcome.value).map((outcome) => [outcome.value, outcome.label])
);

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
    'Confirmer identite, telephone et droit de vendre le vehicule.',
    'Collecter carte grise, photos, prix souhaite et localisation.',
    'Creer ou lier le profil vendeur puis ouvrir une annonce vente.',
    'Demander inspection ou verification avant publication.',
  ],
  dealer: [
    'Verifier nom commercial, responsable, localisation et volume potentiel.',
    'Presenter le pilote gratuit et les regles de publication MotoPayee.',
    'Creer ou lier le profil dealer puis planifier import du stock.',
    'Definir cadence de suivi et opportunites de financement/location.',
  ],
  rental_owner: [
    'Verifier proprietaire, vehicule, disponibilites, tarifs et caution.',
    'Collecter documents utiles, photos et conditions de location.',
    'Creer ou lier une annonce location.',
    'Confirmer processus de reservation, paiement et remise du vehicule.',
  ],
  buyer: [
    'Qualifier budget, ville, delai d achat et type de vehicule recherche.',
    'Verifier si le besoin demande financement ou achat cash.',
    'Associer une annonce finance eligible quand possible.',
    'Creer ou lier le dossier de financement et suivre les documents.',
  ],
  renter: [
    'Confirmer dates, ville, type de vehicule et permis de conduire.',
    'Proposer des vehicules disponibles et clarifier caution/paiement.',
    'Creer ou lier une reservation location.',
    'Planifier remise, verification et suivi de retour.',
  ],
  mfi: [
    'Identifier decisionnaire, produits credit, zones et criteres dossiers.',
    'Valider documents requis, delais de reponse et mode de competition.',
    'Creer ou lier le partenaire IMF.',
    'Aligner commission, reporting et workflow de reponse aux demandes.',
  ],
  inspection: [
    'Confirmer vehicule, localisation, contact et besoin de verification.',
    'Collecter frais ou accord de paiement inspection.',
    'Creer ou lier la demande inspection.',
    'Assigner inspecteur et publier le resume de confiance.',
  ],
  other: [
    'Clarifier objectif commercial du lead.',
    'Assigner un responsable interne.',
    'Definir prochaine action et date de relance.',
    'Convertir vers l objet MotoPayee correspondant une fois cree.',
  ],
};

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
  intake_checklist: Record<string, { checked?: boolean; note?: string | null; updated_at?: string; updated_by?: string | null }> | null;
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

interface PageProps { params: { id: string } }

function ageInDays(date: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / (24 * 60 * 60 * 1000)));
}

function checklistKey(step: string) {
  return step
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 72);
}

function leadSla(lead: Pick<LeadRow, 'status' | 'created_at' | 'next_follow_up_at'>) {
  const ageDays = ageInDays(lead.created_at);
  if (lead.next_follow_up_at && new Date(lead.next_follow_up_at) <= new Date()) {
    return { label: 'Relance due', className: 'bg-red-50 text-red-700' };
  }
  if (lead.status === 'new' && ageDays >= 1) {
    return { label: `Nouveau ${ageDays}j`, className: 'bg-orange-50 text-orange-700' };
  }
  if (OPEN_STATUSES.includes(lead.status) && ageDays >= 7) {
    return { label: `Aging ${ageDays}j`, className: 'bg-rose-50 text-rose-700' };
  }
  return { label: `${ageDays}j`, className: 'bg-gray-100 text-gray-600' };
}

export default async function AdminLeadDetailPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const [{ data: leadData }, { data: staffData }] = await Promise.all([
    supabaseAdmin
      .from('launch_leads')
      .select('*, assigned:profiles!assigned_to(full_name, email), activities:launch_lead_activities(id, action, summary, meta, created_at, actor:profiles!actor_id(full_name, email))')
      .eq('id', params.id)
      .single(),
    supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, role')
      .in('role', ['field_agent', 'inspector', 'verifier', 'admin'])
      .eq('status', 'active')
      .order('full_name'),
  ]);

  if (!leadData) notFound();

  const lead = leadData as unknown as LeadRow;
  const staff = (staffData ?? []) as Array<{ id: string; full_name: string | null; email: string; role: string }>;
  const activities = [...(lead.activities ?? [])].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  const statusColor = STATUS_COLORS[lead.status] ?? 'bg-gray-100 text-gray-600';
  const sla = leadSla(lead);
  const conversionChecklist = CONVERSION_CHECKLISTS[lead.lead_type] ?? CONVERSION_CHECKLISTS.other;
  const intakeChecklist = lead.intake_checklist ?? {};
  const completedChecklistItems = conversionChecklist.filter((step) => intakeChecklist[checklistKey(step)]?.checked).length;
  const whatsappMessage = buildLeadOutreachMessage(lead);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/leads" className="text-sm font-medium text-[#1a3a6b] hover:underline">
            Retour leads
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{lead.business_name || lead.name}</h1>
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
        </div>
        <div className="flex flex-wrap gap-2">
          {lead.phone && (
            <>
              <a href={`tel:${lead.phone}`} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                Appeler
              </a>
              <a
                href={buildContactUrl(lead.phone, whatsappMessage)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-100"
              >
                WhatsApp
              </a>
            </>
          )}
          {lead.email && (
            <a
              href={`mailto:${lead.email}?subject=${encodeURIComponent('Suivi MotoPayee')}&body=${encodeURIComponent(whatsappMessage)}`}
              className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
            >
              Email
            </a>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Telephone</p>
          <p className="mt-2 text-sm font-medium text-gray-900">{lead.phone ?? '-'}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Ville</p>
          <p className="mt-2 text-sm font-medium text-gray-900">{lead.city ?? '-'}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Relance</p>
          <p className="mt-2 text-sm font-medium text-gray-900">{lead.next_follow_up_at ? new Date(lead.next_follow_up_at).toLocaleString('fr-FR') : '-'}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Assigne</p>
          <p className="mt-2 text-sm font-medium text-gray-900">{lead.assigned?.full_name ?? lead.assigned?.email ?? '-'}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Age</p>
          <p className="mt-2 text-sm font-medium text-gray-900">{ageInDays(lead.created_at)} jour{ageInDays(lead.created_at) === 1 ? '' : 's'}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <section className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-bold text-gray-900">Besoin et notes</h2>
            <dl className="mt-4 space-y-4 text-sm">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Interet</dt>
                <dd className="mt-1 text-gray-800">{lead.interest ?? '-'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Notes internes</dt>
                <dd className="mt-1 whitespace-pre-wrap text-gray-800">{lead.notes ?? '-'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Source</dt>
                <dd className="mt-1 text-gray-800">
                  {lead.source} - cree le {new Date(lead.created_at).toLocaleString('fr-FR')} - MAJ {new Date(lead.updated_at).toLocaleString('fr-FR')}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Campagne</dt>
                <dd className="mt-1 text-gray-800">{lead.campaign_name ?? '-'}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-blue-950">Script de contact</h2>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-blue-700">
                {TYPE_LABELS[lead.lead_type] ?? lead.lead_type}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-blue-950">{whatsappMessage}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {lead.phone && (
                <a
                  href={buildContactUrl(lead.phone, whatsappMessage)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700"
                >
                  Ouvrir WhatsApp
                </a>
              )}
              {lead.email && (
                <a
                  href={`mailto:${lead.email}?subject=${encodeURIComponent('Suivi MotoPayee')}&body=${encodeURIComponent(whatsappMessage)}`}
                  className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                >
                  Ouvrir email
                </a>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-gray-900">Historique complet</h2>
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                {activities.length} activites
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {activities.length === 0 ? (
                <p className="text-sm text-gray-400">Aucune activite enregistree.</p>
              ) : activities.map((activity) => (
                <div key={activity.id} className="border-l-2 border-gray-200 pl-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900">{ACTIVITY_LABELS[activity.action] ?? activity.action}</p>
                      {activity.meta?.outcome && OUTCOME_LABELS[activity.meta.outcome] && (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                          {OUTCOME_LABELS[activity.meta.outcome]}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">{new Date(activity.created_at).toLocaleString('fr-FR')}</p>
                  </div>
                  <p className="mt-1 text-sm text-gray-700">{activity.summary ?? '-'}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    Par {activity.actor?.full_name ?? activity.actor?.email ?? 'staff'}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-bold text-gray-900">Logs rapides</h2>
            <div className="mt-3 grid gap-2">
              {QUICK_LEAD_ACTIVITY_TEMPLATES.map((template) => (
                <form key={template.id} action={`/api/admin/leads/${lead.id}/activities`} method="POST">
                  <input type="hidden" name="action" value={template.action} />
                  <input type="hidden" name="outcome" value={template.outcome} />
                  <input type="hidden" name="follow_up_preset" value={template.followUpPreset} />
                  <input type="hidden" name="summary" value={template.summary} />
                  <button type="submit" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-50">
                    {template.label}
                  </button>
                </form>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-bold text-gray-900">Ajouter une activite</h2>
            <form action={`/api/admin/leads/${lead.id}/activities`} method="POST" className="mt-4 space-y-3">
              <select name="action" defaultValue="call" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                {ACTIVITY_ACTIONS.map((action) => (
                  <option key={action.value} value={action.value}>{action.label}</option>
                ))}
              </select>
              <select name="outcome" defaultValue="" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                {ACTIVITY_OUTCOMES.map((outcome) => (
                  <option key={outcome.value || 'none'} value={outcome.value}>{outcome.label}</option>
                ))}
              </select>
              <select name="follow_up_preset" defaultValue="" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                {FOLLOW_UP_PRESETS.map((preset) => (
                  <option key={preset.value || 'none'} value={preset.value}>{preset.label}</option>
                ))}
              </select>
              <textarea
                name="summary"
                placeholder="Resume du suivi"
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                required
              />
              <input
                type="datetime-local"
                name="next_follow_up_at"
                defaultValue={lead.next_follow_up_at ? lead.next_follow_up_at.slice(0, 16) : ''}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <button type="submit" className="w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800">
                Enregistrer activite
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-bold text-gray-900">Mettre a jour</h2>
            <form action={`/api/admin/leads/${lead.id}`} method="POST" className="mt-4 space-y-3">
              <select name="status" defaultValue={lead.status} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <select name="priority" defaultValue={lead.priority} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                <option value="low">Basse</option>
                <option value="normal">Normale</option>
                <option value="high">Haute</option>
              </select>
              <select name="assigned_to" defaultValue={lead.assigned_to ?? ''} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
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
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                name="campaign_name"
                defaultValue={lead.campaign_name ?? ''}
                placeholder="Campagne"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <textarea
                name="notes"
                defaultValue={lead.notes ?? ''}
                placeholder="Notes internes"
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <button type="submit" className="w-full rounded-lg bg-[#1a3a6b] px-4 py-2 text-sm font-semibold text-white hover:bg-[#132a4d]">
                Mettre a jour
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-bold text-gray-900">Conversion</h2>
            <div className="mt-3 rounded-xl border border-green-100 bg-green-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-green-800">Checklist operationnelle</p>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-green-800">
                  {completedChecklistItems}/{conversionChecklist.length}
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {conversionChecklist.map((step) => {
                  const itemKey = checklistKey(step);
                  const item = intakeChecklist[itemKey];
                  const checked = Boolean(item?.checked);
                  return (
                    <form key={itemKey} action={`/api/admin/leads/${lead.id}/checklist`} method="POST" className="rounded-lg border border-green-100 bg-white p-2">
                      <input type="hidden" name="item_key" value={itemKey} />
                      <input type="hidden" name="checked" value={checked ? 'false' : 'true'} />
                      <div className="flex items-start gap-2">
                        <button
                          type="submit"
                          className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border text-xs font-bold ${
                            checked
                              ? 'border-green-600 bg-green-600 text-white'
                              : 'border-gray-300 bg-white text-transparent hover:border-green-600'
                          }`}
                          aria-label={checked ? `Rouvrir ${step}` : `Completer ${step}`}
                        >
                          ✓
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm ${checked ? 'font-medium text-green-950' : 'text-green-900'}`}>{step}</p>
                          {item?.updated_at && (
                            <p className="mt-0.5 text-[11px] text-green-700">
                              MAJ {new Date(item.updated_at).toLocaleString('fr-FR')}
                            </p>
                          )}
                          <input
                            name="note"
                            defaultValue={item?.note ?? ''}
                            placeholder="Note optionnelle"
                            className="mt-2 w-full rounded-md border border-green-100 px-2 py-1 text-xs text-gray-700"
                          />
                        </div>
                      </div>
                    </form>
                  );
                })}
              </div>
              <form action={`/api/admin/leads/${lead.id}`} method="POST" className="mt-3 grid gap-2 sm:grid-cols-2">
                <input type="hidden" name="status" value="awaiting_assets" />
                <button type="submit" className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-800 hover:bg-orange-100">
                  Marquer attente photos/docs
                </button>
              </form>
              <form action={`/api/admin/leads/${lead.id}`} method="POST" className="mt-2">
                <input type="hidden" name="status" value="ready_for_listing" />
                <button type="submit" className="w-full rounded-lg bg-teal-600 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-700">
                  Marquer pret listing
                </button>
              </form>
            </div>
            {lead.converted_entity_type ? (
              <p className="mt-2 text-sm text-green-700">
                Converti en {lead.converted_entity_type}{lead.converted_entity_id ? ` - ${lead.converted_entity_id}` : ''}
              </p>
            ) : (
              <p className="mt-2 text-sm text-gray-500">Lier ce lead a l&apos;objet cree quand il devient operationnel.</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {['seller', 'dealer'].includes(lead.lead_type) ? (
                <form action={`/api/admin/leads/${lead.id}/profile`} method="POST">
                  <input type="hidden" name="role" value={lead.lead_type === 'dealer' ? 'seller_dealer' : 'seller_individual'} />
                  <input type="hidden" name="next" value="sale_listing" />
                  <button type="submit" className="rounded-md bg-gray-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-gray-800">
                    Creer profil + annonce vente
                  </button>
                </form>
              ) : null}
              {lead.lead_type === 'rental_owner' ? (
                <form action={`/api/admin/leads/${lead.id}/profile`} method="POST">
                  <input type="hidden" name="role" value="seller_individual" />
                  <input type="hidden" name="next" value="hire_listing" />
                  <button type="submit" className="rounded-md bg-gray-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-gray-800">
                    Creer profil + annonce location
                  </button>
                </form>
              ) : null}
              {lead.lead_type === 'buyer' ? (
                <form action={`/api/admin/leads/${lead.id}/profile`} method="POST">
                  <input type="hidden" name="role" value="buyer" />
                  <input type="hidden" name="next" value="finance_matches" />
                  <button type="submit" className="rounded-md bg-gray-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-gray-800">
                    Creer profil + matching
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
            <form action={`/api/admin/leads/${lead.id}`} method="POST" className="mt-4 space-y-3">
              <input type="hidden" name="status" value="converted" />
              <select name="converted_entity_type" defaultValue={lead.converted_entity_type ?? ''} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
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
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <button type="submit" className="w-full rounded-lg bg-[#3d9e3d] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2d8a2d]">
                Marquer converti
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}

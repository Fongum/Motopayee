import { supabaseAdmin } from '@/lib/auth/server';
import { requireAdminPage } from '@/lib/auth/admin-access';
import Link from 'next/link';

const INVENTORY_TYPES = ['seller', 'dealer', 'rental_owner'];
const INVENTORY_STATUSES = ['ready_for_listing', 'awaiting_assets', 'qualified', 'onboarding'];

const TYPE_LABELS: Record<string, string> = {
  seller: 'Vendeur particulier',
  dealer: 'Concessionnaire',
  rental_owner: 'Loueur',
};

const STATUS_LABELS: Record<string, string> = {
  qualified: 'Qualifie',
  awaiting_assets: 'Attente photos/docs',
  ready_for_listing: 'Pret listing',
  onboarding: 'Onboarding',
};

const STATUS_STYLES: Record<string, string> = {
  qualified: 'bg-indigo-50 text-indigo-700',
  awaiting_assets: 'bg-orange-50 text-orange-700',
  ready_for_listing: 'bg-teal-50 text-teal-700',
  onboarding: 'bg-purple-50 text-purple-700',
};

const CONVERSION_ACTIONS: Record<string, Array<{ label: string; href: string }>> = {
  seller: [
    { label: 'Admin annonces', href: '/admin/listings' },
  ],
  dealer: [
    { label: 'Import stock dealer', href: '/me/listings/bulk' },
    { label: 'Admin annonces', href: '/admin/listings' },
  ],
  rental_owner: [
    { label: 'Admin location', href: '/admin/hire' },
  ],
};

const CHECKLISTS: Record<string, string[]> = {
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
  intake_checklist: Record<string, { checked?: boolean; note?: string | null; updated_at?: string }> | null;
  created_at: string;
  updated_at: string;
  assigned?: { full_name: string | null; email: string | null } | null;
};

function checklistKey(step: string) {
  return step
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 72);
}

function checklistProgress(lead: LeadRow) {
  const steps = CHECKLISTS[lead.lead_type] ?? [];
  const checklist = lead.intake_checklist ?? {};
  const complete = steps.filter((step) => checklist[checklistKey(step)]?.checked).length;
  return { complete, total: steps.length };
}

function ageInDays(date: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / (24 * 60 * 60 * 1000)));
}

function leadContext(lead: LeadRow) {
  return [
    `Lead MotoPayee: ${lead.business_name || lead.name}`,
    lead.phone ? `Telephone: ${lead.phone}` : null,
    lead.email ? `Email: ${lead.email}` : null,
    lead.interest ? `Interet: ${lead.interest}` : null,
    lead.notes ? `Notes: ${lead.notes}` : null,
  ].filter(Boolean).join('\n');
}

function createListingHref(lead: LeadRow) {
  const params = new URLSearchParams({
    launch_lead_id: lead.id,
    city: lead.city ?? '',
    description: leadContext(lead),
  });
  return `/admin/listings/new?${params.toString()}`;
}

function createHireHref(lead: LeadRow) {
  const params = new URLSearchParams({
    launch_lead_id: lead.id,
    city: lead.city ?? '',
    description: leadContext(lead),
    conditions: lead.notes ?? '',
  });
  return `/admin/hire/new?${params.toString()}`;
}

function LeadInventoryCard({ lead }: { lead: LeadRow }) {
  const progress = checklistProgress(lead);
  const progressPercent = progress.total > 0 ? Math.round((progress.complete / progress.total) * 100) : 0;
  const actions = CONVERSION_ACTIONS[lead.lead_type] ?? [];
  const statusClass = STATUS_STYLES[lead.status] ?? 'bg-gray-100 text-gray-700';

  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/admin/leads/${lead.id}`} className="font-bold text-gray-900 hover:text-[#1a3a6b]">
              {lead.business_name || lead.name}
            </Link>
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
              {TYPE_LABELS[lead.lead_type] ?? lead.lead_type}
            </span>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass}`}>
              {STATUS_LABELS[lead.status] ?? lead.status}
            </span>
            {lead.priority === 'high' && (
              <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">Haute priorite</span>
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
          <Link href={`/admin/leads/${lead.id}`} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">
            Ouvrir lead
          </Link>
          {['seller', 'dealer'].includes(lead.lead_type) && (
            <>
              <form action={`/api/admin/leads/${lead.id}/profile`} method="POST">
                <input type="hidden" name="role" value={lead.lead_type === 'dealer' ? 'seller_dealer' : 'seller_individual'} />
                <input type="hidden" name="next" value="sale_listing" />
                <button type="submit" className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-700 hover:bg-teal-100">
                  Creer profil + vente
                </button>
              </form>
              <Link href={createListingHref(lead)} className="rounded-lg border border-[#1a3a6b] bg-[#1a3a6b] px-3 py-2 text-xs font-semibold text-white hover:bg-[#132a4d]">
                Creer annonce vente
              </Link>
            </>
          )}
          {lead.lead_type === 'rental_owner' && (
            <>
              <form action={`/api/admin/leads/${lead.id}/profile`} method="POST">
                <input type="hidden" name="role" value="seller_individual" />
                <input type="hidden" name="next" value="hire_listing" />
                <button type="submit" className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-700 hover:bg-teal-100">
                  Creer profil + location
                </button>
              </form>
              <Link href={createHireHref(lead)} className="rounded-lg border border-[#1a3a6b] bg-[#1a3a6b] px-3 py-2 text-xs font-semibold text-white hover:bg-[#132a4d]">
                Creer annonce location
              </Link>
            </>
          )}
          {actions.map((action) => (
            <Link key={action.href} href={action.href} className="rounded-lg border border-[#1a3a6b] bg-[#1a3a6b] px-3 py-2 text-xs font-semibold text-white hover:bg-[#132a4d]">
              {action.label}
            </Link>
          ))}
        </div>
      </div>

      {lead.interest && (
        <p className="mt-4 rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-700">{lead.interest}</p>
      )}

      <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Checklist intake</p>
          <span className="text-xs font-semibold text-gray-700">{progress.complete}/{progress.total}</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
          <div className="h-full rounded-full bg-[#3d9e3d]" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      {lead.converted_entity_type ? (
        <p className="mt-3 text-xs font-semibold text-green-700">
          Converti en {lead.converted_entity_type}{lead.converted_entity_id ? ` - ${lead.converted_entity_id}` : ''}
        </p>
      ) : (
        <form action={`/api/admin/leads/${lead.id}`} method="POST" className="mt-4 grid gap-2 md:grid-cols-[150px_1fr_110px]">
          <input type="hidden" name="status" value="converted" />
          <select name="converted_entity_type" defaultValue={lead.lead_type === 'rental_owner' ? 'hire_listing' : 'listing'} className="rounded-lg border border-gray-300 px-3 py-2 text-xs">
            <option value="listing">Annonce vente</option>
            <option value="hire_listing">Annonce location</option>
            <option value="profile">Profil</option>
            <option value="dealer">Dealer</option>
            <option value="other">Autre</option>
          </select>
          <input
            name="converted_entity_id"
            placeholder="ID de l'objet cree"
            className="rounded-lg border border-gray-300 px-3 py-2 text-xs"
          />
          <button type="submit" className="rounded-lg bg-[#3d9e3d] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2d8a2d]">
            Convertir
          </button>
        </form>
      )}
    </article>
  );
}

export default async function InventoryLeadQueuePage() {
  await requireAdminPage('leads');

  const { data } = await supabaseAdmin
    .from('launch_leads')
    .select('*, assigned:profiles!assigned_to(full_name, email)')
    .in('lead_type', INVENTORY_TYPES)
    .in('status', INVENTORY_STATUSES)
    .order('status', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(100);

  const leads = (data ?? []) as unknown as LeadRow[];
  const readyLeads = leads.filter((lead) => lead.status === 'ready_for_listing');
  const awaitingLeads = leads.filter((lead) => lead.status === 'awaiting_assets');
  const qualifiedLeads = leads.filter((lead) => !['ready_for_listing', 'awaiting_assets'].includes(lead.status));

  const buckets = [
    {
      title: 'Prets a creer',
      description: 'Leads avec assez d informations pour creer une annonce vente ou location.',
      leads: readyLeads,
      className: 'border-teal-200 bg-teal-50/40',
    },
    {
      title: 'Attente photos/docs',
      description: 'Leads qui doivent recevoir photos, documents, prix ou conditions avant creation.',
      leads: awaitingLeads,
      className: 'border-orange-200 bg-orange-50/40',
    },
    {
      title: 'A qualifier vers listing',
      description: 'Leads supply-side qui avancent mais ne sont pas encore marques prets.',
      leads: qualifiedLeads,
      className: 'border-gray-200 bg-white',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">File inventory</h1>
          <p className="mt-1 text-sm text-gray-500">
            Transformer les leads vendeurs, dealers et loueurs en annonces publiees.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/leads?status=ready_for_listing" className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
            Tous prets
          </Link>
          <Link href="/admin/leads/action-board" className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
            Leads
          </Link>
          <Link href="/admin/listings" className="rounded-lg bg-[#1a3a6b] px-4 py-2 text-sm font-semibold text-white hover:bg-[#132a4d]">
            Annonces
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 'Prets listing', value: readyLeads.length, color: 'text-teal-700', href: '/admin/leads?status=ready_for_listing' },
          { label: 'Attente photos/docs', value: awaitingLeads.length, color: 'text-orange-700', href: '/admin/leads?status=awaiting_assets' },
          { label: 'Vente', value: leads.filter((lead) => ['seller', 'dealer'].includes(lead.lead_type)).length, color: 'text-[#1a3a6b]', href: '/admin/leads?type=seller' },
          { label: 'Location', value: leads.filter((lead) => lead.lead_type === 'rental_owner').length, color: 'text-[#3d9e3d]', href: '/admin/leads?type=rental_owner' },
        ].map((stat) => (
          <Link key={stat.label} href={stat.href} className="rounded-2xl border border-gray-200 bg-white p-5 hover:bg-gray-50">
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="mt-1 text-sm text-gray-500">{stat.label}</p>
          </Link>
        ))}
      </div>

      <div className="space-y-5">
        {buckets.map((bucket) => (
          <section key={bucket.title} className={`rounded-2xl border p-5 ${bucket.className}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-gray-900">{bucket.title}</h2>
                <p className="mt-1 text-sm text-gray-600">{bucket.description}</p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-700">
                {bucket.leads.length} lead{bucket.leads.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {bucket.leads.length === 0 ? (
                <p className="rounded-xl border border-dashed border-gray-200 bg-white/70 py-7 text-center text-sm text-gray-400">
                  Aucun lead dans cette file.
                </p>
              ) : bucket.leads.map((lead) => (
                <LeadInventoryCard key={lead.id} lead={lead} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

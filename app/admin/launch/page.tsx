import { supabaseAdmin } from '@/lib/auth/server';
import { requireAdminPage } from '@/lib/auth/admin-access';
import Link from 'next/link';
import {
  captureWeeklyMetrics,
  loadWeeklyHistory,
  startOfLaunchWeek,
  weekStartKey,
  WEEKLY_METRICS,
} from '@/lib/launch-metrics';
import { PARTNER_ENGAGED_STATUSES, isOpenLeadStatus } from '@/lib/launch-lead-metrics';

// Shared with the admin dashboard, which asks the same question.
const ACTIVE_PARTNER_STATUSES: readonly string[] = PARTNER_ENGAGED_STATUSES;

const TYPE_LABELS: Record<string, string> = {
  seller: 'Vendeurs',
  dealer: 'Dealers',
  rental_owner: 'Location',
  buyer: 'Acheteurs',
  renter: 'Locataires',
  mfi: 'IMF',
  inspection: 'Inspections',
  other: 'Autres',
};

const DEFAULT_READINESS_CHECKS = [
  {
    key: 'whatsapp_business',
    label: 'WhatsApp Business',
    detail: 'Numero dedie, labels et quick replies actifs.',
  },
  {
    key: 'inquiry_handling',
    label: 'Traitement demandes',
    detail: 'Responsable, delai de reponse et suivi quotidien confirmes.',
  },
  {
    key: 'rental_rules',
    label: 'Regles location',
    detail: 'Paiement, commission, depot et conditions expliques avant booking.',
  },
  {
    key: 'trust_labels',
    label: 'Labels confiance',
    detail: 'Reviewed, seller verified, documents checked, inspected et finance eligible appliques honnetement.',
  },
] as const;

const READINESS_STATUS_LABELS: Record<string, string> = {
  not_started: 'Pas commence',
  in_progress: 'En cours',
  ready: 'Pret',
  blocked: 'Bloque',
};

const READINESS_STATUS_STYLES: Record<string, string> = {
  not_started: 'border-gray-200 bg-gray-50 text-gray-700',
  in_progress: 'border-amber-200 bg-amber-50 text-amber-700',
  ready: 'border-green-200 bg-green-50 text-green-700',
  blocked: 'border-red-200 bg-red-50 text-red-700',
};

type GateStatus = 'ready' | 'watch' | 'behind' | 'manual';

type LeadMetricRow = {
  lead_type: string;
  status: string;
  source: string;
  campaign_name: string | null;
  next_follow_up_at: string | null;
  created_at: string;
};

type ReadinessCheckRow = {
  key: string;
  label: string;
  detail: string;
  status: 'not_started' | 'in_progress' | 'ready' | 'blocked';
  notes: string | null;
  updated_at: string;
};

type Gate = {
  label: string;
  value: number | string;
  target: string;
  detail: string;
  href: string;
  status: GateStatus;
};

type WeeklyTarget = {
  key: string;
  label: string;
  actual: number;
  target: number;
  href: string;
};

type RecommendedAction = {
  title: string;
  detail: string;
  href: string;
  priority: 'high' | 'medium' | 'normal';
};

function gateStatus(actual: number, target: number): GateStatus {
  if (actual >= target) return 'ready';
  if (actual >= Math.ceil(target * 0.6)) return 'watch';
  return 'behind';
}

const STATUS_STYLES: Record<GateStatus, string> = {
  ready: 'border-green-200 bg-green-50 text-green-700',
  watch: 'border-amber-200 bg-amber-50 text-amber-700',
  behind: 'border-red-200 bg-red-50 text-red-700',
  manual: 'border-gray-200 bg-gray-50 text-gray-700',
};

const STATUS_LABELS: Record<GateStatus, string> = {
  ready: 'Pret',
  watch: 'A suivre',
  behind: 'En retard',
  manual: 'A confirmer',
};

function countBy<T extends string>(rows: LeadMetricRow[], key: (row: LeadMetricRow) => T) {
  return rows.reduce<Record<T, number>>((acc, row) => {
    const value = key(row);
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {} as Record<T, number>);
}

function progressWidth(value: number, target: number) {
  if (target <= 0) return '0%';
  return `${Math.min(100, Math.round((value / target) * 100))}%`;
}

/** "S. 24 aout" — a short column header for a past launch week. */
function formatWeekLabel(weekStart: string) {
  const date = new Date(`${weekStart}T00:00:00`);
  return `S. ${date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`;
}

export default async function AdminLaunchPage() {
  await requireAdminPage('launch');

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const now = new Date();
  const weekStart = startOfLaunchWeek(now);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const [
    { count: publishedListings },
    { count: reviewedListings },
    { count: financeableListings },
    { count: publishedHireListings },
    { count: pendingHireListings },
    { count: dealerPilots },
    { count: financePartnerConversations },
    { count: activeInspectionRequests },
    { count: completedInspectionRequests },
    { count: pendingInspectionPayments },
    { count: failedInspectionPayments },
    { count: financingApplications },
    { count: offersWaitingBuyer },
    { count: buyerInterestedOffers },
    { count: expectedCommissions },
    { count: invoicedCommissions },
    { count: expectedHireFees },
    { count: invoicedHireFees },
    { count: rentalBookings },
    { data: leadData },
    { data: readinessData },
  ] = await Promise.all([
    supabaseAdmin.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    supabaseAdmin.from('listings').select('*', { count: 'exact', head: true }).in('status', ['ownership_verified', 'media_done', 'inspection_scheduled', 'inspected', 'pricing_review', 'published']),
    supabaseAdmin.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'published').eq('financeable', true),
    supabaseAdmin.from('hire_listings').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    supabaseAdmin.from('hire_listings').select('*', { count: 'exact', head: true }).eq('status', 'pending_review'),
    supabaseAdmin.from('launch_leads').select('*', { count: 'exact', head: true }).eq('lead_type', 'dealer').in('status', ACTIVE_PARTNER_STATUSES),
    supabaseAdmin.from('launch_leads').select('*', { count: 'exact', head: true }).eq('lead_type', 'mfi').in('status', ACTIVE_PARTNER_STATUSES),
    supabaseAdmin.from('inspection_requests').select('*', { count: 'exact', head: true }).in('status', ['submitted', 'contacted', 'quoted', 'paid', 'scheduled']),
    supabaseAdmin.from('inspection_requests').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    supabaseAdmin.from('payments').select('*', { count: 'exact', head: true }).eq('payment_type', 'inspection_fee').in('status', ['pending', 'processing']),
    supabaseAdmin.from('payments').select('*', { count: 'exact', head: true }).eq('payment_type', 'inspection_fee').eq('status', 'failed'),
    supabaseAdmin.from('financing_applications').select('*', { count: 'exact', head: true }).gte('created_at', since),
    supabaseAdmin.from('mfi_application_offers').select('*', { count: 'exact', head: true }).in('status', ['submitted', 'shortlisted', 'accepted']).is('buyer_response', null),
    supabaseAdmin.from('mfi_application_offers').select('*', { count: 'exact', head: true }).eq('buyer_response', 'interested'),
    supabaseAdmin.from('finance_commissions').select('*', { count: 'exact', head: true }).eq('status', 'expected'),
    supabaseAdmin.from('finance_commissions').select('*', { count: 'exact', head: true }).eq('status', 'invoiced'),
    supabaseAdmin.from('hire_service_fees').select('*', { count: 'exact', head: true }).eq('status', 'expected'),
    supabaseAdmin.from('hire_service_fees').select('*', { count: 'exact', head: true }).eq('status', 'invoiced'),
    supabaseAdmin.from('hire_bookings').select('*', { count: 'exact', head: true }).gte('created_at', since),
    supabaseAdmin
      .from('launch_leads')
      .select('lead_type, status, source, campaign_name, next_follow_up_at, created_at')
      .gte('created_at', since),
    supabaseAdmin
      .from('launch_readiness_checks')
      .select('key, label, detail, status, notes, updated_at')
      .order('created_at', { ascending: true }),
  ]);

  const leadRows = (leadData ?? []) as LeadMetricRow[];

  // Capture on view as well as on the Monday cron: history that only accrues
  // when a scheduled job fires is history that quietly stops accruing.
  const { values: thisWeek } = await captureWeeklyMetrics(weekStart);
  const history = await loadWeeklyHistory(4, now);
  // Earlier weeks only — the current week is the "Actual" column already.
  const currentWeekKey = weekStartKey(weekStart);
  const pastWeeks = history.filter((week) => week.weekStart !== currentWeekKey);

  const readinessRows = (readinessData ?? []) as ReadinessCheckRow[];
  const readinessByKey = new Map(readinessRows.map((check) => [check.key, check]));
  const readinessChecks = DEFAULT_READINESS_CHECKS.map((check) => {
    const stored = readinessByKey.get(check.key);
    return {
      ...check,
      status: stored?.status ?? 'not_started',
      notes: stored?.notes ?? '',
      updatedAt: stored?.updated_at ?? null,
    };
  });
  const openLeads = leadRows.filter((lead) => isOpenLeadStatus(lead.status));
  const dueToday = openLeads.filter((lead) => {
    if (!lead.next_follow_up_at) return false;
    const followUp = new Date(lead.next_follow_up_at);
    return followUp <= endOfDay;
  });
  const typeCounts = countBy(leadRows, (row) => row.lead_type);
  const sourceCounts = countBy(leadRows, (row) => row.source);
  const topSources = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const campaignCounts = leadRows.reduce<Record<string, number>>((acc, row) => {
    const campaign = row.campaign_name || 'Sans campagne';
    acc[campaign] = (acc[campaign] ?? 0) + 1;
    return acc;
  }, {});
  const topCampaigns = Object.entries(campaignCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const weeklyTargets: WeeklyTarget[] = WEEKLY_METRICS.map((metric) => ({
    key: metric.key,
    label: metric.label,
    actual: thisWeek[metric.key] ?? 0,
    target: metric.target,
    href: metric.href,
  }));

  const gates: Gate[] = [
    {
      label: 'Annonces vente',
      value: publishedListings ?? 0,
      target: '25+',
      detail: 'Annonces publiques, propres et presentables.',
      href: '/admin/listings?status=published',
      status: gateStatus(publishedListings ?? 0, 25),
    },
    {
      label: 'Locations',
      value: publishedHireListings ?? 0,
      target: '20+',
      detail: `${pendingHireListings ?? 0} en attente de validation.`,
      href: '/admin/hire',
      status: gateStatus(publishedHireListings ?? 0, 20),
    },
    {
      label: 'Pilotes dealers',
      value: dealerPilots ?? 0,
      target: '3-5',
      detail: 'Leads dealer interesses, qualifies, onboarding ou convertis.',
      href: '/admin/leads?type=dealer',
      status: gateStatus(dealerPilots ?? 0, 3),
    },
    {
      label: 'Partenaires finance',
      value: financePartnerConversations ?? 0,
      target: '2-3',
      detail: 'Conversations IMF, credit union ou finance dealer actives.',
      href: '/admin/leads?type=mfi',
      status: gateStatus(financePartnerConversations ?? 0, 2),
    },
    {
      label: 'Finance eligible',
      value: financeableListings ?? 0,
      target: '5-10',
      detail: 'Vehicules publies marques financeable.',
      href: '/admin/finance/eligible',
      status: gateStatus(financeableListings ?? 0, 5),
    },
    {
      label: 'Inspection package',
      value: activeInspectionRequests ?? 0,
      target: '1+',
      detail: `${completedInspectionRequests ?? 0} inspections completees.`,
      href: '/admin/inspection-requests',
      status: gateStatus(activeInspectionRequests ?? 0, 1),
    },
  ];
  const blockedReadinessChecks = readinessChecks.filter((check) => check.status === 'blocked');
  const incompleteReadinessChecks = readinessChecks.filter((check) => check.status !== 'ready');
  const hardBlocked = gates.some((gate) => gate.status === 'behind') || blockedReadinessChecks.length > 0;
  const readyForBuyerCampaign = gates.every((gate) => gate.status === 'ready' || gate.status === 'watch')
    && readinessChecks.every((check) => check.status === 'ready' || check.status === 'in_progress');
  const launchDecision = hardBlocked
    ? {
      label: 'No-go',
      title: 'Continuer la campagne supply-side',
      detail: 'Les objectifs ou controles critiques ne sont pas encore prets pour pousser fortement les acheteurs et locataires.',
      className: 'border-red-200 bg-red-50 text-red-900',
    }
    : readyForBuyerCampaign
      ? {
        label: 'Go',
        title: 'Campagne acheteur/locataire possible',
        detail: 'Les gates principaux sont prets ou en progression claire. Confirmer les derniers controles avant publication.',
        className: 'border-green-200 bg-green-50 text-green-900',
      }
      : {
        label: 'Watch',
        title: 'Presque pret, rester prudent',
        detail: 'Aucun blocage majeur, mais certains controles manuels doivent encore etre confirmes.',
        className: 'border-amber-200 bg-amber-50 text-amber-900',
      };
  const recommendedActions: RecommendedAction[] = [
    ...blockedReadinessChecks.map((check) => ({
      title: `Debloquer controle: ${check.label}`,
      detail: check.notes || check.detail,
      href: '/admin/launch',
      priority: 'high' as const,
    })),
    ...(dueToday.length > 0 ? [{
      title: 'Traiter les relances dues',
      detail: `${dueToday.length} lead${dueToday.length === 1 ? '' : 's'} a rappeler ou relancer avant la fin de journee.`,
      href: '/admin/leads?status=due',
      priority: 'high' as const,
    }] : []),
    ...((failedInspectionPayments ?? 0) > 0 ? [{
      title: 'Relancer paiements inspection',
      detail: `${failedInspectionPayments ?? 0} paiement${failedInspectionPayments === 1 ? '' : 's'} inspection ont echoue et bloquent la programmation.`,
      href: '/admin/inspection-requests?payment=failed',
      priority: 'high' as const,
    }] : []),
    ...((pendingInspectionPayments ?? 0) > 0 ? [{
      title: 'Verifier paiements inspection en cours',
      detail: `${pendingInspectionPayments ?? 0} paiement${pendingInspectionPayments === 1 ? '' : 's'} inspection sont en attente ou traitement.`,
      href: '/admin/inspection-requests?payment=pending',
      priority: 'medium' as const,
    }] : []),
    ...((offersWaitingBuyer ?? 0) > 0 ? [{
      title: 'Presenter les offres IMF',
      detail: `${offersWaitingBuyer ?? 0} offre${offersWaitingBuyer === 1 ? '' : 's'} active${offersWaitingBuyer === 1 ? '' : 's'} attendent une reponse acheteur.`,
      href: '/admin/applications?status=offers_waiting_buyer',
      priority: 'high' as const,
    }] : []),
    ...((buyerInterestedOffers ?? 0) > 0 ? [{
      title: 'Convertir les acheteurs interesses',
      detail: `${buyerInterestedOffers ?? 0} acheteur${buyerInterestedOffers === 1 ? '' : 's'} ont marque un interet pour une offre IMF.`,
      href: '/admin/applications?status=buyer_interested',
      priority: 'high' as const,
    }] : []),
    ...((expectedCommissions ?? 0) > 0 ? [{
      title: 'Facturer commissions MotoPayee',
      detail: `${expectedCommissions ?? 0} commission${expectedCommissions === 1 ? '' : 's'} finance attendent facturation.`,
      href: '/admin/finance?commission=expected',
      priority: 'medium' as const,
    }] : []),
    ...((invoicedCommissions ?? 0) > 0 ? [{
      title: 'Relancer commissions facturees',
      detail: `${invoicedCommissions ?? 0} commission${invoicedCommissions === 1 ? '' : 's'} facturees attendent encaissement.`,
      href: '/admin/finance?commission=invoiced',
      priority: 'medium' as const,
    }] : []),
    ...((expectedHireFees ?? 0) > 0 ? [{
      title: 'Facturer frais location',
      detail: `${expectedHireFees ?? 0} frais de service location attendent facturation.`,
      href: '/admin/hire/bookings?fee=expected',
      priority: 'medium' as const,
    }] : []),
    ...((invoicedHireFees ?? 0) > 0 ? [{
      title: 'Relancer frais location factures',
      detail: `${invoicedHireFees ?? 0} frais location factures attendent encaissement.`,
      href: '/admin/hire/bookings?fee=invoiced',
      priority: 'medium' as const,
    }] : []),
    ...gates
      .filter((gate) => gate.status === 'behind')
      .slice(0, 3)
      .map((gate) => ({
        title: `Debloquer: ${gate.label}`,
        detail: `${gate.detail} Actuel: ${gate.value}/${gate.target}.`,
        href: gate.href,
        priority: 'high' as const,
      })),
    ...weeklyTargets
      .filter((target) => gateStatus(target.actual, target.target) === 'behind')
      .slice(0, 3)
      .map((target) => ({
        title: `Rattraper cette semaine: ${target.label}`,
        detail: `Actual ${target.actual}/${target.target}. Prioriser cette file avant la prochaine revue.`,
        href: target.href,
        priority: 'medium' as const,
      })),
    ...((pendingHireListings ?? 0) > 0 ? [{
      title: 'Valider les locations en attente',
      detail: `${pendingHireListings ?? 0} vehicule${pendingHireListings === 1 ? '' : 's'} de location attendent une decision.`,
      href: '/admin/hire',
      priority: 'normal' as const,
    }] : []),
    ...(incompleteReadinessChecks.length > 0 && blockedReadinessChecks.length === 0 ? [{
      title: 'Confirmer checklist go/no-go',
      detail: `${incompleteReadinessChecks.length} controle${incompleteReadinessChecks.length === 1 ? '' : 's'} manuel${incompleteReadinessChecks.length === 1 ? '' : 's'} restent a confirmer.`,
      href: '/admin/launch',
      priority: 'normal' as const,
    }] : []),
  ].slice(0, 6);

  const weeklyMetrics = [
    { label: 'Leads 30j', value: leadRows.length, href: '/admin/leads' },
    { label: 'Leads ouverts', value: openLeads.length, href: '/admin/leads' },
    { label: 'Relances dues', value: dueToday.length, href: '/admin/leads?status=due' },
    { label: 'Listings revus', value: reviewedListings ?? 0, href: '/admin/listings' },
    { label: 'Paiements insp. en cours', value: pendingInspectionPayments ?? 0, href: '/admin/inspection-requests?payment=pending' },
    { label: 'Paiements insp. echoues', value: failedInspectionPayments ?? 0, href: '/admin/inspection-requests?payment=failed' },
    { label: 'Demandes finance', value: financingApplications ?? 0, href: '/admin/applications' },
    { label: 'Offres a presenter', value: offersWaitingBuyer ?? 0, href: '/admin/applications?status=offers_waiting_buyer' },
    { label: 'Acheteurs interesses', value: buyerInterestedOffers ?? 0, href: '/admin/applications?status=buyer_interested' },
    { label: 'Commissions a facturer', value: expectedCommissions ?? 0, href: '/admin/finance?commission=expected' },
    { label: 'Commissions facturees', value: invoicedCommissions ?? 0, href: '/admin/finance?commission=invoiced' },
    { label: 'Reservations location', value: rentalBookings ?? 0, href: '/admin/hire/bookings' },
    { label: 'Frais loc. a facturer', value: expectedHireFees ?? 0, href: '/admin/hire/bookings?fee=expected' },
    { label: 'Frais loc. factures', value: invoicedHireFees ?? 0, href: '/admin/hire/bookings?fee=invoiced' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Command center lancement</h1>
          <p className="mt-1 text-sm text-gray-500">
            Vue go/no-go pour les objectifs 30 jours avant campagne acheteur et locataire.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/ops" className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100">
            Daily ops
          </Link>
          <Link href="/admin/leads/action-board" className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
            Action leads
          </Link>
          <Link href="/admin/leads/inventory" className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-100">
            File inventory
          </Link>
          <Link href="/admin/leads/campaign-links" className="rounded-lg bg-[#1a3a6b] px-4 py-2 text-sm font-semibold text-white hover:bg-[#132a4d]">
            Campagnes
          </Link>
        </div>
      </div>

      <section className={`rounded-2xl border p-6 ${launchDecision.className}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-bold uppercase tracking-wide">
              Decision: {launchDecision.label}
            </span>
            <h2 className="mt-4 text-xl font-bold">{launchDecision.title}</h2>
            <p className="mt-2 max-w-3xl text-sm opacity-80">{launchDecision.detail}</p>
          </div>
          <div className="grid min-w-52 grid-cols-2 gap-2 text-center text-xs">
            <div className="rounded-xl bg-white/70 p-3">
              <p className="text-2xl font-bold">{gates.filter((gate) => gate.status === 'ready').length}</p>
              <p className="opacity-70">Gates prets</p>
            </div>
            <div className="rounded-xl bg-white/70 p-3">
              <p className="text-2xl font-bold">{readinessChecks.filter((check) => check.status === 'ready').length}</p>
              <p className="opacity-70">Controles prets</p>
            </div>
          </div>
        </div>
      </section>

      {recommendedActions.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/50 p-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-gray-900">Actions recommandees aujourd hui</h2>
              <p className="mt-1 text-sm text-gray-600">Priorites calculees depuis les relances, les launch gates et le scorecard semaine.</p>
            </div>
            <Link href="/admin/leads/action-board" className="rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100">
              Ouvrir action board
            </Link>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {recommendedActions.map((action) => (
              <Link key={`${action.title}-${action.href}`} href={action.href} className="rounded-xl border border-amber-100 bg-white p-4 hover:border-amber-300 hover:bg-amber-50">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-gray-900">{action.title}</p>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    action.priority === 'high'
                      ? 'bg-red-50 text-red-700'
                      : action.priority === 'medium'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-gray-100 text-gray-700'
                  }`}>
                    {action.priority === 'high' ? 'Urgent' : action.priority === 'medium' ? 'Important' : 'A faire'}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-gray-600">{action.detail}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="mb-5">
          <h2 className="font-semibold text-gray-900">Launch gate</h2>
          <p className="mt-1 text-sm text-gray-500">Demarrer la campagne publique quand ces cartes sont pretes ou clairement en progression.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {gates.map((gate) => (
            <Link key={gate.label} href={gate.href} className="rounded-xl border border-gray-200 p-4 hover:border-[#1a3a6b]/30 hover:bg-blue-50/30">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{gate.label}</p>
                  <p className="mt-1 text-xs text-gray-500">{gate.detail}</p>
                </div>
                <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[gate.status]}`}>
                  {STATUS_LABELS[gate.status]}
                </span>
              </div>
              <p className="mt-4 text-3xl font-bold text-[#1a3a6b]">
                {gate.value}<span className="text-sm font-semibold text-gray-400">/{gate.target}</span>
              </p>
              {typeof gate.value === 'number' && (
                <div className="mt-3 h-2 rounded-full bg-gray-100">
                  <div className="h-2 rounded-full bg-[#3d9e3d]" style={{ width: progressWidth(gate.value, Number.parseInt(gate.target, 10) || 1) }} />
                </div>
              )}
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {weeklyMetrics.map((metric) => (
          <Link key={metric.label} href={metric.href} className="rounded-2xl border border-gray-200 bg-white p-5 hover:bg-gray-50">
            <p className="text-3xl font-bold text-gray-900">{metric.value}</p>
            <p className="mt-1 text-sm text-gray-500">{metric.label}</p>
          </Link>
        ))}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-gray-900">Scorecard semaine courante</h2>
            <p className="mt-1 text-sm text-gray-500">
              Semaine du {weekStart.toLocaleDateString('fr-FR')} au {endOfDay.toLocaleDateString('fr-FR')}.
            </p>
          </div>
          <Link href="/admin/leads/import" className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
            Importer leads
          </Link>
        </div>
        <div className="overflow-hidden rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Metric</th>
                {pastWeeks.map((week) => (
                  <th key={week.weekStart} className="px-4 py-3 text-right font-medium text-gray-400">
                    {formatWeekLabel(week.weekStart)}
                  </th>
                ))}
                <th className="px-4 py-3">Actual</th>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {weeklyTargets.map((metric) => {
                const status = gateStatus(metric.actual, metric.target);
                return (
                  <tr key={metric.label} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={metric.href} className="font-medium text-gray-900 hover:text-[#1a3a6b]">
                        {metric.label}
                      </Link>
                    </td>
                    {pastWeeks.map((week) => (
                      <td key={week.weekStart} className="px-4 py-3 text-right text-gray-400">
                        {week.values[metric.key] ?? '—'}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-gray-900">{metric.actual}</td>
                    <td className="px-4 py-3 text-gray-500">{metric.target}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[status]}`}>
                        {STATUS_LABELS[status]}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="font-semibold text-gray-900">Mix leads 30j</h2>
          <div className="mt-4 space-y-3">
            {Object.entries(TYPE_LABELS).map(([type, label]) => (
              <Link key={type} href={`/admin/leads?type=${type}`} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 text-sm hover:bg-gray-50">
                <span className="text-gray-700">{label}</span>
                <span className="font-semibold text-gray-900">{typeCounts[type] ?? 0}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="font-semibold text-gray-900">Sources fortes</h2>
          <div className="mt-4 space-y-3">
            {topSources.length === 0 ? (
              <p className="rounded-xl border border-dashed border-gray-200 py-8 text-center text-sm text-gray-400">Aucune source sur 30 jours.</p>
            ) : topSources.map(([source, count]) => (
              <Link key={source} href={`/admin/leads?source=${source}`} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 text-sm hover:bg-gray-50">
                <span className="text-gray-700">{source}</span>
                <span className="font-semibold text-gray-900">{count}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="font-semibold text-gray-900">Campagnes actives</h2>
          <div className="mt-4 space-y-3">
            {topCampaigns.length === 0 ? (
              <p className="rounded-xl border border-dashed border-gray-200 py-8 text-center text-sm text-gray-400">Aucune campagne sur 30 jours.</p>
            ) : topCampaigns.map(([campaign, count]) => {
              const href = campaign === 'Sans campagne'
                ? '/admin/leads?campaign=__none'
                : `/admin/leads?campaign=${encodeURIComponent(campaign)}`;
              return (
                <Link key={campaign} href={href} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 text-sm hover:bg-gray-50">
                  <span className="truncate text-gray-700">{campaign}</span>
                  <span className="ml-3 font-semibold text-gray-900">{count}</span>
                </Link>
              );
            })}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="font-semibold text-gray-900">Checklist manuelle go/no-go</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {readinessChecks.map((check) => (
            <form key={check.key} action="/api/admin/launch/readiness" method="POST" className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <input type="hidden" name="key" value={check.key} />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{check.label}</p>
                  <p className="mt-1 text-xs leading-relaxed text-gray-600">{check.detail}</p>
                </div>
                <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${READINESS_STATUS_STYLES[check.status]}`}>
                  {READINESS_STATUS_LABELS[check.status]}
                </span>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-[150px_1fr_90px]">
                <select name="status" defaultValue={check.status} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs">
                  <option value="not_started">Pas commence</option>
                  <option value="in_progress">En cours</option>
                  <option value="ready">Pret</option>
                  <option value="blocked">Bloque</option>
                </select>
                <input
                  name="notes"
                  defaultValue={check.notes}
                  placeholder="Note courte ou blocage"
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs"
                />
                <button type="submit" className="rounded-lg bg-[#1a3a6b] px-3 py-2 text-xs font-semibold text-white hover:bg-[#132a4d]">
                  Sauver
                </button>
              </div>
              {check.updatedAt && (
                <p className="mt-2 text-[11px] text-gray-400">
                  MAJ {new Date(check.updatedAt).toLocaleString('fr-FR')}
                </p>
              )}
            </form>
          ))}
        </div>
      </section>
    </div>
  );
}

import { supabaseAdmin } from '@/lib/auth/server';
import { requireAdminPage } from '@/lib/auth/admin-access';
import Link from 'next/link';
import { PARTNER_ENGAGED_STATUSES } from '@/lib/launch-lead-metrics';
import { OPEN_LEAD_STATUSES } from '@/lib/launch-lead-metrics';


const LEAD_TYPE_LABELS: Record<string, string> = {
  seller: 'Vendeur',
  dealer: 'Dealer',
  rental_owner: 'Location',
  buyer: 'Acheteur',
  renter: 'Locataire',
  mfi: 'IMF',
  inspection: 'Inspection',
  other: 'Autre',
};

type ReadinessStatus = 'ready' | 'watch' | 'behind' | 'manual';

function leadReminderLabel(nextFollowUpAt: string | null) {
  if (!nextFollowUpAt) return 'Sans relance';
  const followUp = new Date(nextFollowUpAt);
  const now = new Date();
  if (followUp <= now) return 'En retard';
  return 'Aujourd hui';
}

function readinessStatus(actual: number, target: number): ReadinessStatus {
  if (actual >= target) return 'ready';
  if (actual >= Math.ceil(target * 0.6)) return 'watch';
  return 'behind';
}

const READINESS_STYLES: Record<ReadinessStatus, string> = {
  ready: 'border-green-200 bg-green-50 text-green-700',
  watch: 'border-amber-200 bg-amber-50 text-amber-700',
  behind: 'border-red-200 bg-red-50 text-red-700',
  manual: 'border-gray-200 bg-gray-50 text-gray-700',
};

const READINESS_LABELS: Record<ReadinessStatus, string> = {
  ready: 'Pret',
  watch: 'A suivre',
  behind: 'En retard',
  manual: 'A confirmer',
};

export default async function AdminDashboardPage() {
  const user = await requireAdminPage('dashboard');

  const inspectionActiveStatuses = ['submitted', 'contacted', 'quoted', 'paid', 'scheduled'];
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  const sevenDaysFromNow = new Date(endOfDay);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  // Fetch stats in parallel
  const [
    { count: pendingListings },
    { count: pendingApps },
    { count: publishedListings },
    { count: totalApps },
    { count: newInspectionRequests },
    { count: activeInspectionRequests },
    { count: paidInspectionRequests },
    { count: scheduledInspectionRequests },
    { count: pendingInspectionPayments },
    { count: failedInspectionPayments },
    { count: offersWaitingBuyer },
    { count: buyerInterestedOffers },
    { count: openFollowUps },
    { count: dueFollowUps },
    { count: approvedApps },
    { count: disbursedApps },
    { count: expectedCommissions },
    { count: invoicedCommissions },
    { count: expectedHireFees },
    { count: invoicedHireFees },
    { count: pendingHireBookings },
    { count: activeHireBookings },
    { count: newLaunchLeads },
    { count: openLaunchLeads },
    { count: dueLaunchLeads },
    { count: todayLaunchLeads },
    { count: upcomingLaunchLeads },
    { count: financeableListings },
    { count: publishedHireListings },
    { count: activeDealerPilotLeads },
    { count: activeMfiLeads },
    { data: leadReminderData },
    { data: inspectionPayments },
  ] = await Promise.all([
    supabaseAdmin.from('listings').select('*', { count: 'exact', head: true })
      .in('status', ['ownership_submitted', 'ownership_verified', 'media_done', 'inspected', 'pricing_review']),
    supabaseAdmin.from('financing_applications').select('*', { count: 'exact', head: true })
      .in('status', ['submitted', 'docs_pending', 'docs_received', 'under_review']),
    supabaseAdmin.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    supabaseAdmin.from('financing_applications').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('inspection_requests').select('*', { count: 'exact', head: true }).eq('status', 'submitted'),
    supabaseAdmin.from('inspection_requests').select('*', { count: 'exact', head: true }).in('status', inspectionActiveStatuses),
    supabaseAdmin.from('inspection_requests').select('*', { count: 'exact', head: true }).eq('status', 'paid'),
    supabaseAdmin.from('inspection_requests').select('*', { count: 'exact', head: true }).eq('status', 'scheduled'),
    supabaseAdmin.from('payments').select('*', { count: 'exact', head: true }).eq('payment_type', 'inspection_fee').in('status', ['pending', 'processing']),
    supabaseAdmin.from('payments').select('*', { count: 'exact', head: true }).eq('payment_type', 'inspection_fee').eq('status', 'failed'),
    supabaseAdmin.from('mfi_application_offers').select('*', { count: 'exact', head: true }).in('status', ['submitted', 'shortlisted', 'accepted']).is('buyer_response', null),
    supabaseAdmin.from('mfi_application_offers').select('*', { count: 'exact', head: true }).eq('buyer_response', 'interested'),
    supabaseAdmin.from('financing_applications').select('*', { count: 'exact', head: true }).in('follow_up_status', ['call_needed', 'contacted', 'waiting_buyer', 'waiting_mfi']),
    supabaseAdmin.from('financing_applications').select('*', { count: 'exact', head: true }).in('follow_up_status', ['call_needed', 'contacted', 'waiting_buyer', 'waiting_mfi']).lte('next_follow_up_at', new Date().toISOString()),
    supabaseAdmin.from('financing_applications').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    supabaseAdmin.from('financing_applications').select('*', { count: 'exact', head: true }).eq('status', 'disbursed'),
    supabaseAdmin.from('finance_commissions').select('*', { count: 'exact', head: true }).eq('status', 'expected'),
    supabaseAdmin.from('finance_commissions').select('*', { count: 'exact', head: true }).eq('status', 'invoiced'),
    supabaseAdmin.from('hire_service_fees').select('*', { count: 'exact', head: true }).eq('status', 'expected'),
    supabaseAdmin.from('hire_service_fees').select('*', { count: 'exact', head: true }).eq('status', 'invoiced'),
    supabaseAdmin.from('hire_bookings').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabaseAdmin.from('hire_bookings').select('*', { count: 'exact', head: true }).in('status', ['confirmed', 'active']),
    supabaseAdmin.from('launch_leads').select('*', { count: 'exact', head: true }).eq('status', 'new'),
    supabaseAdmin.from('launch_leads').select('*', { count: 'exact', head: true }).in('status', OPEN_LEAD_STATUSES),
    supabaseAdmin.from('launch_leads').select('*', { count: 'exact', head: true }).in('status', OPEN_LEAD_STATUSES).lte('next_follow_up_at', now.toISOString()),
    supabaseAdmin.from('launch_leads').select('*', { count: 'exact', head: true }).in('status', OPEN_LEAD_STATUSES).gt('next_follow_up_at', now.toISOString()).lte('next_follow_up_at', endOfDay.toISOString()),
    supabaseAdmin.from('launch_leads').select('*', { count: 'exact', head: true }).in('status', OPEN_LEAD_STATUSES).gt('next_follow_up_at', endOfDay.toISOString()).lte('next_follow_up_at', sevenDaysFromNow.toISOString()),
    supabaseAdmin.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'published').eq('financeable', true),
    supabaseAdmin.from('hire_listings').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    supabaseAdmin.from('launch_leads').select('*', { count: 'exact', head: true }).eq('lead_type', 'dealer').in('status', PARTNER_ENGAGED_STATUSES),
    supabaseAdmin.from('launch_leads').select('*', { count: 'exact', head: true }).eq('lead_type', 'mfi').in('status', PARTNER_ENGAGED_STATUSES),
    supabaseAdmin
      .from('launch_leads')
      .select('id, lead_type, status, priority, name, business_name, city, next_follow_up_at, assigned:profiles!assigned_to(full_name, email)')
      .in('status', OPEN_LEAD_STATUSES)
      .lte('next_follow_up_at', endOfDay.toISOString())
      .order('next_follow_up_at', { ascending: true })
      .limit(6),
    supabaseAdmin
      .from('payments')
      .select('amount')
      .eq('payment_type', 'inspection_fee')
      .eq('status', 'successful'),
  ]);

  const inspectionRevenue = (inspectionPayments ?? []).reduce((total, payment) => (
    total + Number((payment as { amount: number }).amount ?? 0)
  ), 0);
  const leadReminders = (leadReminderData ?? []) as unknown as Array<{
    id: string;
    lead_type: string;
    status: string;
    priority: string;
    name: string;
    business_name: string | null;
    city: string | null;
    next_follow_up_at: string | null;
    assigned?: { full_name: string | null; email: string | null } | null;
  }>;

  const stats = [
    { label: 'Annonces en attente', value: pendingListings ?? 0, href: '/admin/listings?status=pending', color: 'text-yellow-600' },
    { label: 'Demandes en cours', value: pendingApps ?? 0, href: '/admin/applications?status=active', color: 'text-blue-600' },
    { label: 'Offres a presenter', value: offersWaitingBuyer ?? 0, href: '/admin/applications?status=offers_waiting_buyer', color: 'text-amber-600' },
    { label: 'Acheteurs interesses', value: buyerInterestedOffers ?? 0, href: '/admin/applications?status=buyer_interested', color: 'text-green-600' },
    { label: 'Nouveaux leads', value: newLaunchLeads ?? 0, href: '/admin/leads?status=new', color: 'text-orange-600' },
    { label: 'Leads ouverts', value: openLaunchLeads ?? 0, href: '/admin/leads', color: 'text-blue-700' },
    { label: 'Leads a relancer', value: dueLaunchLeads ?? 0, href: '/admin/leads?status=due', color: 'text-red-600' },
    { label: 'Leads aujourd hui', value: todayLaunchLeads ?? 0, href: '/admin/leads?status=today', color: 'text-blue-700' },
    { label: 'Leads 7 jours', value: upcomingLaunchLeads ?? 0, href: '/admin/leads?status=upcoming', color: 'text-indigo-700' },
    { label: 'Suivis ouverts', value: openFollowUps ?? 0, href: '/admin/applications?status=follow_up', color: 'text-amber-600' },
    { label: 'Relances dues', value: dueFollowUps ?? 0, href: '/admin/applications?status=follow_up_due', color: 'text-red-600' },
    { label: 'A decaisser', value: approvedApps ?? 0, href: '/admin/finance?status=approved', color: 'text-amber-600' },
    { label: 'Financees', value: disbursedApps ?? 0, href: '/admin/finance?status=disbursed', color: 'text-emerald-700' },
    { label: 'Commissions a facturer', value: expectedCommissions ?? 0, href: '/admin/finance?commission=expected', color: 'text-amber-700' },
    { label: 'Commissions facturees', value: invoicedCommissions ?? 0, href: '/admin/finance?commission=invoiced', color: 'text-blue-700' },
    { label: 'Reservations', value: pendingHireBookings ?? 0, href: '/admin/hire/bookings?status=pending', color: 'text-orange-600' },
    { label: 'Frais location a facturer', value: expectedHireFees ?? 0, href: '/admin/hire/bookings?fee=expected', color: 'text-amber-700' },
    { label: 'Frais location factures', value: invoicedHireFees ?? 0, href: '/admin/hire/bookings?fee=invoiced', color: 'text-blue-700' },
    { label: 'Locations actives', value: activeHireBookings ?? 0, href: '/admin/hire/bookings?status=active', color: 'text-purple-700' },
    { label: 'Annonces publiées', value: publishedListings ?? 0, href: '/admin/listings?status=published', color: 'text-green-600' },
    { label: 'Total demandes', value: totalApps ?? 0, href: '/admin/applications', color: 'text-gray-700' },
  ];

  const inspectionStats = [
    { label: 'Nouvelles inspections', value: newInspectionRequests ?? 0, href: '/admin/inspection-requests?status=submitted', color: 'text-amber-600' },
    { label: 'Inspections actives', value: activeInspectionRequests ?? 0, href: '/admin/inspection-requests?status=active', color: 'text-blue-600' },
    { label: 'Payees a programmer', value: paidInspectionRequests ?? 0, href: '/admin/inspection-requests?status=paid', color: 'text-green-600' },
    { label: 'Programmees', value: scheduledInspectionRequests ?? 0, href: '/admin/inspection-requests?status=scheduled', color: 'text-purple-600' },
    { label: 'Paiements en cours', value: pendingInspectionPayments ?? 0, href: '/admin/inspection-requests?payment=pending', color: 'text-amber-600' },
    { label: 'Paiements echoues', value: failedInspectionPayments ?? 0, href: '/admin/inspection-requests?payment=failed', color: 'text-red-600' },
  ];

  const formattedInspectionRevenue = new Intl.NumberFormat('fr-CM', {
    style: 'currency',
    currency: 'XAF',
    maximumFractionDigits: 0,
  }).format(inspectionRevenue);
  const launchReadiness = [
    {
      label: 'Annonces vente',
      value: publishedListings ?? 0,
      target: 25,
      detail: 'Objectif: 25+ annonces presentables',
      href: '/admin/listings?status=published',
      status: readinessStatus(publishedListings ?? 0, 25),
    },
    {
      label: 'Locations publiees',
      value: publishedHireListings ?? 0,
      target: 20,
      detail: 'Objectif: 20+ vehicules location',
      href: '/admin/hire',
      status: readinessStatus(publishedHireListings ?? 0, 20),
    },
    {
      label: 'Pilotes dealers',
      value: activeDealerPilotLeads ?? 0,
      target: 3,
      detail: 'Objectif: 3-5 pilotes actifs/interesses',
      href: '/admin/leads?type=dealer',
      status: readinessStatus(activeDealerPilotLeads ?? 0, 3),
    },
    {
      label: 'Partenaires finance',
      value: activeMfiLeads ?? 0,
      target: 2,
      detail: 'Objectif: 2-3 conversations IMF/credit',
      href: '/admin/leads?type=mfi',
      status: readinessStatus(activeMfiLeads ?? 0, 2),
    },
    {
      label: 'Finance eligible',
      value: financeableListings ?? 0,
      target: 5,
      detail: 'Objectif: 5-10 vehicules eligibles',
      href: '/admin/finance/eligible',
      status: readinessStatus(financeableListings ?? 0, 5),
    },
    {
      label: 'Inspections actives',
      value: activeInspectionRequests ?? 0,
      target: 1,
      detail: 'Offre inspection en marche',
      href: '/admin/inspection-requests',
      status: readinessStatus(activeInspectionRequests ?? 0, 1),
    },
  ];
  const manualReadiness = [
    { label: 'WhatsApp Business', detail: 'Numero dedie, labels et quick replies actifs' },
    { label: 'Traitement demandes', detail: 'Responsable, delai de reponse et suivi quotidien confirmes' },
    { label: 'Regles location', detail: 'Paiement, commission, depot et conditions expliques avant booking' },
    { label: 'Labels confiance', detail: 'Reviewed, verified, inspected et finance eligible utilises honnetement' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Vue d&apos;ensemble</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-8">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-blue-300 hover:shadow-sm transition"
          >
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
          </Link>
        ))}
      </div>

      <div className="mb-8 rounded-2xl border border-blue-100 bg-white p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-gray-900">Readiness lancement 30 jours</h2>
            <p className="text-sm text-gray-500">Suivi des objectifs valides en reunion avant campagne acheteur/locataire.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/ops" className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100">
              Daily ops
            </Link>
            <Link href="/admin/leads/action-board" className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
              Action board
            </Link>
            <Link href="/admin/leads/campaign-links" className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100">
              Liens campagnes
            </Link>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {launchReadiness.map((item) => (
            <Link key={item.label} href={item.href} className="rounded-xl border border-gray-200 p-4 hover:border-blue-200 hover:bg-blue-50/30">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                  <p className="mt-1 text-xs text-gray-500">{item.detail}</p>
                </div>
                <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${READINESS_STYLES[item.status]}`}>
                  {READINESS_LABELS[item.status]}
                </span>
              </div>
              <p className="mt-3 text-2xl font-bold text-[#1a3a6b]">
                {item.value}<span className="text-sm font-semibold text-gray-400">/{item.target}</span>
              </p>
            </Link>
          ))}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {manualReadiness.map((item) => (
            <div key={item.label} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${READINESS_STYLES.manual}`}>
                  {READINESS_LABELS.manual}
                </span>
              </div>
              <p className="mt-2 text-xs text-gray-500">{item.detail}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-8 rounded-2xl border border-red-100 bg-white p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-gray-900">Relances leads prioritaires</h2>
            <p className="text-sm text-gray-500">Leads en retard ou a traiter avant la fin de journee.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/leads?status=due" className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100">
              En retard
            </Link>
            <Link href="/admin/leads/action-board" className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
              Action board
            </Link>
          </div>
        </div>
        {leadReminders.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-200 py-6 text-center text-sm text-gray-400">
            Aucune relance lead due aujourd hui.
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {leadReminders.map((lead) => (
              <Link key={lead.id} href={`/admin/leads/${lead.id}`} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm hover:bg-gray-50">
                <div>
                  <p className="font-semibold text-gray-900">{lead.business_name || lead.name}</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {LEAD_TYPE_LABELS[lead.lead_type] ?? lead.lead_type}
                    {lead.city ? ` - ${lead.city}` : ''}
                    {' - '}
                    {lead.assigned?.full_name ?? lead.assigned?.email ?? 'Non assigne'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {lead.priority === 'high' && (
                    <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">Haute</span>
                  )}
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    lead.next_follow_up_at && new Date(lead.next_follow_up_at) <= now
                      ? 'bg-red-50 text-red-700'
                      : 'bg-blue-50 text-blue-700'
                  }`}>
                    {leadReminderLabel(lead.next_follow_up_at)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="mb-8">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Pipeline inspections</h2>
            <p className="text-sm text-gray-500">Suivi des demandes payantes et du travail terrain.</p>
          </div>
          <Link href="/admin/inspection-requests" className="text-sm font-medium text-[#1a3a6b] hover:text-[#3d9e3d]">
            Voir tout
          </Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {inspectionStats.map((stat) => (
            <Link
              key={stat.label}
              href={stat.href}
              className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-[#3d9e3d] hover:shadow-sm transition"
            >
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
            </Link>
          ))}
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <p className="text-2xl font-bold text-gray-900">{formattedInspectionRevenue}</p>
            <p className="text-sm text-gray-500 mt-1">Revenu inspections recu</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Actions rapides</h2>
          <div className="space-y-3">
            <Link href="/admin/inspection-requests?status=submitted" className="flex items-center justify-between text-sm py-2 border-b border-gray-100 hover:text-[#3d9e3d] transition-colors">
              <span>Contacter les nouvelles demandes d&apos;inspection</span>
              <span className="text-gray-400">-&gt;</span>
            </Link>
            <Link href="/admin/inspection-requests?status=paid" className="flex items-center justify-between text-sm py-2 border-b border-gray-100 hover:text-[#3d9e3d] transition-colors">
              <span>Programmer les inspections payees</span>
              <span className="text-gray-400">-&gt;</span>
            </Link>
            <Link href="/admin/inspection-requests?payment=failed" className="flex items-center justify-between text-sm py-2 border-b border-gray-100 hover:text-[#3d9e3d] transition-colors">
              <span>Relancer les paiements inspection echoues</span>
              <span className="text-gray-400">-&gt;</span>
            </Link>
            <Link href="/admin/listings?status=ownership_submitted" className="flex items-center justify-between text-sm py-2 border-b border-gray-100 hover:text-[#3d9e3d] transition-colors">
              <span>Vérifier les propriétés soumises</span>
              <span className="text-gray-400">→</span>
            </Link>
            <Link href="/admin/applications?status=docs_received" className="flex items-center justify-between text-sm py-2 border-b border-gray-100 hover:text-[#3d9e3d] transition-colors">
              <span>Examiner les dossiers reçus</span>
              <span className="text-gray-400">→</span>
            </Link>
            <Link href="/admin/applications?status=offers_waiting_buyer" className="flex items-center justify-between text-sm py-2 border-b border-gray-100 hover:text-[#3d9e3d] transition-colors">
              <span>Presenter les offres IMF aux acheteurs</span>
              <span className="text-gray-400">-&gt;</span>
            </Link>
            <Link href="/admin/applications?status=buyer_interested" className="flex items-center justify-between text-sm py-2 border-b border-gray-100 hover:text-[#3d9e3d] transition-colors">
              <span>Suivre les acheteurs interesses par une offre IMF</span>
              <span className="text-gray-400">-&gt;</span>
            </Link>
            <Link href="/admin/applications?status=follow_up_due" className="flex items-center justify-between text-sm py-2 border-b border-gray-100 hover:text-[#3d9e3d] transition-colors">
              <span>Traiter les relances dues</span>
              <span className="text-gray-400">-&gt;</span>
            </Link>
            <Link href="/admin/finance?commission=expected" className="flex items-center justify-between text-sm py-2 border-b border-gray-100 hover:text-[#3d9e3d] transition-colors">
              <span>Facturer les commissions MotoPayee attendues</span>
              <span className="text-gray-400">-&gt;</span>
            </Link>
            <Link href="/admin/finance?commission=invoiced" className="flex items-center justify-between text-sm py-2 border-b border-gray-100 hover:text-[#3d9e3d] transition-colors">
              <span>Suivre les commissions deja facturees</span>
              <span className="text-gray-400">-&gt;</span>
            </Link>
            <Link href="/admin/hire/bookings?fee=expected" className="flex items-center justify-between text-sm py-2 border-b border-gray-100 hover:text-[#3d9e3d] transition-colors">
              <span>Facturer les frais de service location</span>
              <span className="text-gray-400">-&gt;</span>
            </Link>
            <Link href="/admin/hire/bookings?fee=invoiced" className="flex items-center justify-between text-sm py-2 border-b border-gray-100 hover:text-[#3d9e3d] transition-colors">
              <span>Suivre les frais location factures</span>
              <span className="text-gray-400">-&gt;</span>
            </Link>
            <Link href="/admin/leads/action-board" className="flex items-center justify-between text-sm py-2 border-b border-gray-100 hover:text-[#3d9e3d] transition-colors">
              <span>Ouvrir l&apos;action board leads</span>
              <span className="text-gray-400">-&gt;</span>
            </Link>
            <Link href="/admin/listings?status=inspected" className="flex items-center justify-between text-sm py-2 hover:text-[#3d9e3d] transition-colors">
              <span>Publier les annonces inspectées</span>
              <span className="text-gray-400">→</span>
            </Link>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Votre rôle</h2>
          <div className="text-sm text-gray-600 space-y-2">
            {user.role === 'admin' && (
              <>
                <p>✓ Gérer toutes les annonces et demandes</p>
                <p>✓ Publier des annonces</p>
                <p>✓ Modifier les règles de zone</p>
                <p>✓ Gérer les utilisateurs</p>
              </>
            )}
            {user.role === 'verifier' && (
              <>
                <p>✓ Examiner les dossiers de financement</p>
                <p>✓ Vérifier les documents d&apos;identité</p>
                <p>✓ Mettre à jour les statuts des demandes</p>
              </>
            )}
            {user.role === 'inspector' && (
              <>
                <p>✓ Soumettre les rapports d&apos;inspection</p>
                <p>✓ Attribuer les grades de condition</p>
                <p>✓ Confirmer l&apos;éligibilité au financement</p>
              </>
            )}
            {user.role === 'field_agent' && (
              <>
                <p>✓ Photographier les véhicules</p>
                <p>✓ Téléverser les médias des annonces</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

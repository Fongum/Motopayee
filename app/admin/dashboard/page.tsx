import { getCurrentUser, supabaseAdmin } from '@/lib/auth/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

const OPEN_LEAD_STATUSES = ['new', 'contacted', 'interested', 'qualified', 'onboarding'];

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

function leadReminderLabel(nextFollowUpAt: string | null) {
  if (!nextFollowUpAt) return 'Sans relance';
  const followUp = new Date(nextFollowUpAt);
  const now = new Date();
  if (followUp <= now) return 'En retard';
  return 'Aujourd hui';
}

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

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
    { count: buyerInterestedOffers },
    { count: openFollowUps },
    { count: dueFollowUps },
    { count: approvedApps },
    { count: disbursedApps },
    { count: pendingHireBookings },
    { count: activeHireBookings },
    { count: newLaunchLeads },
    { count: openLaunchLeads },
    { count: dueLaunchLeads },
    { count: todayLaunchLeads },
    { count: upcomingLaunchLeads },
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
    supabaseAdmin.from('mfi_application_offers').select('*', { count: 'exact', head: true }).eq('buyer_response', 'interested'),
    supabaseAdmin.from('financing_applications').select('*', { count: 'exact', head: true }).in('follow_up_status', ['call_needed', 'contacted', 'waiting_buyer', 'waiting_mfi']),
    supabaseAdmin.from('financing_applications').select('*', { count: 'exact', head: true }).in('follow_up_status', ['call_needed', 'contacted', 'waiting_buyer', 'waiting_mfi']).lte('next_follow_up_at', new Date().toISOString()),
    supabaseAdmin.from('financing_applications').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    supabaseAdmin.from('financing_applications').select('*', { count: 'exact', head: true }).eq('status', 'disbursed'),
    supabaseAdmin.from('hire_bookings').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabaseAdmin.from('hire_bookings').select('*', { count: 'exact', head: true }).in('status', ['confirmed', 'active']),
    supabaseAdmin.from('launch_leads').select('*', { count: 'exact', head: true }).eq('status', 'new'),
    supabaseAdmin.from('launch_leads').select('*', { count: 'exact', head: true }).in('status', OPEN_LEAD_STATUSES),
    supabaseAdmin.from('launch_leads').select('*', { count: 'exact', head: true }).in('status', OPEN_LEAD_STATUSES).lte('next_follow_up_at', now.toISOString()),
    supabaseAdmin.from('launch_leads').select('*', { count: 'exact', head: true }).in('status', OPEN_LEAD_STATUSES).gt('next_follow_up_at', now.toISOString()).lte('next_follow_up_at', endOfDay.toISOString()),
    supabaseAdmin.from('launch_leads').select('*', { count: 'exact', head: true }).in('status', OPEN_LEAD_STATUSES).gt('next_follow_up_at', endOfDay.toISOString()).lte('next_follow_up_at', sevenDaysFromNow.toISOString()),
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
    { label: 'Reservations', value: pendingHireBookings ?? 0, href: '/admin/hire/bookings?status=pending', color: 'text-orange-600' },
    { label: 'Locations actives', value: activeHireBookings ?? 0, href: '/admin/hire/bookings?status=active', color: 'text-purple-700' },
    { label: 'Annonces publiées', value: publishedListings ?? 0, href: '/admin/listings?status=published', color: 'text-green-600' },
    { label: 'Total demandes', value: totalApps ?? 0, href: '/admin/applications', color: 'text-gray-700' },
  ];

  const inspectionStats = [
    { label: 'Nouvelles inspections', value: newInspectionRequests ?? 0, href: '/admin/inspection-requests?status=submitted', color: 'text-amber-600' },
    { label: 'Inspections actives', value: activeInspectionRequests ?? 0, href: '/admin/inspection-requests?status=active', color: 'text-blue-600' },
    { label: 'Payees a programmer', value: paidInspectionRequests ?? 0, href: '/admin/inspection-requests?status=paid', color: 'text-green-600' },
    { label: 'Programmees', value: scheduledInspectionRequests ?? 0, href: '/admin/inspection-requests?status=scheduled', color: 'text-purple-600' },
  ];

  const formattedInspectionRevenue = new Intl.NumberFormat('fr-CM', {
    style: 'currency',
    currency: 'XAF',
    maximumFractionDigits: 0,
  }).format(inspectionRevenue);

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
            <Link href="/admin/listings?status=ownership_submitted" className="flex items-center justify-between text-sm py-2 border-b border-gray-100 hover:text-[#3d9e3d] transition-colors">
              <span>Vérifier les propriétés soumises</span>
              <span className="text-gray-400">→</span>
            </Link>
            <Link href="/admin/applications?status=docs_received" className="flex items-center justify-between text-sm py-2 border-b border-gray-100 hover:text-[#3d9e3d] transition-colors">
              <span>Examiner les dossiers reçus</span>
              <span className="text-gray-400">→</span>
            </Link>
            <Link href="/admin/applications?status=buyer_interested" className="flex items-center justify-between text-sm py-2 border-b border-gray-100 hover:text-[#3d9e3d] transition-colors">
              <span>Suivre les acheteurs interesses par une offre IMF</span>
              <span className="text-gray-400">-&gt;</span>
            </Link>
            <Link href="/admin/applications?status=follow_up_due" className="flex items-center justify-between text-sm py-2 border-b border-gray-100 hover:text-[#3d9e3d] transition-colors">
              <span>Traiter les relances dues</span>
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

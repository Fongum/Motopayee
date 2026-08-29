import { supabaseAdmin } from '@/lib/auth/server';
import {
  DEFAULT_RESPONSE_SLA_MINUTES,
  bucketInboundLeads,
  INBOUND_LEAD_TYPES,
  type InboundLead,
} from '@/lib/inbound-response';

const OPEN_LEAD_STATUSES = ['new', 'contacted', 'interested', 'qualified', 'awaiting_assets', 'ready_for_listing', 'onboarding'];
const ACTIVE_FOLLOW_UP_STATUSES = ['call_needed', 'contacted', 'waiting_buyer', 'waiting_mfi'];

export type OpsPriority = 'critical' | 'high' | 'medium' | 'normal';
export type OpsArea = 'leads' | 'inspections' | 'finance' | 'rentals' | 'revenue' | 'supply';

export type OpsQueueItem = {
  title: string;
  count: number;
  href: string;
  detail: string;
  priority: OpsPriority;
  area: OpsArea;
};

export type OpsLeadReminder = {
  id: string;
  lead_type: string;
  priority: string;
  name: string;
  business_name: string | null;
  city: string | null;
  next_follow_up_at: string | null;
  assigned?: { full_name: string | null; email: string | null } | null;
};

export type OpsInboundLead = {
  id: string;
  lead_type: string;
  source: string;
  status: string;
  created_at: string;
  name: string;
  phone: string | null;
  city: string | null;
  listing_id: string | null;
  hire_listing_id: string | null;
};

export type OpsSnapshot = {
  generatedAt: Date;
  queueItems: OpsQueueItem[];
  activeQueues: OpsQueueItem[];
  quietQueues: OpsQueueItem[];
  leadReminders: OpsLeadReminder[];
  /** People waiting on a promised callback, longest wait first. */
  inboundLate: OpsInboundLead[];
  inboundWaiting: OpsInboundLead[];
  oldestInboundWaitMinutes: number;
  totalOpenActions: number;
  criticalActions: number;
  revenueActions: number;
};

export const OPS_PRIORITY_LABELS: Record<OpsPriority, string> = {
  critical: 'Critique',
  high: 'Urgent',
  medium: 'Important',
  normal: 'A faire',
};

export const OPS_AREA_LABELS: Record<OpsArea, string> = {
  leads: 'Leads',
  inspections: 'Inspection',
  finance: 'Finance',
  rentals: 'Location',
  revenue: 'Revenu',
  supply: 'Supply',
};

export function opsPriorityRank(priority: OpsPriority) {
  return { critical: 0, high: 1, medium: 2, normal: 3 }[priority];
}

export async function getDailyOpsSnapshot(options: { leadLimit?: number } = {}): Promise<OpsSnapshot> {
  const generatedAt = new Date();
  const endOfDay = new Date(generatedAt);
  endOfDay.setHours(23, 59, 59, 999);

  const [
    { count: unassignedLeads },
    { count: dueLeads },
    { count: todayLeads },
    { count: pendingListings },
    { count: pendingHireListings },
    { count: newInspectionRequests },
    { count: paidInspectionRequests },
    { count: scheduledInspectionRequests },
    { count: failedInspectionPayments },
    { count: pendingInspectionPayments },
    { count: mfiUnassignedApps },
    { count: offersWaitingBuyer },
    { count: buyerInterestedOffers },
    { count: dueFinanceFollowUps },
    { count: approvedApps },
    { count: expectedCommissions },
    { count: invoicedCommissions },
    { count: pendingHireBookings },
    { count: expectedHireFees },
    { count: invoicedHireFees },
    { data: leadReminderData },
    { data: inboundLeadData },
  ] = await Promise.all([
    supabaseAdmin.from('launch_leads').select('*', { count: 'exact', head: true }).in('status', OPEN_LEAD_STATUSES).is('assigned_to', null),
    supabaseAdmin.from('launch_leads').select('*', { count: 'exact', head: true }).in('status', OPEN_LEAD_STATUSES).lte('next_follow_up_at', generatedAt.toISOString()),
    supabaseAdmin.from('launch_leads').select('*', { count: 'exact', head: true }).in('status', OPEN_LEAD_STATUSES).gt('next_follow_up_at', generatedAt.toISOString()).lte('next_follow_up_at', endOfDay.toISOString()),
    supabaseAdmin.from('listings').select('*', { count: 'exact', head: true }).in('status', ['ownership_submitted', 'ownership_verified', 'media_done', 'inspected', 'pricing_review']),
    supabaseAdmin.from('hire_listings').select('*', { count: 'exact', head: true }).eq('status', 'pending_review'),
    supabaseAdmin.from('inspection_requests').select('*', { count: 'exact', head: true }).eq('status', 'submitted'),
    supabaseAdmin.from('inspection_requests').select('*', { count: 'exact', head: true }).eq('status', 'paid'),
    supabaseAdmin.from('inspection_requests').select('*', { count: 'exact', head: true }).eq('status', 'scheduled'),
    supabaseAdmin.from('payments').select('*', { count: 'exact', head: true }).eq('payment_type', 'inspection_fee').eq('status', 'failed'),
    supabaseAdmin.from('payments').select('*', { count: 'exact', head: true }).eq('payment_type', 'inspection_fee').in('status', ['pending', 'processing']),
    supabaseAdmin.from('financing_applications').select('*', { count: 'exact', head: true }).in('status', ['submitted', 'docs_received', 'under_review']).is('mfi_institution_id', null),
    supabaseAdmin.from('mfi_application_offers').select('*', { count: 'exact', head: true }).in('status', ['submitted', 'shortlisted', 'accepted']).is('buyer_response', null),
    supabaseAdmin.from('mfi_application_offers').select('*', { count: 'exact', head: true }).eq('buyer_response', 'interested'),
    supabaseAdmin.from('financing_applications').select('*', { count: 'exact', head: true }).in('follow_up_status', ACTIVE_FOLLOW_UP_STATUSES).lte('next_follow_up_at', generatedAt.toISOString()),
    supabaseAdmin.from('financing_applications').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    supabaseAdmin.from('finance_commissions').select('*', { count: 'exact', head: true }).eq('status', 'expected'),
    supabaseAdmin.from('finance_commissions').select('*', { count: 'exact', head: true }).eq('status', 'invoiced'),
    supabaseAdmin.from('hire_bookings').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabaseAdmin.from('hire_service_fees').select('*', { count: 'exact', head: true }).eq('status', 'expected'),
    supabaseAdmin.from('hire_service_fees').select('*', { count: 'exact', head: true }).eq('status', 'invoiced'),
    supabaseAdmin
      .from('launch_leads')
      .select('id, lead_type, priority, name, business_name, city, next_follow_up_at, assigned:profiles!assigned_to(full_name, email)')
      .in('status', OPEN_LEAD_STATUSES)
      .lte('next_follow_up_at', endOfDay.toISOString())
      .order('next_follow_up_at', { ascending: true })
      .limit(options.leadLimit ?? 8),
    // Awaiting-callback requests, bucketed in code so the wait is measured
    // against the response promise rather than a follow-up date nobody set.
    supabaseAdmin
      .from('launch_leads')
      .select('id, lead_type, source, status, created_at, name, phone, city, listing_id, hire_listing_id')
      .eq('status', 'new')
      .eq('source', 'website')
      .in('lead_type', INBOUND_LEAD_TYPES as unknown as string[])
      .order('created_at', { ascending: true })
      .limit(50),
  ]);

  const inbound = bucketInboundLeads((inboundLeadData ?? []) as unknown as (InboundLead & OpsInboundLead)[], {
    now: generatedAt,
  });

  const queueItems: OpsQueueItem[] = [
    { title: 'Rappels promis en retard', count: inbound.late.length, href: '/admin/leads?inbound=late', detail: `Demandes de rappel sans reponse depuis plus de ${Math.round(DEFAULT_RESPONSE_SLA_MINUTES / 60)} h.`, priority: 'critical', area: 'leads' },
    { title: 'Rappels a passer', count: inbound.waiting.length, href: '/admin/leads?inbound=waiting', detail: 'Acheteurs et locataires qui ont demande a etre rappeles.', priority: 'critical', area: 'leads' },
    { title: 'Relances leads en retard', count: dueLeads ?? 0, href: '/admin/leads?status=due', detail: 'Leads a rappeler avant de creer de nouveaux contacts.', priority: 'critical', area: 'leads' },
    { title: 'Leads non assignes', count: unassignedLeads ?? 0, href: '/admin/leads?assigned=unassigned', detail: 'Attribuer un responsable ou traiter directement.', priority: 'high', area: 'leads' },
    { title: 'Relances leads aujourd hui', count: todayLeads ?? 0, href: '/admin/leads?status=today', detail: 'A terminer avant la fin de journee.', priority: 'medium', area: 'leads' },
    { title: 'Annonces vente en attente', count: pendingListings ?? 0, href: '/admin/listings?status=pending', detail: 'Supply a verifier, inspecter, tarifer ou publier.', priority: 'high', area: 'supply' },
    { title: 'Locations a valider', count: pendingHireListings ?? 0, href: '/admin/hire', detail: 'Vehicules location en attente de decision staff.', priority: 'high', area: 'rentals' },
    { title: 'Nouvelles inspections', count: newInspectionRequests ?? 0, href: '/admin/inspection-requests?status=submitted', detail: 'Contacter et convertir vers paiement.', priority: 'high', area: 'inspections' },
    { title: 'Inspections payees a programmer', count: paidInspectionRequests ?? 0, href: '/admin/inspection-requests?status=paid', detail: 'Assigner un inspecteur et fixer le passage.', priority: 'critical', area: 'inspections' },
    { title: 'Inspections programmees', count: scheduledInspectionRequests ?? 0, href: '/admin/inspection-requests?status=scheduled', detail: 'Suivre execution terrain et cloturer.', priority: 'medium', area: 'inspections' },
    { title: 'Paiements inspection echoues', count: failedInspectionPayments ?? 0, href: '/admin/inspection-requests?payment=failed', detail: 'Relancer le client et envoyer un nouveau moyen de paiement.', priority: 'critical', area: 'inspections' },
    { title: 'Paiements inspection en cours', count: pendingInspectionPayments ?? 0, href: '/admin/inspection-requests?payment=pending', detail: 'Verifier les paiements non confirmes.', priority: 'medium', area: 'inspections' },
    { title: 'Demandes finance a router IMF', count: mfiUnassignedApps ?? 0, href: '/admin/applications?status=mfi_unassigned', detail: 'Assigner les dossiers finance a un partenaire.', priority: 'high', area: 'finance' },
    { title: 'Offres IMF a presenter', count: offersWaitingBuyer ?? 0, href: '/admin/applications?status=offers_waiting_buyer', detail: 'Presenter les offres aux acheteurs et noter leur reponse.', priority: 'critical', area: 'finance' },
    { title: 'Acheteurs interesses IMF', count: buyerInterestedOffers ?? 0, href: '/admin/applications?status=buyer_interested', detail: 'Convertir l interet en validation et decaissement.', priority: 'critical', area: 'finance' },
    { title: 'Relances finance dues', count: dueFinanceFollowUps ?? 0, href: '/admin/applications?status=follow_up_due', detail: 'Appels buyer/MFI en retard.', priority: 'critical', area: 'finance' },
    { title: 'Dossiers a decaisser', count: approvedApps ?? 0, href: '/admin/finance?status=approved', detail: 'Financements approuves a confirmer avec IMF.', priority: 'high', area: 'finance' },
    { title: 'Commissions finance a facturer', count: expectedCommissions ?? 0, href: '/admin/finance?commission=expected', detail: 'Revenu MotoPayee attendu apres validation finance.', priority: 'medium', area: 'revenue' },
    { title: 'Commissions finance facturees', count: invoicedCommissions ?? 0, href: '/admin/finance?commission=invoiced', detail: 'Relancer les encaissements non payes.', priority: 'medium', area: 'revenue' },
    { title: 'Reservations location en attente', count: pendingHireBookings ?? 0, href: '/admin/hire/bookings?status=pending', detail: 'Confirmer disponibilite, paiement et depart.', priority: 'high', area: 'rentals' },
    { title: 'Frais location a facturer', count: expectedHireFees ?? 0, href: '/admin/hire/bookings?fee=expected', detail: 'Frais de service a transformer en facture.', priority: 'medium', area: 'revenue' },
    { title: 'Frais location factures', count: invoicedHireFees ?? 0, href: '/admin/hire/bookings?fee=invoiced', detail: 'Relancer les frais non encaisses.', priority: 'medium', area: 'revenue' },
  ];

  const activeQueues = queueItems
    .filter((item) => item.count > 0)
    .sort((a, b) => opsPriorityRank(a.priority) - opsPriorityRank(b.priority) || b.count - a.count);
  const quietQueues = queueItems.filter((item) => item.count === 0);
  const totalOpenActions = queueItems.reduce((sum, item) => sum + item.count, 0);
  const criticalActions = queueItems.filter((item) => item.priority === 'critical').reduce((sum, item) => sum + item.count, 0);
  const revenueActions = queueItems.filter((item) => item.area === 'revenue').reduce((sum, item) => sum + item.count, 0);

  return {
    generatedAt,
    queueItems,
    activeQueues,
    quietQueues,
    leadReminders: (leadReminderData ?? []) as unknown as OpsLeadReminder[],
    inboundLate: inbound.late,
    inboundWaiting: inbound.waiting,
    oldestInboundWaitMinutes: inbound.oldestWaitMinutes,
    totalOpenActions,
    criticalActions,
    revenueActions,
  };
}

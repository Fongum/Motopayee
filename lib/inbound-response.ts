/**
 * Inbound callback requests are a promise: the form tells the buyer MotoPayee
 * will call back. Unlike outbound prospects, they are only worth anything for
 * as long as the person still remembers asking — so they are measured by how
 * long they have waited, not by a follow-up date somebody has to set.
 */

export const INBOUND_LEAD_TYPES = ['buyer', 'renter'] as const;

/** Minutes before an unanswered callback request counts as late. */
export const DEFAULT_RESPONSE_SLA_MINUTES = 120;

export interface InboundLead {
  id: string;
  lead_type: string;
  source: string;
  status: string;
  created_at: string;
}

/**
 * A lead the public asked us to call, rather than one we went looking for.
 * Staff-entered leads share the buyer type but are not a response promise.
 */
export function isInboundLead(lead: Pick<InboundLead, 'lead_type' | 'source' | 'status'>): boolean {
  return (
    (INBOUND_LEAD_TYPES as readonly string[]).includes(lead.lead_type) &&
    lead.source === 'website' &&
    lead.status === 'new'
  );
}

export function waitedMinutes(lead: InboundLead, now: Date = new Date()): number {
  const created = new Date(lead.created_at).getTime();
  if (Number.isNaN(created)) return 0;
  return Math.max(0, Math.floor((now.getTime() - created) / 60_000));
}

export interface InboundBuckets<T> {
  /** Past the response promise — call these before anything else. */
  late: T[];
  /** Still inside the window. */
  waiting: T[];
  /** Longest anyone has been waiting, in minutes. */
  oldestWaitMinutes: number;
}

/**
 * Split awaiting-callback leads by whether the response promise still holds.
 * Both lists are oldest first: the person who has waited longest is the one
 * most likely to have given up.
 */
export function bucketInboundLeads<T extends InboundLead>(
  leads: T[],
  { now = new Date(), slaMinutes = DEFAULT_RESPONSE_SLA_MINUTES }: { now?: Date; slaMinutes?: number } = {}
): InboundBuckets<T> {
  const pending = leads
    .filter(isInboundLead)
    .map((lead) => ({ lead, waited: waitedMinutes(lead, now) }))
    .sort((a, b) => b.waited - a.waited);

  return {
    late: pending.filter((entry) => entry.waited >= slaMinutes).map((entry) => entry.lead),
    waiting: pending.filter((entry) => entry.waited < slaMinutes).map((entry) => entry.lead),
    oldestWaitMinutes: pending[0]?.waited ?? 0,
  };
}

/** "3 h 05" / "45 min" — for staff scanning a queue, not for logs. */
export function formatWait(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours} h ${String(rest).padStart(2, '0')}`;
}

import { supabaseAdmin } from '@/lib/auth/server';
import { logger } from '@/lib/logger';

export async function recordLeadActivity({
  leadId,
  actorId,
  action,
  summary,
  meta = {},
}: {
  leadId: string;
  actorId: string | null;
  action: string;
  summary?: string | null;
  meta?: Record<string, unknown>;
}) {
  const { error } = await supabaseAdmin.from('launch_lead_activities').insert({
    lead_id: leadId,
    actor_id: actorId,
    action,
    summary: summary ?? null,
    meta,
  });

  if (error) {
    logger.error('Failed to record lead activity', { err: error, leadId, action });
  }
}

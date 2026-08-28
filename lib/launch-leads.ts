import { supabaseAdmin } from '@/lib/auth/server';
import { logger } from '@/lib/logger';

export function leadPhoneKey(phone?: string | null) {
  const digits = (phone ?? '').replace(/\D/g, '');
  return digits || null;
}

export function leadEmailKey(email?: string | null) {
  const normalized = (email ?? '').trim().toLowerCase();
  return normalized || null;
}

export async function findMatchingLaunchLead({
  phoneKey,
  emailKey,
}: {
  phoneKey?: string | null;
  emailKey?: string | null;
}) {
  const filters = [];
  if (phoneKey) filters.push(`phone_key.eq.${phoneKey}`);
  if (emailKey) filters.push(`email_key.eq.${emailKey}`);
  if (filters.length === 0) return null;

  const { data, error } = await supabaseAdmin
    .from('launch_leads')
    .select('id, status, notes, listing_id, hire_listing_id')
    .or(filters.join(','))
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    logger.error('Failed to find matching launch lead', { err: error });
    return null;
  }

  return data;
}

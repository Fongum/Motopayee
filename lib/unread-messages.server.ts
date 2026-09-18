/**
 * Server-side fetcher for unread message counts.
 *
 * Split from `unread-messages.ts` so the shapes and helpers stay importable
 * without constructing a Supabase client.
 */

import { supabaseAdmin } from './auth/server';
import { reportError } from './error-reporting';
import { EMPTY_UNREAD_COUNTS } from './unread-messages';
import type { UnreadCounts } from './unread-messages';

/**
 * Zeros on failure rather than a throw: an unread badge that cannot be computed
 * must not take the inbox down with it.
 */
export async function fetchUnreadCounts(userId: string): Promise<UnreadCounts> {
  const { data, error } = await supabaseAdmin.rpc('unread_message_counts', {
    p_user_id: userId,
  });

  if (error) {
    reportError(error, { source: 'messages', context: 'unread_message_counts', userId });
    return EMPTY_UNREAD_COUNTS;
  }
  return { ...EMPTY_UNREAD_COUNTS, ...(data as UnreadCounts | null) };
}

/**
 * Unread message counts.
 *
 * The inbox page and `GET /api/conversations` used to fetch every unread row
 * and tally it in JavaScript, which PostgREST truncates at db-max-rows — so a
 * busy inbox silently stopped counting — and which drags rows across the wire
 * only to discard them. Migration 042 answers both questions in one call.
 *
 * Pure shapes and helpers; the fetcher lives in the `.server` sibling.
 */

export interface UnreadCounts {
  total: number;
  /** Conversation id -> unread count. Absent means zero. */
  by_conversation: Record<string, number>;
}

export const EMPTY_UNREAD_COUNTS: UnreadCounts = {
  total: 0,
  by_conversation: {},
};

/**
 * A conversation with nothing unread is absent from the map, not zero-valued —
 * so every read goes through here rather than indexing the record directly.
 */
export function unreadFor(counts: UnreadCounts, conversationId: string): number {
  return counts.by_conversation[conversationId] ?? 0;
}

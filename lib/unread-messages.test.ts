import { describe, it, expect } from 'vitest';
import { EMPTY_UNREAD_COUNTS, unreadFor } from './unread-messages';
import type { UnreadCounts } from './unread-messages';

const counts: UnreadCounts = {
  total: 7,
  by_conversation: { 'conv-a': 5, 'conv-b': 2 },
};

describe('unreadFor', () => {
  it('reads the count for a conversation that has unread messages', () => {
    expect(unreadFor(counts, 'conv-a')).toBe(5);
    expect(unreadFor(counts, 'conv-b')).toBe(2);
  });

  it('returns zero for a conversation absent from the map', () => {
    // The SQL groups by conversation, so a fully-read thread simply is not a
    // key. Indexing the record directly would hand the badge `undefined`.
    expect(unreadFor(counts, 'conv-read')).toBe(0);
  });

  it('returns zero when the fetch failed and the counts are empty', () => {
    expect(unreadFor(EMPTY_UNREAD_COUNTS, 'conv-a')).toBe(0);
    expect(EMPTY_UNREAD_COUNTS.total).toBe(0);
  });

  it('agrees with the total across the breakdown', () => {
    const summed = Object.values(counts.by_conversation).reduce((a, b) => a + b, 0);
    expect(summed).toBe(counts.total);
  });
});

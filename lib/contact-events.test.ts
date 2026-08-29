import { describe, it, expect } from 'vitest';
import { contactEventSchema, dedupeContactEvents, type ContactEventRecord } from './contact-events';

const LISTING_ID = '11111111-1111-4111-8111-111111111111';
const HIRE_ID = '22222222-2222-4222-8222-222222222222';

describe('contactEventSchema', () => {
  it('accepts a listing contact carrying a listing id', () => {
    const parsed = contactEventSchema.safeParse({
      surface: 'listing',
      channel: 'whatsapp',
      listing_id: LISTING_ID,
    });
    expect(parsed.success).toBe(true);
  });

  it('accepts a hire contact carrying a hire listing id', () => {
    const parsed = contactEventSchema.safeParse({
      surface: 'hire',
      channel: 'call',
      hire_listing_id: HIRE_ID,
    });
    expect(parsed.success).toBe(true);
  });

  it('accepts a support contact with no target', () => {
    const parsed = contactEventSchema.safeParse({ surface: 'support', channel: 'whatsapp' });
    expect(parsed.success).toBe(true);
  });

  it('rejects a listing contact with no listing id', () => {
    const parsed = contactEventSchema.safeParse({ surface: 'listing', channel: 'whatsapp' });
    expect(parsed.success).toBe(false);
  });

  it('rejects a listing contact pointing at a hire listing', () => {
    const parsed = contactEventSchema.safeParse({
      surface: 'listing',
      channel: 'whatsapp',
      listing_id: LISTING_ID,
      hire_listing_id: HIRE_ID,
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects a support contact carrying a target', () => {
    const parsed = contactEventSchema.safeParse({
      surface: 'support',
      channel: 'whatsapp',
      listing_id: LISTING_ID,
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects unknown channels and surfaces', () => {
    expect(contactEventSchema.safeParse({ surface: 'listing', channel: 'sms', listing_id: LISTING_ID }).success).toBe(false);
    expect(contactEventSchema.safeParse({ surface: 'chat', channel: 'whatsapp' }).success).toBe(false);
  });

  it('rejects a non-uuid listing id', () => {
    const parsed = contactEventSchema.safeParse({ surface: 'listing', channel: 'whatsapp', listing_id: 'abc' });
    expect(parsed.success).toBe(false);
  });
});

const event = (over: Partial<ContactEventRecord> & { id: string }): ContactEventRecord => ({
  surface: 'listing',
  listing_id: LISTING_ID,
  hire_listing_id: null,
  actor_id: null,
  visitor_key: null,
  date_day: '2026-08-28',
  ...over,
});

describe('dedupeContactEvents', () => {
  it('collapses repeat clicks by the same visitor on the same listing and day', () => {
    const rows = [
      event({ id: '1', visitor_key: 'visitor-aaa' }),
      event({ id: '2', visitor_key: 'visitor-aaa' }),
      event({ id: '3', visitor_key: 'visitor-aaa' }),
    ];
    expect(dedupeContactEvents(rows)).toHaveLength(1);
  });

  it('ignores channel, so WhatsApp then Call is one inquiry', () => {
    const rows = [
      event({ id: '1', visitor_key: 'visitor-aaa' }),
      event({ id: '2', visitor_key: 'visitor-aaa' }),
    ];
    expect(dedupeContactEvents(rows)).toHaveLength(1);
  });

  it('keeps separate visitors apart', () => {
    const rows = [
      event({ id: '1', visitor_key: 'visitor-aaa' }),
      event({ id: '2', visitor_key: 'visitor-bbb' }),
    ];
    expect(dedupeContactEvents(rows)).toHaveLength(2);
  });

  it('keeps the same visitor on different days apart', () => {
    const rows = [
      event({ id: '1', visitor_key: 'visitor-aaa', date_day: '2026-08-27' }),
      event({ id: '2', visitor_key: 'visitor-aaa', date_day: '2026-08-28' }),
    ];
    expect(dedupeContactEvents(rows)).toHaveLength(2);
  });

  it('keeps the same visitor on different listings apart', () => {
    const rows = [
      event({ id: '1', visitor_key: 'visitor-aaa' }),
      event({ id: '2', visitor_key: 'visitor-aaa', listing_id: '33333333-3333-4333-8333-333333333333' }),
    ];
    expect(dedupeContactEvents(rows)).toHaveLength(2);
  });

  it('groups a logged-in buyer by account, across browsers', () => {
    const rows = [
      event({ id: '1', actor_id: 'buyer-1', visitor_key: 'visitor-aaa' }),
      event({ id: '2', actor_id: 'buyer-1', visitor_key: 'visitor-bbb' }),
    ];
    expect(dedupeContactEvents(rows)).toHaveLength(1);
  });

  it('never merges unidentifiable events with each other', () => {
    const rows = [event({ id: '1' }), event({ id: '2' })];
    expect(dedupeContactEvents(rows)).toHaveLength(2);
  });

  it('separates a listing and a hire contact even on the same day', () => {
    const rows = [
      event({ id: '1', visitor_key: 'visitor-aaa' }),
      event({ id: '2', visitor_key: 'visitor-aaa', surface: 'hire', listing_id: null, hire_listing_id: HIRE_ID }),
    ];
    expect(dedupeContactEvents(rows)).toHaveLength(2);
  });

  it('keeps the first occurrence and preserves order', () => {
    const rows = [
      event({ id: '1', visitor_key: 'visitor-aaa' }),
      event({ id: '2', visitor_key: 'visitor-bbb' }),
      event({ id: '3', visitor_key: 'visitor-aaa' }),
    ];
    expect(dedupeContactEvents(rows).map((row) => row.id)).toEqual(['1', '2']);
  });

  it('returns an empty list unchanged', () => {
    expect(dedupeContactEvents([])).toEqual([]);
  });
});

describe('contactEventSchema visitor_key', () => {
  it('accepts a visitor key', () => {
    const parsed = contactEventSchema.safeParse({
      surface: 'support',
      channel: 'whatsapp',
      visitor_key: 'a1b2c3d4e5f6',
    });
    expect(parsed.success).toBe(true);
  });

  it('accepts an event with no visitor key (private mode)', () => {
    expect(contactEventSchema.safeParse({ surface: 'support', channel: 'whatsapp' }).success).toBe(true);
  });

  it('rejects a visitor key that is too short or too long', () => {
    expect(contactEventSchema.safeParse({ surface: 'support', channel: 'whatsapp', visitor_key: 'short' }).success).toBe(false);
    expect(contactEventSchema.safeParse({ surface: 'support', channel: 'whatsapp', visitor_key: 'x'.repeat(65) }).success).toBe(false);
  });
});

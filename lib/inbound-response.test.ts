import { describe, it, expect } from 'vitest';
import {
  bucketInboundLeads,
  formatWait,
  isInboundLead,
  waitedMinutes,
  type InboundLead,
} from './inbound-response';

const NOW = new Date('2026-08-28T12:00:00.000Z');
const minutesAgo = (n: number) => new Date(NOW.getTime() - n * 60_000).toISOString();

const lead = (over: Partial<InboundLead> & { id: string }): InboundLead => ({
  lead_type: 'buyer',
  source: 'website',
  status: 'new',
  created_at: minutesAgo(10),
  ...over,
});

describe('isInboundLead', () => {
  it('accepts new website buyer and renter requests', () => {
    expect(isInboundLead(lead({ id: '1' }))).toBe(true);
    expect(isInboundLead(lead({ id: '2', lead_type: 'renter' }))).toBe(true);
  });

  it('rejects leads we went looking for', () => {
    expect(isInboundLead(lead({ id: '1', source: 'field' }))).toBe(false);
    expect(isInboundLead(lead({ id: '2', source: 'staff' }))).toBe(false);
  });

  it('rejects supply-side lead types', () => {
    expect(isInboundLead(lead({ id: '1', lead_type: 'seller' }))).toBe(false);
    expect(isInboundLead(lead({ id: '2', lead_type: 'dealer' }))).toBe(false);
  });

  it('rejects leads somebody has already picked up', () => {
    expect(isInboundLead(lead({ id: '1', status: 'contacted' }))).toBe(false);
    expect(isInboundLead(lead({ id: '2', status: 'closed' }))).toBe(false);
  });
});

describe('waitedMinutes', () => {
  it('measures the wait since the request arrived', () => {
    expect(waitedMinutes(lead({ id: '1', created_at: minutesAgo(90) }), NOW)).toBe(90);
  });

  it('never reports a negative wait for a future timestamp', () => {
    expect(waitedMinutes(lead({ id: '1', created_at: minutesAgo(-30) }), NOW)).toBe(0);
  });

  it('treats an unparseable timestamp as no wait rather than NaN', () => {
    expect(waitedMinutes(lead({ id: '1', created_at: 'not-a-date' }), NOW)).toBe(0);
  });
});

describe('bucketInboundLeads', () => {
  it('splits on the response promise', () => {
    const { late, waiting } = bucketInboundLeads(
      [
        lead({ id: 'fresh', created_at: minutesAgo(5) }),
        lead({ id: 'stale', created_at: minutesAgo(300) }),
      ],
      { now: NOW }
    );

    expect(late.map((l) => l.id)).toEqual(['stale']);
    expect(waiting.map((l) => l.id)).toEqual(['fresh']);
  });

  it('counts a lead exactly at the threshold as late', () => {
    const { late } = bucketInboundLeads([lead({ id: 'boundary', created_at: minutesAgo(120) })], { now: NOW });
    expect(late.map((l) => l.id)).toEqual(['boundary']);
  });

  it('orders both lists longest wait first', () => {
    const { late, waiting } = bucketInboundLeads(
      [
        lead({ id: 'late-newer', created_at: minutesAgo(150) }),
        lead({ id: 'waiting-newer', created_at: minutesAgo(5) }),
        lead({ id: 'late-older', created_at: minutesAgo(600) }),
        lead({ id: 'waiting-older', created_at: minutesAgo(60) }),
      ],
      { now: NOW }
    );

    expect(late.map((l) => l.id)).toEqual(['late-older', 'late-newer']);
    expect(waiting.map((l) => l.id)).toEqual(['waiting-older', 'waiting-newer']);
  });

  it('reports the longest wait across both buckets', () => {
    const buckets = bucketInboundLeads(
      [lead({ id: 'a', created_at: minutesAgo(20) }), lead({ id: 'b', created_at: minutesAgo(400) })],
      { now: NOW }
    );
    expect(buckets.oldestWaitMinutes).toBe(400);
  });

  it('excludes outbound and already-handled leads entirely', () => {
    const buckets = bucketInboundLeads(
      [
        lead({ id: 'outbound', source: 'field', created_at: minutesAgo(999) }),
        lead({ id: 'handled', status: 'contacted', created_at: minutesAgo(999) }),
      ],
      { now: NOW }
    );

    expect(buckets.late).toEqual([]);
    expect(buckets.waiting).toEqual([]);
    expect(buckets.oldestWaitMinutes).toBe(0);
  });

  it('honours a custom SLA', () => {
    const rows = [lead({ id: 'a', created_at: minutesAgo(45) })];
    expect(bucketInboundLeads(rows, { now: NOW, slaMinutes: 30 }).late).toHaveLength(1);
    expect(bucketInboundLeads(rows, { now: NOW, slaMinutes: 60 }).waiting).toHaveLength(1);
  });

  it('handles an empty list', () => {
    expect(bucketInboundLeads([], { now: NOW })).toEqual({ late: [], waiting: [], oldestWaitMinutes: 0 });
  });
});

describe('formatWait', () => {
  it('shows minutes under an hour', () => {
    expect(formatWait(0)).toBe('0 min');
    expect(formatWait(45)).toBe('45 min');
  });

  it('shows hours and zero-padded minutes above an hour', () => {
    expect(formatWait(60)).toBe('1 h 00');
    expect(formatWait(185)).toBe('3 h 05');
  });
});

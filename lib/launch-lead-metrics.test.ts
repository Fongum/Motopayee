import { describe, it, expect } from 'vitest';
import {
  CLOSED_LEAD_STATUSES,
  NO_CAMPAIGN_LABEL,
  OPEN_LEAD_STATUSES,
  STALE_LEAD_DAYS,
  campaignLabel,
  campaignPerformance,
  conversionRate,
  isOpenLeadStatus,
  topN,
  windowStart,
  workloadByStaff,
} from './launch-lead-metrics';

describe('lead status vocabulary', () => {
  it('treats the three terminal statuses as closed', () => {
    for (const status of CLOSED_LEAD_STATUSES) {
      expect(isOpenLeadStatus(status)).toBe(false);
    }
  });

  it('treats every in-play status as open', () => {
    for (const status of OPEN_LEAD_STATUSES) {
      expect(isOpenLeadStatus(status)).toBe(true);
    }
  });

  it('includes the statuses migration 028 added', () => {
    // These were bolted on later; the metric functions receive this list as a
    // parameter precisely so it cannot drift out of sync again.
    expect(isOpenLeadStatus('awaiting_assets')).toBe(true);
    expect(isOpenLeadStatus('ready_for_listing')).toBe(true);
  });

  it('does not treat an unknown status as open', () => {
    expect(isOpenLeadStatus('archived')).toBe(false);
    expect(isOpenLeadStatus('')).toBe(false);
  });
});

describe('conversionRate', () => {
  it('returns whole percents', () => {
    expect(conversionRate(25, 100)).toBe(25);
    expect(conversionRate(1, 3)).toBe(33);
  });

  it('returns zero for an empty window rather than NaN', () => {
    // total = 0 used to divide by zero and render "NaN%".
    expect(conversionRate(0, 0)).toBe(0);
  });

  it('does not go negative on nonsense input', () => {
    expect(conversionRate(5, -1)).toBe(0);
  });
});

describe('windowStart', () => {
  it('reaches back the requested number of days', () => {
    const now = new Date('2026-08-31T12:00:00.000Z');
    expect(windowStart(30, now)).toBe('2026-08-01T12:00:00.000Z');
  });

  it('uses the stale threshold consistently', () => {
    expect(STALE_LEAD_DAYS).toBe(7);
  });
});

describe('campaignLabel', () => {
  it('names the no-campaign bucket', () => {
    // The SQL coalesces a null campaign to '', so the label is applied here.
    expect(campaignLabel('')).toBe(NO_CAMPAIGN_LABEL);
  });

  it('leaves a real campaign name alone', () => {
    expect(campaignLabel('Octobre Douala')).toBe('Octobre Douala');
  });
});

describe('topN', () => {
  it('takes the leading slice', () => {
    expect(topN([1, 2, 3, 4, 5], 3)).toEqual([1, 2, 3]);
  });

  it('returns everything when there are fewer rows than asked for', () => {
    expect(topN([1, 2], 5)).toEqual([1, 2]);
  });
});

describe('workloadByStaff', () => {
  const staff = [
    { id: 'a', full_name: 'Amina', email: 'amina@example.com' },
    { id: 'b', full_name: null, email: 'bruno@example.com' },
    { id: 'c', full_name: 'Chantal', email: 'chantal@example.com' },
  ];

  it('keeps staff with no open leads on the board, at zero', () => {
    // A workload view that hides idle staff defeats its own purpose.
    const rows = workloadByStaff(staff, [{ assigned_to: 'a', open: 3, due: 1 }]);
    expect(rows).toHaveLength(3);
    expect(rows.find((r) => r.id === 'c')).toEqual({ id: 'c', name: 'Chantal', open: 0, due: 0 });
  });

  it('falls back to the email when a member has no name', () => {
    const rows = workloadByStaff(staff, []);
    expect(rows.find((r) => r.id === 'b')?.name).toBe('bruno@example.com');
  });

  it('sorts by open desc, then due desc, then name', () => {
    const rows = workloadByStaff(staff, [
      { assigned_to: 'a', open: 2, due: 0 },
      { assigned_to: 'b', open: 5, due: 2 },
      { assigned_to: 'c', open: 2, due: 4 },
    ]);
    expect(rows.map((r) => r.id)).toEqual(['b', 'c', 'a']);
  });

  it('ignores counts for staff not on the list', () => {
    const rows = workloadByStaff(staff, [{ assigned_to: 'ghost', open: 9, due: 9 }]);
    expect(rows.every((r) => r.open === 0)).toBe(true);
  });
});

describe('campaignPerformance', () => {
  const campaigns = [
    { campaign: 'Octobre', total: 10, open: 4, converted: 5 },
    { campaign: '', total: 6, open: 6, converted: 0 },
  ];

  it('joins the due counts, which come from a different query', () => {
    const rows = campaignPerformance(campaigns, [{ campaign: 'Octobre', due: 3 }]);
    expect(rows[0].due).toBe(3);
  });

  it('shows zero due for a campaign with no outstanding follow-ups', () => {
    const rows = campaignPerformance(campaigns, []);
    expect(rows.every((r) => r.due === 0)).toBe(true);
  });

  it('labels the empty campaign bucket', () => {
    const rows = campaignPerformance(campaigns, []);
    expect(rows[1].campaign).toBe(NO_CAMPAIGN_LABEL);
  });

  it('computes a per-campaign conversion rate', () => {
    const rows = campaignPerformance(campaigns, []);
    expect(rows[0].conversionRate).toBe(50);
    expect(rows[1].conversionRate).toBe(0);
  });

  it('respects the row limit', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      campaign: `c${i}`, total: 20 - i, open: 1, converted: 1,
    }));
    expect(campaignPerformance(many, [], 8)).toHaveLength(8);
  });
});

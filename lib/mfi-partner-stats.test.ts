import { describe, it, expect } from 'vitest';
import {
  EMPTY_PARTNER_STATS,
  INACTIVE_APPLICATION_STATUSES,
  disbursedValue,
  institutionStats,
  isActiveApplicationStatus,
  partnerContactEmail,
  totalDisbursedValue,
} from './mfi-partner-stats';
import type { PartnerStats } from './mfi-partner-stats';

const stats: PartnerStats = {
  totals: {
    active_partners: 4,
    linked_users: 7,
    assigned_applications: 120,
    disbursed_value: '48500000.00',
  },
  by_institution: {
    'inst-a': {
      applications: 30,
      active_applications: 12,
      disbursed_value: '18000000',
      offers: 22,
      interested_offers: 9,
      users: 2,
      primary_user_email: 'partner@example.com',
      primary_user_name: 'Amina Nkeng',
    },
  },
};

describe('application status vocabulary', () => {
  it('treats the three terminal statuses as inactive', () => {
    expect([...INACTIVE_APPLICATION_STATUSES]).toEqual(['rejected', 'withdrawn', 'disbursed']);
    for (const status of INACTIVE_APPLICATION_STATUSES) {
      expect(isActiveApplicationStatus(status)).toBe(false);
    }
  });

  it('treats anything else as still in play', () => {
    // It is an exclusion list, so a status added later counts as active by
    // default — which is the safer direction for a queue nobody is watching.
    expect(isActiveApplicationStatus('submitted')).toBe(true);
    expect(isActiveApplicationStatus('under_review')).toBe(true);
    expect(isActiveApplicationStatus('approved')).toBe(true);
  });

  it('counts disbursed as inactive, not active', () => {
    // Disbursed money has left the pipeline; counting it as an open file would
    // overstate every partner's current workload.
    expect(isActiveApplicationStatus('disbursed')).toBe(false);
  });
});

describe('institutionStats', () => {
  it('returns the rollup for an institution that has one', () => {
    expect(institutionStats(stats, 'inst-a').applications).toBe(30);
  });

  it('returns zeros for a partner with no applications yet', () => {
    // Absent from the rollup means no rows, and the roster must still render
    // that partner's row rather than crash on an undefined lookup.
    const empty = institutionStats(stats, 'inst-unknown');
    expect(empty.applications).toBe(0);
    expect(empty.offers).toBe(0);
    expect(empty.users).toBe(0);
    expect(empty.primary_user_email).toBeNull();
  });

  it('returns zeros across the board when the rollup failed to load', () => {
    expect(institutionStats(EMPTY_PARTNER_STATS, 'inst-a').applications).toBe(0);
  });
});

describe('disbursed values', () => {
  it('parses the per-institution amount from its string form', () => {
    expect(disbursedValue(institutionStats(stats, 'inst-a'))).toBe(18_000_000);
  });

  it('parses the platform total', () => {
    expect(totalDisbursedValue(stats)).toBe(48_500_000);
  });

  it('reads zero when there is nothing disbursed', () => {
    expect(disbursedValue(institutionStats(stats, 'nobody'))).toBe(0);
    expect(totalDisbursedValue(EMPTY_PARTNER_STATS)).toBe(0);
  });
});

describe('partnerContactEmail', () => {
  it('prefers a linked portal account', () => {
    expect(partnerContactEmail(institutionStats(stats, 'inst-a'), 'desk@bank.cm')).toBe('partner@example.com');
  });

  it("falls back to the institution's own contact address", () => {
    expect(partnerContactEmail(institutionStats(stats, 'nobody'), 'desk@bank.cm')).toBe('desk@bank.cm');
  });

  it('returns null when neither exists, so the invite link is hidden', () => {
    expect(partnerContactEmail(institutionStats(stats, 'nobody'), null)).toBeNull();
  });
});

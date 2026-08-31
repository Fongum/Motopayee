import { describe, it, expect } from 'vitest';
import {
  COMMISSION_STATUSES,
  PIPELINE_STATUSES,
  commissionAmount,
  commissionCount,
  financeListSelect,
  firstEmbedded,
  isCommissionStatus,
  isPipelineStatus,
  pipelineCount,
  pipelineValue,
} from './finance-dashboard';
import { toAmount } from './status-totals';

describe('status vocabularies', () => {
  it('mirrors the finance_commissions status CHECK constraint', () => {
    // Migration 021: check (status in ('expected','invoiced','paid','waived')).
    expect([...COMMISSION_STATUSES]).toEqual(['expected', 'invoiced', 'paid', 'waived']);
  });

  it('accepts only real commission statuses', () => {
    expect(isCommissionStatus('paid')).toBe(true);
    expect(isCommissionStatus('settled')).toBe(false);
    expect(isCommissionStatus(undefined)).toBe(false);
    expect(isCommissionStatus('')).toBe(false);
  });

  it('accepts only the two live pipeline statuses', () => {
    expect([...PIPELINE_STATUSES]).toEqual(['approved', 'disbursed']);
    expect(isPipelineStatus('approved')).toBe(true);
    expect(isPipelineStatus('rejected')).toBe(false);
    expect(isPipelineStatus(null)).toBe(false);
  });
});

describe('toAmount', () => {
  it('parses the string form Postgres numeric arrives in', () => {
    // commission_amount_xaf is numeric(15,2); it is returned as text so the
    // precision survives, which means every read has to convert.
    expect(toAmount('1250000.00')).toBe(1_250_000);
  });

  it('treats a missing bucket as zero, not an error', () => {
    expect(toAmount(undefined)).toBe(0);
    expect(toAmount(null)).toBe(0);
  });

  it('does not propagate NaN into a displayed total', () => {
    expect(toAmount('not-a-number')).toBe(0);
  });
});

describe('commission totals', () => {
  const totals = {
    expected: { count: 4, amount: '800000.00' },
    paid: { count: 2, amount: '450000.50' },
  };

  it('reads the count and amount for a present status', () => {
    expect(commissionCount(totals, 'expected')).toBe(4);
    expect(commissionAmount(totals, 'paid')).toBe(450_000.5);
  });

  it('reports zero for a status with no rows', () => {
    // The SQL aggregates by status, so a status nobody has used is simply absent
    // from the object — that is zero, and must render as zero.
    expect(commissionCount(totals, 'waived')).toBe(0);
    expect(commissionAmount(totals, 'waived')).toBe(0);
  });

  it('reports zero when the whole fetch failed', () => {
    expect(commissionCount({}, 'paid')).toBe(0);
    expect(commissionAmount({}, 'paid')).toBe(0);
  });
});

describe('pipeline totals', () => {
  const totals = { approved: { count: 3, amount: '15000000' } };

  it('reads the count and financed value', () => {
    expect(pipelineCount(totals, 'approved')).toBe(3);
    expect(pipelineValue(totals, 'approved')).toBe(15_000_000);
  });

  it('reports zero for the status with no rows', () => {
    expect(pipelineCount(totals, 'disbursed')).toBe(0);
    expect(pipelineValue(totals, 'disbursed')).toBe(0);
  });
});

describe('financeListSelect', () => {
  it('embeds the commission so no second query is needed', () => {
    expect(financeListSelect(false)).toContain('commission:finance_commissions(');
  });

  it('makes the embed inner when filtering on commission status', () => {
    // Expressing the filter as a join replaces a pre-query that resolved
    // application ids into `.in()` — unbounded, so PostgREST silently dropped
    // every match past the thousandth.
    expect(financeListSelect(true)).toContain('finance_commissions!inner');
  });

  it('leaves the embed outer otherwise, so applications without one still list', () => {
    expect(financeListSelect(false)).not.toContain('!inner');
  });

  it('keeps the buyer and vehicle joins the table renders', () => {
    const select = financeListSelect(false);
    expect(select).toContain('buyer:profiles!buyer_id');
    expect(select).toContain('vehicle:vehicles');
    expect(select).toContain('mfi:mfi_institutions');
  });
});

describe('firstEmbedded', () => {
  it('unwraps the array form PostgREST returns for a to-many embed', () => {
    expect(firstEmbedded([{ id: 'a' }, { id: 'b' }])).toEqual({ id: 'a' });
  });

  it('passes an object embed straight through', () => {
    expect(firstEmbedded({ id: 'a' })).toEqual({ id: 'a' });
  });

  it('returns null for an application with no commission yet', () => {
    expect(firstEmbedded([])).toBeNull();
    expect(firstEmbedded(null)).toBeNull();
    expect(firstEmbedded(undefined)).toBeNull();
  });
});

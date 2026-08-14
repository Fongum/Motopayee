import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * computeEligibility is a thin wrapper over the zone_rules lookup, so the
 * behaviour worth pinning down is the fallback: any miss or DB error must
 * degrade to the conservative, manual-review default rather than approving
 * financing by accident.
 */

type MaybeSingleResult = { data: unknown; error: unknown };

let maybeSingle: ReturnType<typeof vi.fn>;
let eq: ReturnType<typeof vi.fn>;
let from: ReturnType<typeof vi.fn>;

function mockSupabase(result: MaybeSingleResult) {
  maybeSingle = vi.fn(async () => result);
  // .eq() is chained four times before .maybeSingle()
  const chain: Record<string, unknown> = {};
  eq = vi.fn(() => chain);
  chain.eq = eq;
  chain.maybeSingle = maybeSingle;
  const select = vi.fn(() => chain);
  from = vi.fn(() => ({ select }));
  return { from };
}

async function loadModule(result: MaybeSingleResult) {
  vi.resetModules();
  vi.doMock('./auth/server', () => ({ supabaseAdmin: mockSupabase(result) }));
  return import('./rules');
}

const CONSERVATIVE_DEFAULT = {
  financeable: false,
  down_payment_percent: 40,
  max_tenor: 12,
  manual_review_required: true,
};

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.doUnmock('./auth/server');
  vi.restoreAllMocks();
});

describe('computeEligibility', () => {
  it('maps a matching rule onto the eligibility result', async () => {
    const { computeEligibility } = await loadModule({
      data: {
        financeable: true,
        down_payment_percent: 20,
        max_tenor_months: 36,
        manual_review_required: false,
      },
      error: null,
    });

    const result = await computeEligibility('A', 'A', 'green', 'A');

    expect(result).toEqual({
      financeable: true,
      down_payment_percent: 20,
      max_tenor: 36,
      manual_review_required: false,
    });
  });

  it('renames max_tenor_months to max_tenor', async () => {
    const { computeEligibility } = await loadModule({
      data: {
        financeable: true,
        down_payment_percent: 30,
        max_tenor_months: 24,
        manual_review_required: false,
      },
      error: null,
    });

    const result = await computeEligibility('B', 'B', 'yellow', 'B');

    expect(result.max_tenor).toBe(24);
    expect(result).not.toHaveProperty('max_tenor_months');
  });

  it('falls back to the conservative default when no rule matches', async () => {
    const { computeEligibility } = await loadModule({ data: null, error: null });

    const result = await computeEligibility('C', 'D', 'red', 'D');

    expect(result).toEqual(CONSERVATIVE_DEFAULT);
  });

  it('falls back to the conservative default on a query error', async () => {
    const { computeEligibility } = await loadModule({
      data: null,
      error: { message: 'connection reset' },
    });

    const result = await computeEligibility('A', 'A', 'green', 'A');

    expect(result).toEqual(CONSERVATIVE_DEFAULT);
  });

  it('never reports financeable when the lookup fails', async () => {
    const { computeEligibility } = await loadModule({
      data: { financeable: true },
      error: { message: 'boom' },
    });

    const result = await computeEligibility('A', 'A', 'green', 'A');

    expect(result.financeable).toBe(false);
    expect(result.manual_review_required).toBe(true);
  });

  it('queries zone_rules on all four dimensions', async () => {
    const { computeEligibility } = await loadModule({ data: null, error: null });

    await computeEligibility('B', 'C', 'yellow', 'B');

    expect(from).toHaveBeenCalledWith('zone_rules');
    expect(eq).toHaveBeenCalledWith('zone', 'B');
    expect(eq).toHaveBeenCalledWith('income_grade', 'C');
    expect(eq).toHaveBeenCalledWith('vehicle_price_band', 'yellow');
    expect(eq).toHaveBeenCalledWith('condition_grade', 'B');
  });
});

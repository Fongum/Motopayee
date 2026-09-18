import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Every financing decision comes from one row of zone_rules.
 *
 * `computeEligibility` looks a row up by the exact four-part key and, when it
 * finds nothing, falls back to "not financeable, 40% down, 12 months, manual
 * review". That fallback is the right conservative choice, but it is
 * indistinguishable from a real decision: a buyer who hits it is refused and
 * nobody is told the rule was simply absent.
 *
 * `maybeSingle()` makes a duplicate just as bad — two rows for one key raise an
 * error, which lands in the same fallback. So the matrix must be exactly
 * complete and exactly unique.
 *
 * The seed lives in migration 003, so this is checked from the file rather than
 * against a live database. Verified against production on 2026-09-12: 144 rows,
 * 144 distinct keys, no gaps, no duplicates.
 */

const ZONES = ['A', 'B', 'C'] as const;
const INCOME_GRADES = ['A', 'B', 'C', 'D'] as const;
const PRICE_BANDS = ['green', 'yellow', 'red'] as const;
const CONDITION_GRADES = ['A', 'B', 'C', 'D'] as const;

const EXPECTED = ZONES.length * INCOME_GRADES.length * PRICE_BANDS.length * CONDITION_GRADES.length;

interface Rule {
  key: string;
  financeable: boolean;
  downPayment: number;
  maxTenor: number;
  manualReview: boolean;
}

function seededRules(): Rule[] {
  const sql = readFileSync(join(process.cwd(), 'supabase', 'migrations', '003_applications.sql'), 'utf8');
  const start = sql.indexOf('insert into public.zone_rules');
  expect(start).toBeGreaterThan(-1);
  const block = sql.slice(start, sql.indexOf(';', start));

  const re = /\(\s*'(\w)'\s*,\s*'(\w)'\s*,\s*'(\w+)'\s*,\s*'(\w)'\s*,\s*(true|false)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(true|false)\s*\)/g;
  const out: Rule[] = [];
  let m;
  while ((m = re.exec(block))) {
    out.push({
      key: `${m[1]}|${m[2]}|${m[3]}|${m[4]}`,
      financeable: m[5] === 'true',
      downPayment: Number(m[6]),
      maxTenor: Number(m[7]),
      manualReview: m[8] === 'true',
    });
  }
  return out;
}

const RULES = seededRules();

describe('zone rules matrix', () => {
  it('parses the seed', () => {
    // Non-vacuity: a regex that matched nothing would make the rest pass empty.
    expect(RULES.length).toBeGreaterThan(100);
  });

  it('covers every combination exactly once', () => {
    const keys = RULES.map((r) => r.key);
    expect(keys.length).toBe(EXPECTED);
    expect(new Set(keys).size).toBe(EXPECTED);
  });

  it('has no gap that would silently refuse a buyer', () => {
    const present = new Set(RULES.map((r) => r.key));
    const missing: string[] = [];
    for (const z of ZONES) {
      for (const i of INCOME_GRADES) {
        for (const b of PRICE_BANDS) {
          for (const c of CONDITION_GRADES) {
            const key = `${z}|${i}|${b}|${c}`;
            if (!present.has(key)) missing.push(key);
          }
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it('has no duplicate, which maybeSingle turns into a refusal', () => {
    const counts = new Map<string, number>();
    for (const r of RULES) counts.set(r.key, (counts.get(r.key) ?? 0) + 1);
    expect(Array.from(counts).filter(([, n]) => n > 1).map(([k]) => k)).toEqual([]);
  });
});

describe('the terms each rule offers', () => {
  it('never offers a deposit outside 0-100 percent', () => {
    const bad = RULES.filter((r) => r.downPayment < 0 || r.downPayment > 100);
    expect(bad.map((r) => r.key)).toEqual([]);
  });

  it('never offers a financeable rule with a zero tenor', () => {
    // Financeable with no months to repay over is not an offer.
    const bad = RULES.filter((r) => r.financeable && r.maxTenor <= 0);
    expect(bad.map((r) => r.key)).toEqual([]);
  });

  it('is never more generous than the conservative fallback while refusing', () => {
    // A refusing rule should not advertise better terms than the fallback used
    // when no rule exists at all, or the fallback stops being conservative.
    const bad = RULES.filter((r) => !r.financeable && r.downPayment < 40 && !r.manualReview);
    expect(bad.map((r) => r.key)).toEqual([]);
  });

  it('keeps at least one financeable path in every zone', () => {
    // A zone where nothing at all can be financed would be a policy decision,
    // not a data entry accident — this fails loudly if it happens by accident.
    for (const z of ZONES) {
      const financeable = RULES.filter((r) => r.key.startsWith(`${z}|`) && r.financeable);
      expect(financeable.length, `zone ${z} has no financeable combination`).toBeGreaterThan(0);
    }
  });
});

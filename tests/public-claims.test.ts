import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * docs/trust-verification-policy.md carries a "Claims MotoPayee Must Avoid"
 * list, and /trust publishes it: that page tells visitors MotoPayee does *not*
 * say all vehicles are verified or inspected.
 *
 * The marketing copy said the opposite. /listings read "Tous nos véhicules sont
 * inspectés, vérifiés et prêts à financer" and the homepage said "chaque
 * véhicule est inspecté, chaque document vérifié" — so two public pages
 * contradicted each other on the platform's central promise, and the one making
 * the stronger claim was the one that was wrong.
 *
 * These patterns are deliberately narrow. A broad search for "vérifié" would
 * catch the honest per-listing labels, which are exactly what the policy asks
 * for ("verified where marked").
 */

const APP = join(process.cwd(), 'app');

/** Public pages: anything outside the staff and account areas. */
const STAFF_OR_PRIVATE = ['admin', 'mfi', 'inspector', 'field', 'me', 'api'];

function publicPages(dir = APP, rel = ''): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (rel === '' && STAFF_OR_PRIVATE.includes(e.name)) continue;
      out.push(...publicPages(join(dir, e.name), `${rel}/${e.name}`));
    } else if (/^page\.tsx$/.test(e.name) || /^layout\.tsx$/.test(e.name)) {
      out.push(join(dir, e.name));
    }
  }
  return out;
}

/** Each is a claim the policy forbids, written as it would appear in French. */
const FORBIDDEN: Array<{ label: string; re: RegExp }> = [
  { label: 'all vehicles are verified', re: /tous\s+(?:les|nos)\s+v[ée]hicules\s+sont\s+v[ée]rifi/i },
  { label: 'all vehicles are inspected', re: /tous\s+(?:les|nos)\s+v[ée]hicules\s+sont\s+inspect/i },
  { label: 'all listings inspected and verified', re: /tous\s+(?:les|nos)\s+v[ée]hicules\s+sont\s+inspect[ée]s,\s*v[ée]rifi/i },
  { label: 'every vehicle is inspected', re: /chaque\s+v[ée]hicule\s+est\s+inspect/i },
  { label: 'every document is verified', re: /chaque\s+document\s+(?:est\s+)?v[ée]rifi/i },
  { label: 'financing guaranteed', re: /financement\s+(?:est\s+)?garanti/i },
  { label: 'MotoPayee guarantees the transaction', re: /MotoPayee\s+garantit\s+la\s+transaction/i },
  { label: 'no risk', re: /sans\s+risque/i },
  { label: 'cheapest in Cameroon', re: /moins\s+chers?\s+(?:du|au)\s+Cameroun/i },
  { label: 'all sellers are trusted', re: /tous\s+(?:les|nos)\s+vendeurs\s+sont\s+(?:de\s+confiance|fiables)/i },
  { label: 'deposits protected by MotoPayee', re: /cautions?\s+(?:sont\s+)?(?:prot[ée]g|garanti)/i },
  { label: 'MotoPayee is the lender', re: /MotoPayee\s+(?:est\s+)?(?:le\s+)?pr[êe]teur/i },
  { label: 'number one marketplace', re: /(?:marketplace|plateforme)[^.\n]{0,40}(?:#1\b|n[°o]\s*1\b|num[ée]ro\s*1)/i },
];

const PAGES = publicPages();

describe('public pages', () => {
  it('finds the public pages', () => {
    // Non-vacuity: an empty list would make every check below pass.
    expect(PAGES.length).toBeGreaterThan(10);
    expect(PAGES.some((p) => p.endsWith(join('app', 'page.tsx')))).toBe(true);
  });

  it('makes none of the claims the policy forbids', () => {
    const offences: string[] = [];
    for (const file of PAGES) {
      const src = readFileSync(file, 'utf8');
      // /trust quotes the forbidden claims in order to disown them.
      if (file.includes(`${join('app', 'trust')}`)) continue;
      for (const { label, re } of FORBIDDEN) {
        if (re.test(src)) {
          offences.push(`${file.replace(process.cwd(), '').replace(/\\/g, '/')}: ${label}`);
        }
      }
    }
    expect(offences).toEqual([]);
  });
});

describe('the policy and /trust still agree', () => {
  it('keeps the forbidden list in the policy', () => {
    const policy = readFileSync(join(process.cwd(), 'docs', 'trust-verification-policy.md'), 'utf8');
    expect(policy).toContain('## Claims MotoPayee Must Avoid');
    expect(policy).toContain('Every car is verified.');
  });

  it('keeps /trust disowning them publicly', () => {
    const trust = readFileSync(join(APP, 'trust', 'page.tsx'), 'utf8');
    expect(trust).toMatch(/Tous les vehicules sont verifies\.|Tous les véhicules sont vérifiés\./);
    expect(trust).toMatch(/ne promettons pas/);
  });
});

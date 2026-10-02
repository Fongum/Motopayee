import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { IMPORT_OFFER_PUBLIC_COLUMNS } from '@/lib/import-offer-public';

/**
 * What an unauthenticated GET may hand out.
 *
 * `select('*')` on a public route serves every column a table will ever have,
 * including ones added later for staff. Three did exactly that:
 * - GET /api/listings/[id] served MotoPayee's internal valuation (mve_low,
 *   mve_high, suggested_price), the price_band withdrawn from public display,
 *   and the vehicle's VIN and inspection notes.
 * - GET /api/imports/offers served partner_name, external_url and lot_number,
 *   enough to find the auction lot and buy it without MotoPayee.
 * - GET /api/hire/[id] served the plate number and the owner's coordinates —
 *   and served unpublished listings to anyone, despite a comment saying not.
 */

const API_DIR = join(process.cwd(), 'app', 'api');
// getCurrentUser() is deliberately absent: it returns null rather than
// rejecting, so a handler that calls it can still answer the public.
const AUTH = /authenticateRequest|require[A-Z][A-Za-z]*\(|CRON_SECRET|isCron/;
const STAR = /select\(\s*['`]\s*\*|^\s*\*\s*,/m;

/**
 * Public GETs allowed a top-level `*`, each for a stated reason. Adding a
 * route here is a decision about every column that table will ever gain.
 */
const STAR_ALLOWED: Record<string, string> = {
  'insurance/route.ts': 'insurance_partners is a public partner directory',
  'reviews/route.ts': 'only published reviews; every reviews column is shown on the page',
  'hire/[id]/route.ts': 'strips HIRE_PRIVATE_COLUMNS before answering the public',
};

function routeFiles(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) routeFiles(full, out);
    else if (e.name === 'route.ts') out.push(full);
  }
  return out;
}

/** The GET handler's own source, following `export const GET = handler`. */
function getHandler(src: string): string | null {
  const m = src.match(/export (async function GET|const GET)[\s\S]*?(?=\nexport |$)/);
  if (!m) return null;
  const alias = m[0].match(/const GET\s*=\s*(\w+)/);
  if (alias) {
    const h = src.match(new RegExp(`function ${alias[1]}[\\s\\S]*?(?=\\nexport |$)`));
    if (h) return h[0];
  }
  return m[0];
}

const publicGets = routeFiles(API_DIR)
  .map((file) => ({ file: relative(API_DIR, file).split(sep).join('/'), body: getHandler(readFileSync(file, 'utf8')) }))
  .filter((r): r is { file: string; body: string } => r.body !== null && !AUTH.test(r.body));

describe('public GET routes', () => {
  it('finds the public GETs (guards against a parser that matches nothing)', () => {
    const files = publicGets.map((r) => r.file);
    expect(files).toContain('listings/[id]/route.ts');
    expect(files).toContain('imports/offers/route.ts');
    expect(files.length).toBeGreaterThanOrEqual(6);
  });

  it('do not select * unless explicitly allowed', () => {
    const offenders = publicGets
      .filter((r) => STAR.test(r.body) && !(r.file in STAR_ALLOWED))
      .map((r) => r.file);
    expect(offenders).toEqual([]);
  });

  it('every allowance still names a public GET (no stale exemptions)', () => {
    const files = new Set(publicGets.map((r) => r.file));
    for (const file of Object.keys(STAR_ALLOWED)) expect(files.has(file)).toBe(true);
  });
});

describe('GET /api/listings/[id]', () => {
  const body = getHandler(readFileSync(join(API_DIR, 'listings', '[id]', 'route.ts'), 'utf8')) ?? '';
  const select = body.match(/\.select\(\s*`([\s\S]*?)`/)?.[1] ?? '';

  it.each(['mve_low', 'mve_high', 'suggested_price', 'price_band', 'vin', 'inspection_notes', 'inspector_id', 'verifier_id'])(
    'does not serve %s',
    (column) => {
      expect(select).not.toBe('');
      expect(select).not.toMatch(new RegExp(`\\b${column}\\b`));
      expect(select).not.toMatch(/\(\s*\*\s*\)|^\s*\*/m);
    }
  );
});

describe('public import offer columns', () => {
  const columns = new Set(IMPORT_OFFER_PUBLIC_COLUMNS.split(', '));

  it.each(['partner_name', 'external_ref', 'external_url', 'lot_number', 'vin_last6', 'created_by'])(
    'exclude %s',
    (column) => expect(columns.has(column)).toBe(false)
  );

  it('include every field the public import pages render', () => {
    // The other direction: a field rendered but not selected silently shows
    // nothing (how the homepage financing badge died).
    const pages = ['app/imports/page.tsx', 'app/imports/offers/[id]/page.tsx'];
    const rendered = new Set<string>();
    for (const page of pages) {
      const src = readFileSync(join(process.cwd(), page), 'utf8');
      for (const m of Array.from(src.matchAll(/\boffer\??\.([a-z_0-9]+)/g))) rendered.add(m[1]);
    }
    expect(rendered.size).toBeGreaterThan(10);
    const missing = Array.from(rendered).filter((field) => !columns.has(field));
    expect(missing).toEqual([]);
  });
});

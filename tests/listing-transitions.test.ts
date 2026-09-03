import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The listing workflow is defined in two places that disagreed.
 *
 * `VALID_TRANSITIONS` in the admin publish route gates what staff may do. Other
 * routes move a listing directly — the field agent's upload sets `media_done`,
 * the seller's submit sets `ownership_submitted`. When the table forbids a move
 * another route performs, the same step is possible through one door and a 400
 * through another.
 *
 * These read both the table and the schema rather than restating them, so a
 * status added to the constraint without a route to reach it shows up here.
 */

const PUBLISH_ROUTE = join(process.cwd(), 'app', 'api', 'admin', 'listings', '[id]', 'publish', 'route.ts');
const MIGRATIONS = join(process.cwd(), 'supabase', 'migrations');

/** Statuses the listings CHECK constraint allows, in schema order. */
function schemaStatuses(): string[] {
  const sql = readFileSync(join(MIGRATIONS, '002_listings.sql'), 'utf8');
  const block = /status\s+text not null default 'draft' check \(status in \(([\s\S]*?)\)\)/.exec(sql);
  if (!block) throw new Error('listings status constraint not found');
  return Array.from(block[1].matchAll(/'(\w+)'/g)).map((m) => m[1]);
}

/** The transition table, parsed out of the route. */
function transitions(): Record<string, string[]> {
  const src = readFileSync(PUBLISH_ROUTE, 'utf8');
  const block = /const VALID_TRANSITIONS[^=]*=\s*\{([\s\S]*?)\n\};/.exec(src);
  if (!block) throw new Error('VALID_TRANSITIONS not found');
  const out: Record<string, string[]> = {};
  for (const line of block[1].split('\n')) {
    const m = /^\s*(\w+):\s*\[([^\]]*)\]/.exec(line);
    if (!m) continue;
    out[m[1]] = Array.from(m[2].matchAll(/'(\w+)'/g)).map((x) => x[1]);
  }
  return out;
}

const STATUSES = schemaStatuses();
const TABLE = transitions();

describe('listing status vocabulary', () => {
  it('parses both definitions', () => {
    // Non-vacuity: a parser that matched nothing would make everything below
    // pass with no content.
    expect(STATUSES.length).toBeGreaterThanOrEqual(8);
    expect(Object.keys(TABLE).length).toBeGreaterThanOrEqual(6);
  });

  it('only names statuses the database accepts', () => {
    const known = new Set(STATUSES);
    const unknown: string[] = [];
    for (const [from, tos] of Object.entries(TABLE)) {
      if (!known.has(from)) unknown.push(from);
      for (const to of tos) if (!known.has(to)) unknown.push(`${from} -> ${to}`);
    }
    expect(unknown).toEqual([]);
  });
});

describe('every status is reachable', () => {
  it('can retire a published listing', () => {
    // `published` had no entry at all, and a missing key means an empty list,
    // so a vehicle that sold stayed in the browse results permanently.
    expect(TABLE.published ?? []).toContain('sold');
    expect(TABLE.published ?? []).toContain('withdrawn');
  });

  it('can withdraw a listing at every stage before it is retired', () => {
    const terminal = new Set(['draft', 'sold', 'withdrawn']);
    const stuck = STATUSES.filter(
      (s) => !terminal.has(s) && !(TABLE[s] ?? []).includes('withdrawn')
    );
    expect(stuck).toEqual([]);
  });

  it('leaves no status in the constraint that nothing can reach', () => {
    // `draft` is the default and `ownership_submitted` comes from the seller's
    // own submit route, so neither needs an entry here.
    const reachable = new Set(['draft', 'ownership_submitted']);
    for (const tos of Object.values(TABLE)) for (const to of tos) reachable.add(to);
    expect(STATUSES.filter((s) => !reachable.has(s))).toEqual([]);
  });
});

describe('the table agrees with the routes that move listings directly', () => {
  it('allows the transition the field agent upload performs', () => {
    // app/api/field/listings/[id]/media sets media_done when an agent marks
    // photography complete, guarded on the listing being ownership_verified.
    const src = readFileSync(
      join(process.cwd(), 'app', 'api', 'field', 'listings', '[id]', 'media', 'route.ts'),
      'utf8'
    );
    expect(src).toMatch(/status === 'ownership_verified'/);
    expect(src).toMatch(/status: 'media_done'/);
    expect(TABLE.ownership_verified ?? []).toContain('media_done');
  });

  it('keeps photography and inspection order-independent', () => {
    expect(TABLE.media_done ?? []).toContain('inspection_scheduled');
    expect(TABLE.inspection_scheduled ?? []).toContain('media_done');
  });
});

describe('migration files are the source of the vocabulary', () => {
  it('reads the constraint rather than restating it', () => {
    expect(readdirSync(MIGRATIONS)).toContain('002_listings.sql');
    expect(STATUSES).toContain('sold');
    expect(STATUSES).toContain('withdrawn');
  });
});

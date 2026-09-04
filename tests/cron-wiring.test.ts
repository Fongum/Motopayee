import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Cron routes fail silently in two ways, and both had happened here.
 *
 * A route that exports only POST answers 405 to Vercel, which invokes crons
 * with GET. And a route nobody schedules simply never runs. Neither shows up
 * anywhere: the endpoint compiles, the tests pass, the feature just never
 * happens. `price-alerts` and `search-alerts` were both — buyers could create
 * alerts that had no possibility of firing.
 */

const CRON_DIR = join(process.cwd(), 'app', 'api', 'cron');
const VERCEL_JSON = join(process.cwd(), 'vercel.json');

const cronRoutes = readdirSync(CRON_DIR, { withFileTypes: true })
  .filter((e) => e.isDirectory() && existsSync(join(CRON_DIR, e.name, 'route.ts')))
  .map((e) => e.name);

const vercel = JSON.parse(readFileSync(VERCEL_JSON, 'utf8')) as {
  crons?: Array<{ path: string; schedule: string }>;
};
const scheduled = new Map((vercel.crons ?? []).map((c) => [c.path, c.schedule]));

function source(name: string): string {
  return readFileSync(join(CRON_DIR, name, 'route.ts'), 'utf8');
}

describe('cron routes', () => {
  it('finds the cron routes', () => {
    expect(cronRoutes.length).toBeGreaterThan(0);
  });

  it('every cron route accepts GET, which is how Vercel invokes them', () => {
    // A POST-only route answers 405 to the scheduler, forever, quietly.
    const withoutGet = cronRoutes.filter((name) => {
      const src = source(name);
      return !/export\s+(?:const\s+GET\s*=|async\s+function\s+GET)/.test(src);
    });
    expect(withoutGet).toEqual([]);
  });

  it('every cron route is actually scheduled', () => {
    const unscheduled = cronRoutes.filter((name) => !scheduled.has(`/api/cron/${name}`));
    expect(unscheduled).toEqual([]);
  });

  it('every schedule points at a route that exists', () => {
    const dangling = Array.from(scheduled.keys()).filter((path) => {
      const name = path.replace('/api/cron/', '');
      return !cronRoutes.includes(name);
    });
    expect(dangling).toEqual([]);
  });

  it('every cron route requires the shared secret and fails closed without it', () => {
    // `!process.env.CRON_SECRET ||` matters: an unset secret must reject
    // everything rather than let every caller through.
    const unguarded = cronRoutes.filter((name) => {
      const src = source(name);
      return !src.includes('CRON_SECRET') || !/!process\.env\.CRON_SECRET\s*\|\|/.test(src);
    });
    expect(unguarded).toEqual([]);
  });

  it('gives every schedule a valid five-field cron expression', () => {
    // Array.from: tsconfig sets no target, so it defaults to ES5 and iterating
    // a Map directly needs downlevelIteration.
    for (const [path, schedule] of Array.from(scheduled)) {
      expect(schedule.trim().split(/\s+/), `${path} → "${schedule}"`).toHaveLength(5);
    }
  });
});

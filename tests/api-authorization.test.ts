import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Every API route must decide who is allowed to call it.
 *
 * MotoPayee does all of its authorization in application code — every table
 * is service_role-only in RLS and every query runs through supabaseAdmin — so
 * a route that forgets its guard is not caught by the database. This suite
 * fails when a route handler has neither a guard nor an explicit, justified
 * entry in PUBLIC_ROUTES.
 *
 * Adding a genuinely public route means adding it here, with a reason. That
 * is the point: making something public should be a decision somebody wrote
 * down, not an omission.
 */

const API_ROOT = path.join(process.cwd(), 'app', 'api');

/** Anything that establishes or checks a caller's identity. */
const GUARD_PATTERNS = [
  'authenticateRequest',
  'requireAuth',
  'requireBuyer',
  'requireSeller',
  'requireFieldAgent',
  'requireInspector',
  'requireVerifier',
  'requireAdmin',
  'requireStaff',
  'requireMFIPartner',
  'getCurrentUser',
  'CRON_SECRET',
  'WEBHOOK_SECRET',
];

/** Routes that are public on purpose. Key is the route path, value is why. */
const PUBLIC_ROUTES: Record<string, string> = {
  'auth/login': 'Signing in cannot require being signed in.',
  'auth/logout': 'Clearing cookies is safe for anyone to call.',
  'auth/register': 'Account creation is open to the public.',
  'calculator/eligibility': 'Financing calculator on the public marketing pages.',
  'listings': 'Public marketplace browse.',
  'listings/[id]': 'Public listing detail.',
  'leads': 'Public lead and callback capture from the marketing and vehicle pages.',
  'contact-events': 'Anonymous contact intent from vehicle pages; throttled by middleware.',
  errors: 'Client-side crash reports from the error boundaries; a signed-out visitor is exactly who you want to hear from. Throttled by middleware.',
  'listings/[id]/view': 'Anonymous view counter; throttled by middleware.',
  'imports/offers': 'Public import offer catalogue.',
  'imports/offers/[id]': 'Public import offer detail.',
  'files/thumb/[id]': 'Public listing thumbnails; restricted to the public media bucket in the handler.',
};

function collectRouteFiles(dir: string, found: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectRouteFiles(full, found);
    else if (entry.name === 'route.ts') found.push(full);
  }
  return found;
}

function routeKey(file: string): string {
  return path
    .relative(API_ROOT, path.dirname(file))
    .split(path.sep)
    .join('/');
}

const routeFiles = collectRouteFiles(API_ROOT);

describe('API authorization', () => {
  it('finds the route handlers', () => {
    expect(routeFiles.length).toBeGreaterThan(50);
  });

  it('guards every route that is not explicitly public', () => {
    const unguarded = routeFiles
      .filter((file) => {
        const source = fs.readFileSync(file, 'utf8');
        return !GUARD_PATTERNS.some((pattern) => source.includes(pattern));
      })
      .map(routeKey)
      .filter((key) => !(key in PUBLIC_ROUTES));

    expect(unguarded, `Unguarded API routes (add a guard, or justify in PUBLIC_ROUTES): ${unguarded.join(', ')}`).toEqual([]);
  });

  it('keeps the public allowlist honest — every entry still exists', () => {
    const keys = new Set(routeFiles.map(routeKey));
    const stale = Object.keys(PUBLIC_ROUTES).filter((key) => !keys.has(key));

    expect(stale, `PUBLIC_ROUTES entries for routes that no longer exist: ${stale.join(', ')}`).toEqual([]);
  });

  it('gives every public route a stated reason', () => {
    const unexplained = Object.entries(PUBLIC_ROUTES)
      .filter(([, reason]) => reason.trim().length < 10)
      .map(([key]) => key);

    expect(unexplained).toEqual([]);
  });

  it('never lets a cron route run without its secret', () => {
    const cronRoutes = routeFiles.filter((file) => routeKey(file).startsWith('cron/'));
    expect(cronRoutes.length).toBeGreaterThan(0);

    const unsecured = cronRoutes
      .filter((file) => !fs.readFileSync(file, 'utf8').includes('CRON_SECRET'))
      .map(routeKey);

    expect(unsecured, `Cron routes missing CRON_SECRET: ${unsecured.join(', ')}`).toEqual([]);
  });

  it('does not let a missing CRON_SECRET turn into an open endpoint', () => {
    // `header !== \`Bearer ${undefined}\`` still rejects, but only by accident.
    // Each cron route must fail closed on purpose when the secret is unset.
    const permissive = routeFiles
      .filter((file) => routeKey(file).startsWith('cron/'))
      .filter((file) => !fs.readFileSync(file, 'utf8').includes('!process.env.CRON_SECRET'))
      .map(routeKey);

    expect(permissive, `Cron routes that do not explicitly require CRON_SECRET to be set: ${permissive.join(', ')}`).toEqual([]);
  });
});

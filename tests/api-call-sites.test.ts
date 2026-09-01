import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Every `/api/...` a page calls should resolve to a route that exists.
 *
 * A call to a route that was never written 404s, and the caller almost always
 * turns that into nothing: `r.ok ? r.json() : null` followed by an empty catch.
 * The field agent upload page did exactly this against
 * `/api/admin/listings-basic/[id]` — a route that has never existed — so the
 * header naming the vehicle being photographed silently never rendered.
 */

const API_DIR = join(process.cwd(), 'app', 'api');
const APP_DIR = join(process.cwd(), 'app');

function collectRoutes(dir: string, prefix = ''): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    const next = `${prefix}/${e.name}`;
    if (existsSync(join(dir, e.name, 'route.ts'))) out.push(`/api${next}`);
    out.push(...collectRoutes(join(dir, e.name), next));
  }
  return out;
}

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) sourceFiles(full, out);
    else if (/\.tsx?$/.test(e.name) && !e.name.endsWith('.test.ts')) out.push(full);
  }
  return out;
}

const routes = collectRoutes(API_DIR);

/** `/api/listings/[id]/view` matches `/api/listings/anything/view`. */
const matchers = routes.map((r) => new RegExp(`^${r.replace(/\[[^\]]+\]/g, '[^/]+').replace(/\//g, '\\/')}$`));

const CALL = /(?:fetch\(\s*[`'"]|action=[{]?\s*[`'"])(\/api\/[^`'"?\s]*)/g;

function callSites(): Array<{ path: string; file: string }> {
  const found = new Map<string, string>();
  for (const file of sourceFiles(APP_DIR)) {
    const src = readFileSync(file, 'utf8');
    let m;
    CALL.lastIndex = 0;
    while ((m = CALL.exec(src))) {
      // A `${...}` interpolation stands for exactly one path segment.
      const path = m[1].replace(/\$\{[^}]*\}/g, 'X');
      if (!found.has(path)) found.set(path, file.replace(process.cwd(), '').replace(/\\/g, '/'));
    }
  }
  return Array.from(found).map(([path, file]) => ({ path, file }));
}

describe('API call sites', () => {
  it('finds routes and call sites', () => {
    // Guards against the collectors silently matching nothing, which would make
    // the check below pass vacuously.
    expect(routes.length).toBeGreaterThan(50);
    expect(callSites().length).toBeGreaterThan(20);
  });

  it('every /api path a page calls resolves to a route', () => {
    const unmatched = callSites()
      .filter(({ path }) => !matchers.some((re) => re.test(path)))
      .map(({ path, file }) => `${path} (called from ${file})`);
    expect(unmatched).toEqual([]);
  });
});

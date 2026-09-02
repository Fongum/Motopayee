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

/** Route path -> the HTTP verbs its route.ts exports. */
function routeVerbs(): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  const walk = (dir: string, prefix = '') => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      const next = `${prefix}/${e.name}`;
      const file = join(dir, e.name, 'route.ts');
      if (existsSync(file)) {
        const src = readFileSync(file, 'utf8');
        const verbs = new Set<string>();
        const re = /export\s+(?:async\s+function|const)\s+(GET|POST|PUT|PATCH|DELETE)\b/g;
        let m;
        while ((m = re.exec(src))) verbs.add(m[1]);
        out.set(`/api${next}`, verbs);
      }
      walk(join(dir, e.name), next);
    }
  };
  walk(API_DIR);
  return out;
}

const verbsByRoute = routeVerbs();

function resolveRoute(path: string): { route: string; verbs: Set<string> } | null {
  for (const [route, verbs] of Array.from(verbsByRoute)) {
    const re = new RegExp(`^${route.replace(/\[[^\]]+\]/g, '[^/]+').replace(/\//g, '\\/')}$`);
    if (re.test(path)) return { route, verbs };
  }
  return null;
}

const normalise = (p: string) => p.replace(/\$\{[^}]*\}/g, 'X');

/**
 * Calls paired with the verb they use.
 *
 * Form tags are captured whole and then parsed. Matching `action=` and an
 * optional `method=` in one lazy pattern does not work — the optional group
 * matches zero characters every time, which reported all 44 forms in this app
 * as GET against POST-only routes. Every one of them declares method="POST".
 */
function verbCallSites(): Array<{ path: string; verb: string; file: string }> {
  const out: Array<{ path: string; verb: string; file: string }> = [];
  for (const file of sourceFiles(APP_DIR)) {
    const src = readFileSync(file, 'utf8');
    const rel = file.replace(process.cwd(), '').replace(/\\/g, '/');

    // No dotall flag: `[^>]` already spans newlines, and `s` needs ES2018 while
    // tsconfig targets ES5.
    const formRe = /<form\b[^>]*>/g;
    let tag;
    while ((tag = formRe.exec(src))) {
      const action = /action=[{]?\s*[`'"](\/api\/[^`'"?\s]*)[`'"]/.exec(tag[0]);
      if (!action) continue;
      const method = /method=[{]?\s*[`'"](\w+)[`'"]/.exec(tag[0]);
      out.push({ path: normalise(action[1]), verb: (method?.[1] ?? 'GET').toUpperCase(), file: rel });
    }

    const fetchRe = /fetch\(\s*[`'"](\/api\/[^`'"?\s]*)[`'"]\s*,\s*\{([\s\S]{0,400}?)\}\s*\)/g;
    let f;
    while ((f = fetchRe.exec(src))) {
      const method = /method:\s*[`'"](\w+)[`'"]/.exec(f[2]);
      out.push({ path: normalise(f[1]), verb: (method?.[1] ?? 'GET').toUpperCase(), file: rel });
    }
  }
  return out;
}

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

  it('every call uses a verb its route exports', () => {
    // A form posting to a route that exports only PATCH answers 405, and a
    // browser form submit surfaces that as a bare error page.
    const mismatched = verbCallSites()
      .map((call) => ({ ...call, hit: resolveRoute(call.path) }))
      .filter(({ hit, verb }) => hit && !hit.verbs.has(verb))
      .map(({ verb, path, hit, file }) =>
        `${verb} ${path} -> exports [${Array.from(hit!.verbs).join(', ')}] (${file})`
      );
    expect(mismatched).toEqual([]);
  });

  it('resolves a meaningful number of calls to their verbs', () => {
    // Non-vacuity: a form matcher that stops matching would make the check
    // above pass with nothing to check.
    const resolvable = verbCallSites().filter((c) => resolveRoute(c.path));
    expect(resolvable.length).toBeGreaterThan(50);
  });
});

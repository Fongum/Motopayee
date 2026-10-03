import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/**
 * A query error must not be answered as "not found".
 *
 * `if (error || !data) notFound()` and its API twin
 * `if (error || !row) return ... 404` turn a broken query into what looks
 * like a bad link. Seven routes 404'd for every request for years that way
 * (PGRST200 on a polymorphic embed). Use rowOrNull / isQueryFailure from
 * lib/query-result instead: only a missing row is a 404.
 */

const APP = join(process.cwd(), 'app');

function sources(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) sources(full, out);
    else if (/\.tsx?$/.test(e.name)) out.push(full);
  }
  return out;
}

// `if (error || !data) notFound()` — and the same with any *Error name.
const PAGE_PATTERN = /if \(\s*\w*[eE]rror\s*\|\|\s*!\w+\s*\)\s*\{?\s*notFound\(\)/;
// `if (error || !row) { return NextResponse.json(..., { status: 404 }) }`
const API_PATTERN = /if \(\s*\w*[eE]rror\s*\|\|\s*!\w+\s*\)\s*\{\s*return NextResponse\.json\([^;]*status:\s*404/;

describe('query errors are not answered as 404', () => {
  const files = sources(APP).map((f) => ({ file: relative(process.cwd(), f).split(sep).join('/'), src: readFileSync(f, 'utf8') }));

  it('scans the app (guards against a walk that finds nothing)', () => {
    expect(files.length).toBeGreaterThan(100);
    expect(files.filter((f) => f.src.includes('rowOrNull')).length).toBeGreaterThanOrEqual(10);
  });

  it('no page turns a query error into notFound()', () => {
    expect(files.filter((f) => PAGE_PATTERN.test(f.src)).map((f) => f.file)).toEqual([]);
  });

  it('no API route turns a query error into a 404', () => {
    expect(files.filter((f) => API_PATTERN.test(f.src)).map((f) => f.file)).toEqual([]);
  });
});

/**
 * Does every query in the codebase actually run?
 *
 *   node scripts/audit-query-shapes.mjs
 *
 * Read-only. Extracts every `.from('table').select('...')` pair from app/ and
 * lib/, issues each one against the live schema with the service-role key, and
 * reports the ones the database rejects.
 *
 * This exists because seven routes embedded a polymorphic table that PostgREST
 * cannot resolve. Every one failed with PGRST200, every one treated the error as
 * "not found", and so every one answered 404 from the day it was written.
 * Nothing catches that: `tsc` and `next build` never contact the database, and
 * the pages look like the record simply is not there.
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

function loadEnv(path = '.env.local') {
  return Object.fromEntries(
    readFileSync(path, 'utf8')
      .split('\n')
      .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
      .map((l) => {
        const i = l.indexOf('=');
        return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
      })
  );
}

function sources() {
  const out = [];
  for (const root of ['app', 'lib']) {
    const walk = (d) => {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        const full = join(d, e.name);
        if (e.isDirectory()) walk(full);
        else if (/\.tsx?$/.test(e.name) && !e.name.endsWith('.test.ts')) out.push(full);
      }
    };
    walk(root);
  }
  return out;
}

/**
 * `.from('x')` followed by `.select(...)` in the same chain.
 *
 * The gap must not contain `.from(`, `;` or `}` — without those guards the
 * pattern happily pairs a `.from()` with a `.select()` from a completely
 * different statement further down the file, which is how the first run of this
 * script produced five confident false positives.
 *
 * Only literal selects: an interpolated one cannot be reconstructed without
 * running the code.
 */
const PAIR = /\.from\(\s*'(\w+)'\s*\)((?:[^;{}]|\n)*?)\.select\(\s*(['"`])([\s\S]*?)\3/g;

const env = loadEnv();
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase keys in .env.local');
  process.exit(2);
}
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const seen = new Set();
const queries = [];
let skipped = 0;

for (const file of sources()) {
  const src = readFileSync(file, 'utf8');
  let m;
  PAIR.lastIndex = 0;
  while ((m = PAIR.exec(src))) {
    const [, table, gap, , select] = m;
    if (gap.includes('.from(')) continue;
    // An interpolated select cannot be reconstructed without running the code.
    // The shared query modules (listing-query, hire-query, finance-dashboard,
    // hire-bookings-dashboard) build theirs that way; those have their own tests
    // and were checked against the live schema when written.
    if (select.includes('${')) { skipped += 1; continue; }
    const key = `${table}::${select.replace(/\s+/g, ' ').trim()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const line = src.slice(0, m.index).split('\n').length;
    queries.push({ file: file.replace(/\\/g, '/'), line, table, select });
  }
}

const failures = [];
for (const q of queries) {
  const { error } = await db.from(q.table).select(q.select).limit(1);
  if (error) failures.push({ ...q, code: error.code, message: error.message });
}

console.log(`Checked ${queries.length} distinct literal select(s) across app/ and lib/.`);
console.log(`Skipped ${skipped} interpolated select(s) — not reconstructable statically.\n`);

if (failures.length === 0) {
  console.log('Every one runs against the live schema.');
} else {
  console.log('=== REJECTED BY THE DATABASE ===');
  for (const f of failures) {
    console.log(`${f.file}:${f.line}  [${f.code}]`);
    console.log(`  from('${f.table}').select('${f.select.replace(/\s+/g, ' ').trim().slice(0, 100)}')`);
    console.log(`  ${f.message.slice(0, 120)}\n`);
  }
}

console.log(`\n${failures.length} failing quer${failures.length === 1 ? 'y' : 'ies'}.`);
process.exit(failures.length === 0 ? 0 : 1);

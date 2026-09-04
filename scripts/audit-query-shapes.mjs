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
 * Credentials come from the environment, or from .env.local when running
 * locally. Run it with: npm run audit:queries / npm run audit:access
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Credentials from the environment first, falling back to .env.local.
 *
 * Reading the file is the convenience for running this locally; the env-var
 * path is what lets it run in CI, where there is no .env.local to read.
 */
function loadEnv(path = '.env.local') {
  const fromProcess = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
  if (fromProcess.NEXT_PUBLIC_SUPABASE_URL && fromProcess.SUPABASE_SERVICE_ROLE_KEY) return fromProcess;

  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    return fromProcess;
  }
  return Object.fromEntries(
    text
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
  console.error('Missing Supabase credentials: set them in the environment or .env.local');
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

/**
 * Columns named in filters and ordering, which fail the same way.
 *
 * `.eq('typo_column', x)` raises 42703 at runtime — the select can be perfectly
 * valid and the query still dies, and the same `error => notFound()` handlers
 * turn it into a 404. Existence is checked by selecting the column.
 *
 * Dotted paths (`vehicle.make`, `media.asset_type`) address an embedded
 * resource and are skipped: they are valid as filters but not as a select.
 */
const FILTER = /\.(?:eq|neq|gt|gte|lt|lte|like|ilike|is|in|contains|order)\(\s*'([\w.]+)'/g;
const columnChecks = new Map();

/**
 * The remainder of one method chain, starting just after the select.
 *
 * Consumes `.method(...)` calls with balanced parentheses and stops at the first
 * thing that is not one. Reading to the next `;` instead — which is what this
 * did first — swallows every sibling query in a `Promise.all([...])` array and
 * attributes their filters to the wrong table. That produced 82 confident false
 * positives, all of them claiming columns like `payments.source` were missing.
 */
function chainFrom(src, start) {
  let i = start;
  // Finish the select's own argument list.
  let depth = 1;
  while (i < src.length && depth > 0) {
    if (src[i] === '(') depth += 1;
    else if (src[i] === ')') depth -= 1;
    i += 1;
  }
  const begin = i;
  for (;;) {
    const rest = src.slice(i);
    const next = /^\s*\.\w+\s*\(/.exec(rest);
    if (!next) break;
    i += next[0].length;
    depth = 1;
    while (i < src.length && depth > 0) {
      if (src[i] === '(') depth += 1;
      else if (src[i] === ')') depth -= 1;
      i += 1;
    }
  }
  return src.slice(begin, i);
}

for (const file of sources()) {
  const src = readFileSync(file, 'utf8');
  let m;
  PAIR.lastIndex = 0;
  while ((m = PAIR.exec(src))) {
    const [whole, table, gap] = m;
    if (gap.includes('.from(')) continue;
    const tail = chainFrom(src, m.index + whole.length);
    let f;
    FILTER.lastIndex = 0;
    while ((f = FILTER.exec(tail))) {
      const column = f[1];
      if (column.includes('.')) continue;
      const key = `${table}.${column}`;
      if (!columnChecks.has(key)) {
        columnChecks.set(key, { table, column, file: file.replace(/\\/g, '/') });
      }
    }
  }
}

const columnFailures = [];
for (const c of columnChecks.values()) {
  const { error } = await db.from(c.table).select(c.column).limit(1);
  if (error) columnFailures.push({ ...c, code: error.code, message: error.message });
}

/**
 * Columns written by insert() and update().
 *
 * A typo here is worse than in a filter: the write fails at runtime on a path
 * that reads fine, and nothing in the type system objects because the payload
 * is a plain object. Only literal keys are visible — a spread carries names
 * that cannot be seen statically, so those are counted and reported as skipped
 * rather than passed over in silence.
 */
const WRITE = /\.(insert|update|upsert)\(\s*\{/g;
const writeChecks = new Map();
let spreads = 0;

for (const file of sources()) {
  const src = readFileSync(file, 'utf8');
  let m;
  const FROM = /\.from\(\s*'(\w+)'\s*\)/g;
  while ((m = FROM.exec(src))) {
    const table = m[1];
    const tail = chainFrom(src, m.index + m[0].length - 1);
    WRITE.lastIndex = 0;
    let w;
    while ((w = WRITE.exec(tail))) {
      // The object literal starts at the brace the match ended on.
      const objStart = tail.indexOf('{', w.index);
      let depth = 0;
      let i = objStart;
      for (; i < tail.length; i += 1) {
        if (tail[i] === '{') depth += 1;
        else if (tail[i] === '}') { depth -= 1; if (depth === 0) break; }
      }
      const body = tail.slice(objStart + 1, i);
      if (body.includes('...')) spreads += 1;
      // Top-level `key:` pairs only.
      let d = 0;
      for (const segment of body.split('\n')) {
        const key = /^\s*(\w+)\s*:/.exec(segment);
        const opens = (segment.match(/[{[(]/g) || []).length;
        const closes = (segment.match(/[}\])]/g) || []).length;
        if (key && d === 0) writeChecks.set(`${table}.${key[1]}`, { table, column: key[1], file: file.replace(/\\/g, '/') });
        d += opens - closes;
      }
    }
  }
}

const writeFailures = [];
for (const c of writeChecks.values()) {
  const { error } = await db.from(c.table).select(c.column).limit(1);
  if (error) writeFailures.push({ ...c, code: error.code, message: error.message });
}

/**
 * RPC names are listed, not verified — and that is deliberate.
 *
 * Calling `.rpc(name)` with no arguments cannot distinguish "no such function"
 * from "exists, but takes arguments": PostgREST answers PGRST202 for both, with
 * the identical message "Could not find the function public.X without
 * parameters". A non-null `hint` sometimes names a near-miss, but a made-up name
 * with no similar function returns `hint: null` too, so that signal is not
 * dependable either.
 *
 * A first version of this check filtered on that message and could therefore
 * never fail — a mutation renaming a real RPC to `..._typo` passed clean. A
 * check that cannot fail is worse than no check, so it is gone. Verifying these
 * needs the real argument names, which means calling each one properly.
 */
const rpcNames = new Map();
for (const file of sources()) {
  const src = readFileSync(file, 'utf8');
  const re = /\.rpc\(\s*'(\w+)'/g;
  let m;
  while ((m = re.exec(src))) {
    if (!rpcNames.has(m[1])) rpcNames.set(m[1], file.replace(/\\/g, '/'));
  }
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

console.log(`\nChecked ${columnChecks.size} distinct filter/order column(s).`);
if (columnFailures.length === 0) {
  console.log('Every one exists on its table.');
} else {
  console.log('\n=== COLUMNS THAT DO NOT EXIST ===');
  for (const c of columnFailures) {
    console.log(`${c.file}  [${c.code}]  ${c.table}.${c.column}`);
    console.log(`  ${c.message.slice(0, 110)}`);
  }
}

console.log(`\nChecked ${writeChecks.size} distinct insert/update column(s), across ${spreads} payload(s) that also spread.`);
if (writeFailures.length === 0) {
  console.log('Every one exists on its table.');
} else {
  console.log('\n=== WRITTEN COLUMNS THAT DO NOT EXIST ===');
  for (const c of writeFailures) {
    console.log(`${c.file}  [${c.code}]  ${c.table}.${c.column}`);
    console.log(`  ${c.message.slice(0, 110)}`);
  }
}

console.log(`\n${rpcNames.size} RPC name(s) called, NOT verified here (see the note in this file):`);
console.log(`  ${Array.from(rpcNames.keys()).sort().join(', ')}`);

const checked = queries.length + columnChecks.size + writeChecks.size;
const total = failures.length + columnFailures.length + writeFailures.length;

/**
 * This makes roughly one request per check, so a run is several hundred round
 * trips. Back-to-back runs can trip Supabase's rate limiting, and the failures
 * then arrive as a wall of plausible-looking schema errors — one run reported
 * 192 broken queries that were all fine thirty seconds later. Treat a large
 * failure fraction as an infrastructure problem, not as findings.
 */
if (total > checked * 0.25) {
  console.log(`\n!! ${total} of ${checked} checks failed.`);
  console.log('!! That fraction almost certainly means rate limiting or a connection');
  console.log('!! problem, not that much broken code. Wait a moment and re-run before');
  console.log('!! believing any of it.');
  process.exit(2);
}
console.log(`\n${total} failing quer${total === 1 ? 'y' : 'ies'}.`);
process.exit(total === 0 ? 0 : 1);

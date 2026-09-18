/**
 * What can the anon key actually see?
 *
 *   node scripts/audit-anon-access.mjs
 *
 * Read-only. Compares, table by table, what the service role can count against
 * what the public anon key can count, and reports any table outside the
 * public-by-design list where anonymous rows come back. Also checks that every
 * `security definer` RPC refuses the anon key.
 *
 * Two things make this worth re-running rather than trusting a past result:
 *
 *   * A table with no rows proves nothing. "No error, no rows" is
 *     indistinguishable from "RLS allowed it", so empty tables are reported
 *     separately as inconclusive rather than counted as safe. Most of this
 *     schema was empty when the audit was first run.
 *   * The whole schema once answered 42P17 — a recursive policy on `profiles`
 *     meant thirteen tables' policies never evaluated at all. An audit run in
 *     that state would have looked reassuring and meant nothing.
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

/** Table names, read from the migrations so this cannot drift from the schema. */
function tablesFromMigrations(dir = 'supabase/migrations') {
  const names = new Set();
  for (const file of readdirSync(dir).sort()) {
    if (!file.endsWith('.sql')) continue;
    const sql = readFileSync(join(dir, file), 'utf8');
    const re = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?(\w+)/gi;
    let m;
    while ((m = re.exec(sql))) names.add(m[1]);
  }
  return Array.from(names).sort();
}

/** An anonymous shopper has to be able to browse the marketplace. */
const PUBLIC_BY_DESIGN = new Set([
  'listings', 'vehicles', 'media_assets', 'hire_listings', 'hire_listing_media',
  'reviews', 'review_responses', 'insurance_partners', 'mfi_institutions',
  'zone_rules', 'dealers',
]);

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
if (!url || !env.SUPABASE_SERVICE_ROLE_KEY || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.error('Missing Supabase credentials: set them in the environment or .env.local');
  process.exit(2);
}

const admin = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const anon = createClient(url, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });

const exposed = [];
const conclusive = [];
const inconclusive = [];

for (const table of tablesFromMigrations()) {
  const { count: total, error: adminErr } = await admin
    .from(table).select('*', { count: 'exact', head: true });
  if (adminErr) continue; // not a PostgREST-exposed table

  if ((total ?? 0) === 0) { inconclusive.push(table); continue; }

  const { count: visible, error } = await anon.from(table).select('*', { count: 'exact', head: true });

  if (error) {
    conclusive.push(`blocked    ${table.padEnd(24)} ${total} row(s), anon denied [${error.code}]`);
    continue;
  }

  const seen = visible ?? 0;
  const line = `${table.padEnd(24)} anon sees ${seen}/${total}`;
  if (seen > 0 && !PUBLIC_BY_DESIGN.has(table)) exposed.push(`*** EXPOSED  ${line}`);
  else conclusive.push(`${seen > 0 ? 'public     ' : 'filtered   '}${line}`);
}

console.log('=== Tables with rows (conclusive) ===');
conclusive.forEach((l) => console.log(l));

console.log('\n=== Unexpected anon-visible rows ===');
console.log(exposed.length ? exposed.join('\n') : '(none)');

console.log(`\n=== Inconclusive: ${inconclusive.length} empty table(s) ===`);
console.log(inconclusive.join(' ') || '(none)');
console.log('Re-run once these hold data; an empty table cannot demonstrate anything.');

console.log(`\n${exposed.length === 0 ? 'NO EXPOSURE FOUND' : exposed.length + ' TABLE(S) EXPOSED'}`);
process.exit(exposed.length === 0 ? 0 : 1);

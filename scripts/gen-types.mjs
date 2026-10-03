#!/usr/bin/env node
/**
 * Regenerate lib/database.types.ts from the local Supabase stack
 * (`npm run db:start` first). Writes the file only when generation succeeds:
 * a shell redirect would replace the types with the CLI's error message, as
 * happened the first time this ran against a stack that was not up.
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
let out;
try {
  out = execFileSync(
    npx,
    ['supabase@2.119.0', 'gen', 'types', 'typescript', '--local', '--schema', 'public'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], shell: process.platform === 'win32' }
  );
} catch {
  console.error('\nType generation failed; lib/database.types.ts left unchanged. Is `npm run db:start` running?');
  process.exit(1);
}

if (!/export type Database = \{/.test(out)) {
  console.error('Unexpected output from supabase gen types; lib/database.types.ts left unchanged.');
  process.exit(1);
}

writeFileSync('lib/database.types.ts', out);
console.log('lib/database.types.ts regenerated.');

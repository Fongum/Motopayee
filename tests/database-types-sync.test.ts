import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * lib/database.types.ts must describe the schema the migrations build.
 *
 * It is generated (`npm run db:start` then `npm run gen:types`) from a local
 * database the migrations were applied to, and the Supabase client is typed
 * with it — so a migration that adds a table or column without regenerating
 * leaves the type checker rejecting code that uses it, or, worse, still
 * describing a column that a later migration dropped.
 *
 * This is the cheap static half of that check: every table a migration
 * creates, and every column one adds, must appear in the generated file.
 */

const MIGRATIONS = join(process.cwd(), 'supabase', 'migrations');
const TYPES = readFileSync(join(process.cwd(), 'lib', 'database.types.ts'), 'utf8');

const sql = readdirSync(MIGRATIONS)
  .filter((f) => f.endsWith('.sql'))
  .sort()
  .map((f) => readFileSync(join(MIGRATIONS, f), 'utf8').replace(/--.*$/gm, ''))
  .join('\n');

const ident = '(?:public\\.)?"?([a-z_][a-z0-9_]*)"?';

const createdTables = Array.from(
  sql.matchAll(new RegExp(`create table (?:if not exists )?${ident}`, 'gi'))
).map((m) => m[1].toLowerCase());

/** [table, column] for every `alter table X add column [if not exists] Y`. */
const addedColumns: Array<[string, string]> = [];
for (const stmt of Array.from(sql.matchAll(new RegExp(`alter table (?:if exists )?${ident}([\\s\\S]*?);`, 'gi')))) {
  const table = stmt[1].toLowerCase();
  for (const col of Array.from(stmt[2].matchAll(/add column (?:if not exists )?"?([a-z_][a-z0-9_]*)"?/gi))) {
    addedColumns.push([table, col[1].toLowerCase()]);
  }
}

/** The Row block of one table in the generated file. */
function rowOf(table: string): string | null {
  const m = TYPES.match(new RegExp(`"${table}": \\{\\s*Row: \\{([\\s\\S]*?)\\}`));
  return m ? m[1] : null;
}

describe('lib/database.types.ts matches the migrations', () => {
  it('parses enough of the migrations to mean something', () => {
    expect(createdTables.length).toBeGreaterThan(40);
    expect(addedColumns.length).toBeGreaterThan(20);
  });

  it('has every table a migration creates', () => {
    const missing = Array.from(new Set(createdTables)).filter((t) => rowOf(t) === null);
    expect(missing, 'run `npm run db:start && npm run gen:types`').toEqual([]);
  });

  it('has every column a migration adds', () => {
    const missing = addedColumns
      .filter(([table, column]) => {
        const row = rowOf(table);
        return row !== null && !new RegExp(`"${column}":`).test(row);
      })
      .map(([table, column]) => `${table}.${column}`);
    expect(missing, 'run `npm run db:start && npm run gen:types`').toEqual([]);
  });
});

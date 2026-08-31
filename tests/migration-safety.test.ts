import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Static checks over supabase/migrations.
 *
 * Each rule here exists because the mistake it catches actually shipped. They
 * are cheap, they run in CI with the rest of the suite, and they fail on the
 * migration file rather than in production three months later.
 */

const MIGRATIONS_DIR = join(process.cwd(), 'supabase', 'migrations');

/** Files in application order, which matters: later ones redefine earlier ones. */
const files = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith('.sql'))
  .sort();

const sql = new Map(files.map((f) => [f, readFileSync(join(MIGRATIONS_DIR, f), 'utf8')]));
const allSql = Array.from(sql.values()).join('\n');

/** Strip `-- ...` comments so prose about a mistake is not mistaken for the mistake. */
function stripComments(text: string): string {
  return text.replace(/^\s*--.*$/gm, '');
}

/** Every .ts/.tsx under app/ and lib/, for the source-level checks below. */
function appSources(dir = process.cwd()): string[] {
  const out: string[] = [];
  for (const root of ['app', 'lib']) {
    const walk = (d: string) => {
      for (const entry of readdirSync(d, { withFileTypes: true })) {
        const full = join(d, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith('.test.ts')) out.push(full);
      }
    };
    walk(join(dir, root));
  }
  return out;
}

const code = new Map(Array.from(sql).map(([f, text]) => [f, stripComments(text)] as const));
const allCode = Array.from(code.values()).join('\n');

describe('migration files exist', () => {
  it('finds the migrations directory', () => {
    expect(files.length).toBeGreaterThan(30);
  });
});

interface ParsedFunction {
  name: string;
  /** Everything between the argument list and the body — where the modifiers live. */
  header: string;
}

/**
 * Every `create function` with its modifier header.
 *
 * Parsed by splitting on the body delimiter rather than with one big regex: a
 * pattern spanning from `returns` to `security definer` happily runs past the
 * end of one function and into the next, which reported a plain trigger
 * function as an unprotected definer on the first run of these tests.
 */
function parseFunctions(text: string): ParsedFunction[] {
  const out: ParsedFunction[] = [];
  const re = /create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?(\w+)\s*\(/gi;
  let m;
  while ((m = re.exec(text))) {
    const name = m[1];
    const rest = text.slice(m.index);
    const bodyAt = rest.search(/\bas\s+\$\$/i);
    if (bodyAt === -1) continue;
    // Skip the argument list, then take what remains before the body.
    const afterArgs = rest.slice(0, bodyAt);
    const closeParen = afterArgs.lastIndexOf(')');
    out.push({ name, header: closeParen === -1 ? afterArgs : afterArgs.slice(closeParen) });
  }
  return out;
}

const definerFunctions = parseFunctions(allCode).filter((f) => /security\s+definer/i.test(f.header));

// ─── Function grants ──────────────────────────────────────────────────────────

describe('function privileges', () => {
  it('never revokes EXECUTE from anon/authenticated without also revoking from PUBLIC', () => {
    // PostgreSQL grants EXECUTE on a new function to PUBLIC by default, and
    // anon/authenticated usually hold it *through* PUBLIC — so revoking from
    // them alone removes nothing and the function stays callable with the anon
    // key. That shipped once already.
    //
    // But it is not always a no-op: a project with `alter default privileges
    // ... grant execute on functions to anon` hands those roles a *direct*
    // grant at CREATE time, which a PUBLIC revoke does not touch. So the rule
    // is not "never revoke from anon" — it is "never revoke from anon as the
    // only revoke for that function".
    const revokedFromPublic = new Set<string>();
    const publicRe = /revoke\s+execute\s+on\s+function\s+(?:public\.)?(\w+)\s*\([^)]*\)\s*from\s+public\s*;/gi;
    let m;
    while ((m = publicRe.exec(allCode))) revokedFromPublic.add(m[1]);

    const offenders: string[] = [];
    const roleRe = /revoke\s+execute\s+on\s+function\s+(?:public\.)?(\w+)\s*\([^)]*\)\s*from\s+[^;]*\b(?:anon|authenticated)\b[^;]*;/gi;
    while ((m = roleRe.exec(allCode))) {
      if (!revokedFromPublic.has(m[1])) offenders.push(m[1]);
    }
    expect(Array.from(new Set(offenders)).sort()).toEqual([]);
  });

  it('revokes EXECUTE from PUBLIC on every security definer function', () => {
    // A security definer function runs with the owner's rights. Left on the
    // default PUBLIC grant, anyone holding the anon key can call it.
    const revoked = new Set<string>();
    const revokeRe = /revoke\s+execute\s+on\s+function\s+(?:public\.)?(\w+)\s*\([^)]*\)\s*from\s+public\s*;/gi;
    let m;
    while ((m = revokeRe.exec(allCode))) revoked.add(m[1]);

    const unprotected = Array.from(new Set(definerFunctions.map((f) => f.name)))
      .filter((fn) => !revoked.has(fn))
      .sort();
    expect(unprotected).toEqual([]);
  });

  it('pins search_path on every security definer function', () => {
    // Without it the function resolves unqualified names through the caller's
    // search_path, which is the classic definer-rights hijack.
    const missing = Array.from(
      new Set(definerFunctions.filter((f) => !/set\s+search_path/i.test(f.header)).map((f) => f.name))
    ).sort();
    expect(missing).toEqual([]);
  });

  it('recognises the security definer functions it is meant to be guarding', () => {
    // A parser that silently matches nothing would make every rule above pass
    // vacuously — which is how a green suite hides a regression.
    expect(definerFunctions.length).toBeGreaterThanOrEqual(10);
    expect(definerFunctions.map((f) => f.name)).toContain('mfi_partner_stats');
    expect(definerFunctions.map((f) => f.name)).not.toContain('set_updated_at');
  });
});

// ─── RLS policies ─────────────────────────────────────────────────────────────

describe('RLS policies', () => {
  /**
   * The policy definition that actually applies is the last one for a given
   * (name, table) across the ordered migrations — a later file may drop and
   * recreate it, which is exactly how the recursive one was repaired.
   */
  function livePolicies() {
    const live = new Map<string, { file: string; table: string; body: string }>();
    for (const file of files) {
      const text = code.get(file)!;
      const re = /create\s+policy\s+"([^"]+)"\s*\n?\s*on\s+(?:public\.)?(\w+)([\s\S]*?);\s*(?=\n|$)/gi;
      let m;
      while ((m = re.exec(text))) {
        const [, name, table, body] = m;
        live.set(`${table}.${name}`, { file, table, body });
      }
    }
    return live;
  }

  it('has no policy on a table that queries the same table', () => {
    // `admin_all_profiles` was a policy ON profiles whose USING clause selected
    // FROM profiles. PostgreSQL stops with 42P17, and because policies elsewhere
    // resolve the caller through profiles, thirteen tables became unreadable.
    // Resolve the caller in a security definer helper with row_security off.
    const offenders: string[] = [];
    for (const [key, { file, table, body }] of Array.from(livePolicies())) {
      const selfRef = new RegExp(`from\\s+(?:public\\.)?${table}\\b`, 'i');
      if (selfRef.test(body)) offenders.push(`${key} (${file})`);
    }
    expect(offenders).toEqual([]);
  });
});

// ─── Embeds PostgREST cannot resolve ──────────────────────────────────────────

describe('polymorphic tables are never embedded', () => {
  /**
   * A table keyed by entity_type/entity_id has no foreign key to the things it
   * points at, so PostgREST cannot infer an embed and answers PGRST200. Seven
   * routes embedded `documents(...)` anyway, and every one of them treats a
   * query error as "not found" — so each answered 404 for its whole existence.
   */
  const POLYMORPHIC = ['documents'];

  it('has no select embedding a polymorphic table', () => {
    const offenders: string[] = [];
    for (const file of appSources()) {
      const src = readFileSync(file, 'utf8');
      for (const table of POLYMORPHIC) {
        // `documents(` inside a select string, not `import_documents(` and not a
        // standalone `.from('documents')`.
        const re = new RegExp(`(?<![\\w_])${table}\\s*\\(`, 'g');
        for (const line of src.split('\n')) {
          if (!re.test(line)) continue;
          if (/\.from\(/.test(line)) continue;
          if (/^\s*(\/\/|\*|--)/.test(line)) continue;
          offenders.push(`${file.replace(process.cwd(), '').replace(/\\/g, '/')}: ${line.trim().slice(0, 60)}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

// ─── Housekeeping ─────────────────────────────────────────────────────────────

describe('migration hygiene', () => {
  it('numbers every migration uniquely', () => {
    const numbers = files.map((f) => f.slice(0, 3));
    expect(new Set(numbers).size).toBe(numbers.length);
  });

  it('creates indexes idempotently so a re-run does not fail', () => {
    const bad: string[] = [];
    for (const [file, text] of Array.from(code)) {
      const hits = text.match(/create\s+index\s+(?!concurrently\s+)(?!if\s+not\s+exists)\w+/gi);
      // Migrations 001-013 predate this rule and are already applied; holding
      // them to it would mean editing history that can never re-run anyway.
      if (hits && Number(file.slice(0, 3)) > 13) bad.push(`${file}: ${hits[0]}`);
    }
    expect(bad).toEqual([]);
  });

});

// ─── A note the grep-based rules cannot express ───────────────────────────────

describe('applied-migration discipline', () => {
  it('documents that an applied migration cannot be edited into correctness', () => {
    // 036-039 were applied with a no-op revoke. Editing those files fixed the
    // source for fresh databases but changed nothing in production, which is
    // why 040 exists. If a future fix needs to reach an applied database, it
    // needs its own migration.
    expect(allSql).toMatch(/040/);
    expect(sql.get('040_lock_down_dashboard_functions.sql')).toMatch(/idempotent/i);
  });
});

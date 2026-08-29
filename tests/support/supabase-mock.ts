import { vi } from 'vitest';

/**
 * A stand-in for supabaseAdmin, enough to drive a route handler.
 *
 * The point is not to simulate Postgres — it is to let a test say "this row
 * belongs to someone else" and assert the handler refuses. Every builder
 * method returns the builder, and the builder is awaitable, so any chain the
 * routes use resolves to the response queued for that table.
 */

export interface TableResponse {
  data: unknown;
  error?: unknown;
}

export interface RecordedWrite {
  table: string;
  operation: 'insert' | 'update' | 'upsert' | 'delete';
  payload: unknown;
}

type TableFixtures = Record<string, TableResponse | TableResponse[]>;

export function createSupabaseMock(fixtures: TableFixtures = {}) {
  const writes: RecordedWrite[] = [];
  const signedUrls: { bucket: string; path: string }[] = [];
  const queues: Record<string, TableResponse[]> = {};

  for (const [table, response] of Object.entries(fixtures)) {
    queues[table] = Array.isArray(response) ? [...response] : [response];
  }

  function nextResponse(table: string): TableResponse {
    const queue = queues[table];
    if (!queue || queue.length === 0) return { data: null, error: null };
    // A single fixture is reused; a list is consumed in order, so a route that
    // reads the same table twice can be given two different rows.
    return queue.length === 1 ? queue[0] : (queue.shift() as TableResponse);
  }

  function builder(table: string) {
    const settle = () => {
      const { data, error } = nextResponse(table);
      return Promise.resolve({ data, error: error ?? null });
    };

    const chain: Record<string, unknown> = {
      then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
        settle().then(resolve, reject),
      single: settle,
      maybeSingle: settle,
    };

    for (const method of ['select', 'eq', 'neq', 'in', 'is', 'not', 'gte', 'lte', 'gt', 'lt', 'or', 'order', 'limit', 'range']) {
      chain[method] = () => chain;
    }

    for (const operation of ['insert', 'update', 'upsert', 'delete'] as const) {
      chain[operation] = (payload: unknown) => {
        writes.push({ table, operation, payload });
        return chain;
      };
    }

    return chain;
  }

  const client = {
    from: vi.fn((table: string) => builder(table)),
    storage: {
      from: (bucket: string) => ({
        createSignedUrl: (path: string, _expiresIn: number) => {
          signedUrls.push({ bucket, path });
          return Promise.resolve({ data: { signedUrl: `https://signed.test/${bucket}/${path}` }, error: null });
        },
      }),
    },
  };

  return {
    client,
    writes,
    signedUrls,
    /** Writes recorded against one table — used to assert a refusal wrote nothing. */
    writesTo: (table: string) => writes.filter((write) => write.table === table),
  };
}

export type SupabaseMock = ReturnType<typeof createSupabaseMock>;

/** A minimal authenticated user for the auth middleware mocks. */
export function testUser(overrides: Partial<{ id: string; email: string; role: string; name: string }> = {}) {
  return {
    id: 'user-self',
    email: 'self@example.com',
    role: 'buyer',
    name: 'Self',
    ...overrides,
  };
}

import type { Json } from '@/lib/database.types';

export type { Json };

/**
 * A JSON object, as a `jsonb` column accepts it.
 *
 * `Record<string, unknown>` reads naturally but is wider than jsonb: `unknown`
 * admits Dates, functions and class instances, which JSON.stringify mangles or
 * drops. With the typed client, a meta/report payload must be this instead.
 */
export type JsonObject = { [key: string]: Json | undefined };

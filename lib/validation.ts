/**
 * Request validation helpers for MotoPayee.
 *
 * Route handlers historically parsed `await request.json()` and hand-rolled
 * their checks, which meant unvalidated fields reached Supabase inserts. These
 * helpers encode the convention already used by the zod-based routes:
 *
 *   const parsed = await parseBody(createSchema, request);
 *   if (!parsed.success) return parsed.response;
 *   // parsed.data is fully typed and validated
 *
 * A malformed body (invalid JSON, wrong shape) always yields a 400 with a
 * `fields` map so clients can highlight the offending inputs. Messages are
 * derived from the schema, never from the raw input, so nothing user-supplied
 * is echoed back.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';

export type ParseSuccess<T> = { success: true; data: T };
export type ParseFailure = { success: false; response: NextResponse };
export type ParseResult<T> = ParseSuccess<T> | ParseFailure;

/** Default message used when a caller doesn't supply one. */
const DEFAULT_MESSAGE = 'Requête invalide.';

/**
 * Collapse zod issues into a `{ field: message }` map.
 *
 * Nested paths are dot-joined (`vehicle.make`), array indices included
 * (`photos.0.url`). The first issue per field wins — clients show one message
 * per input anyway.
 */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join('.') : '_';
    if (!(key in fields)) fields[key] = issue.message;
  }
  return fields;
}

/** Build the standard 400 response for a failed validation. */
export function invalidRequest(error: z.ZodError, message = DEFAULT_MESSAGE): NextResponse {
  return NextResponse.json({ error: message, fields: fieldErrors(error) }, { status: 400 });
}

/**
 * Parse and validate a JSON request body against a zod schema.
 *
 * Invalid JSON is treated as a validation failure rather than throwing, so
 * handlers never need their own try/catch around `request.json()`.
 *
 * @param schema - Schema describing the expected body
 * @param request - The incoming request
 * @param message - Optional human-facing error message (shown to the client)
 */
export async function parseBody<S extends z.ZodType>(
  schema: S,
  request: Request,
  message = DEFAULT_MESSAGE
): Promise<ParseResult<z.infer<S>>> {
  const body = await request.json().catch(() => undefined);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return { success: false, response: invalidRequest(parsed.error, message) };
  }
  return { success: true, data: parsed.data };
}

/**
 * Parse and validate URL search params against a zod schema.
 *
 * Repeated keys collapse into an array so `?tag=a&tag=b` can be validated with
 * `z.array(...)`; single occurrences stay scalar. Use `z.coerce.number()` and
 * friends in the schema — every value arrives as a string.
 */
export function parseQuery<S extends z.ZodType>(
  schema: S,
  request: Request,
  message = DEFAULT_MESSAGE
): ParseResult<z.infer<S>> {
  const params = new URL(request.url).searchParams;
  const raw: Record<string, string | string[]> = {};
  for (const key of Array.from(new Set(params.keys()))) {
    const values = params.getAll(key);
    raw[key] = values.length > 1 ? values : values[0];
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, response: invalidRequest(parsed.error, message) };
  }
  return { success: true, data: parsed.data };
}

// --- Shared field schemas ---------------------------------------------------
// Reused across routes so limits stay consistent (and match DB column widths).

/** Cameroon-friendly phone: digits, spaces and an optional leading +. */
export const phoneSchema = z
  .string()
  .trim()
  .min(6)
  .max(40)
  .regex(/^\+?[\d\s-]+$/, 'Numéro de téléphone invalide.');

/** Trimmed, bounded free text. Empty strings normalise to undefined. */
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v === '' ? undefined : v));

/** Positive amount in XAF — integers only, no cents in this currency. */
export const amountXaf = z.number().int().positive().max(1_000_000_000);

/** Page/limit pair shared by list endpoints. */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

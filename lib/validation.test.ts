import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  parseBody,
  parseQuery,
  fieldErrors,
  phoneSchema,
  optionalText,
  amountXaf,
  paginationSchema,
} from './validation';

function jsonRequest(body: unknown): Request {
  return new Request('https://motopayee.test/api/thing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const schema = z.object({
  listing_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(10).optional(),
});

const VALID_UUID = '3f2504e0-4f89-11d3-9a0c-0305e82c3301';

describe('parseBody', () => {
  it('returns typed data for a valid body', async () => {
    const result = await parseBody(schema, jsonRequest({ listing_id: VALID_UUID, rating: 4 }));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.listing_id).toBe(VALID_UUID);
      expect(result.data.rating).toBe(4);
    }
  });

  it('rejects a body that fails the schema with a 400 and per-field errors', async () => {
    const result = await parseBody(schema, jsonRequest({ listing_id: 'nope', rating: 9 }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(400);
      const payload = await result.response.json();
      expect(Object.keys(payload.fields)).toEqual(['listing_id', 'rating']);
    }
  });

  it('treats malformed JSON as a validation failure rather than throwing', async () => {
    const bad = new Request('https://motopayee.test/api/thing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{not json',
    });
    const result = await parseBody(schema, bad);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.response.status).toBe(400);
  });

  it('uses the caller-supplied message', async () => {
    const result = await parseBody(schema, jsonRequest({}), 'Avis invalide.');
    expect(result.success).toBe(false);
    if (!result.success) {
      const payload = await result.response.json();
      expect(payload.error).toBe('Avis invalide.');
    }
  });

  it('strips unknown keys so they never reach the database', async () => {
    const result = await parseBody(
      schema,
      jsonRequest({ listing_id: VALID_UUID, rating: 5, status: 'published', is_admin: true })
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty('status');
      expect(result.data).not.toHaveProperty('is_admin');
    }
  });
});

describe('parseQuery', () => {
  const listSchema = z.object({
    q: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1),
    tag: z.array(z.string()).optional(),
  });

  function getRequest(qs: string) {
    return new Request(`https://motopayee.test/api/listings?${qs}`);
  }

  it('coerces scalars and applies defaults', () => {
    const result = parseQuery(listSchema, getRequest('q=toyota&page=3'));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.q).toBe('toyota');
      expect(result.data.page).toBe(3);
    }
  });

  it('defaults missing values', () => {
    const result = parseQuery(listSchema, getRequest(''));
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.page).toBe(1);
  });

  it('collapses repeated keys into an array', () => {
    const result = parseQuery(listSchema, getRequest('tag=a&tag=b'));
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.tag).toEqual(['a', 'b']);
  });

  it('rejects out-of-range values', () => {
    const result = parseQuery(listSchema, getRequest('page=0'));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.response.status).toBe(400);
  });
});

describe('fieldErrors', () => {
  it('dot-joins nested paths and keeps the first issue per field', () => {
    const nested = z.object({ vehicle: z.object({ make: z.string() }) });
    const parsed = nested.safeParse({ vehicle: { make: 12 } });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(fieldErrors(parsed.error)).toHaveProperty('vehicle.make');
    }
  });

  it('uses "_" for root-level issues', () => {
    const parsed = z.object({ a: z.string() }).safeParse('not an object');
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(fieldErrors(parsed.error)).toHaveProperty('_');
    }
  });
});

describe('shared field schemas', () => {
  it('accepts Cameroon phone formats', () => {
    for (const phone of ['+237 6 99 00 00 00', '699000000', '+237699000000']) {
      expect(phoneSchema.safeParse(phone).success).toBe(true);
    }
  });

  it('rejects phone values containing letters', () => {
    expect(phoneSchema.safeParse('call-me-maybe').success).toBe(false);
  });

  it('normalises empty optional text to undefined', () => {
    expect(optionalText(100).parse('')).toBeUndefined();
    expect(optionalText(100).parse('  hi  ')).toBe('hi');
  });

  it('rejects non-integer and negative XAF amounts', () => {
    expect(amountXaf.safeParse(150000).success).toBe(true);
    expect(amountXaf.safeParse(1500.5).success).toBe(false);
    expect(amountXaf.safeParse(-1).success).toBe(false);
    expect(amountXaf.safeParse(0).success).toBe(false);
  });

  it('caps pagination limit at 50', () => {
    expect(paginationSchema.safeParse({ limit: 500 }).success).toBe(false);
    expect(paginationSchema.parse({})).toEqual({ page: 1, limit: 20 });
  });
});

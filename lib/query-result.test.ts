import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/error-reporting', () => ({ reportError: vi.fn(() => 'evt_test') }));

import { reportError } from '@/lib/error-reporting';
import { QueryError, isNotFoundError, isQueryFailure, rowOrNull } from './query-result';

describe('isNotFoundError', () => {
  it('treats zero rows from .single() as not found', () => {
    expect(isNotFoundError({ code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' })).toBe(true);
  });

  it('treats a malformed uuid in the URL as not found', () => {
    expect(isNotFoundError({ code: '22P02', message: 'invalid input syntax for type uuid: "abc"' })).toBe(true);
  });

  it.each([
    ['PGRST200', 'Could not find a relationship between ...'], // the polymorphic-embed bug
    ['42703', 'column listings.typo does not exist'],
    ['42501', 'permission denied for function'],
    ['57014', 'canceling statement due to statement timeout'],
    [undefined, 'fetch failed'],
  ])('does not treat %s as not found', (code, message) => {
    expect(isNotFoundError({ code, message })).toBe(false);
    expect(isQueryFailure({ code, message })).toBe(true);
  });

  it('is false for no error at all', () => {
    expect(isNotFoundError(null)).toBe(false);
    expect(isQueryFailure(null)).toBe(false);
  });
});

describe('rowOrNull', () => {
  it('returns the row', () => {
    expect(rowOrNull({ data: { id: 'x' }, error: null }, 'test')).toEqual({ id: 'x' });
  });

  it('returns null for a missing row without reporting it', () => {
    vi.mocked(reportError).mockClear();
    expect(rowOrNull({ data: null, error: { code: 'PGRST116', message: 'no rows' } }, 'test')).toBeNull();
    expect(rowOrNull({ data: null, error: null }, 'test')).toBeNull();
    expect(reportError).not.toHaveBeenCalled();
  });

  it('reports and throws on a real failure instead of returning null', () => {
    vi.mocked(reportError).mockClear();
    const failure = { code: 'PGRST200', message: 'Could not find a relationship' };
    expect(() => rowOrNull({ data: null, error: failure }, 'listings/[id]')).toThrow(QueryError);
    expect(reportError).toHaveBeenCalledWith(failure, { source: 'query', route: 'listings/[id]' });
  });

  it('names the route and code in the thrown message', () => {
    try {
      rowOrNull({ data: null, error: { code: '42703', message: 'column x does not exist' } }, 'admin/listings/[id]');
      throw new Error('should have thrown');
    } catch (err) {
      expect((err as QueryError).message).toBe('admin/listings/[id]: 42703 column x does not exist');
      expect((err as QueryError).code).toBe('42703');
    }
  });
});

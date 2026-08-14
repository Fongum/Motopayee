import { describe, it, expect, vi } from 'vitest';
import { rateLimit, guardRateLimit, tooManyRequests } from './rate-limit';

describe('rateLimit', () => {
  it('allows requests up to the limit, then blocks', () => {
    const key = `test-${Math.random()}`;
    const max = 3;
    expect(rateLimit(key, max, 60_000).allowed).toBe(true);
    expect(rateLimit(key, max, 60_000).allowed).toBe(true);
    expect(rateLimit(key, max, 60_000).allowed).toBe(true);
    // 4th request exceeds the limit
    expect(rateLimit(key, max, 60_000).allowed).toBe(false);
  });

  it('reports decreasing remaining quota', () => {
    const key = `test-${Math.random()}`;
    expect(rateLimit(key, 2, 60_000).remaining).toBe(1);
    expect(rateLimit(key, 2, 60_000).remaining).toBe(0);
  });

  it('resets after the window elapses', () => {
    vi.useFakeTimers();
    try {
      const key = `test-${Math.random()}`;
      expect(rateLimit(key, 1, 1_000).allowed).toBe(true);
      // still within the window -> blocked
      expect(rateLimit(key, 1, 1_000).allowed).toBe(false);
      // advance past the window -> allowed again
      vi.advanceTimersByTime(1_001);
      expect(rateLimit(key, 1, 1_000).allowed).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('isolates counts per key', () => {
    const a = `test-a-${Math.random()}`;
    const b = `test-b-${Math.random()}`;
    rateLimit(a, 1, 60_000);
    expect(rateLimit(a, 1, 60_000).allowed).toBe(false);
    expect(rateLimit(b, 1, 60_000).allowed).toBe(true);
  });
});

describe('guardRateLimit', () => {
  it('returns null while under the limit', async () => {
    const key = `guard-${Math.random()}`;
    expect(await guardRateLimit(key, 2, 60_000)).toBeNull();
  });

  it('returns a 429 Response once the limit is exceeded', async () => {
    const key = `guard-${Math.random()}`;
    await guardRateLimit(key, 1, 60_000);
    const blocked = await guardRateLimit(key, 1, 60_000);
    expect(blocked).toBeInstanceOf(Response);
    expect(blocked?.status).toBe(429);
  });
});

describe('tooManyRequests', () => {
  it('sets a Retry-After header of at least 1 second', () => {
    const res = tooManyRequests(Date.now() + 30_000);
    expect(res.status).toBe(429);
    const retry = Number(res.headers.get('Retry-After'));
    expect(retry).toBeGreaterThanOrEqual(1);
    expect(retry).toBeLessThanOrEqual(30);
  });
});

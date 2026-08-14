import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// The MoMo module reads credentials from env at import time, so set them and
// re-import a fresh copy per test via vi.resetModules() + dynamic import.
async function loadModule() {
  process.env.MTN_MOMO_SUBSCRIPTION_KEY = 'sub';
  process.env.MTN_MOMO_API_USER = 'user';
  process.env.MTN_MOMO_API_KEY = 'key';
  process.env.MTN_MOMO_BASE_URL = 'https://momo.test';
  vi.resetModules();
  return import('./mobilemoney');
}

const REF = '11111111-1111-1111-1111-111111111111';

function tokenResponse() {
  return { ok: true, status: 200, json: async () => ({ access_token: 'tok' }), text: async () => '' };
}

/** Mock fetch: always serves a token, delegates requesttopay to the queue. */
function mockFetch(requestToPayResponses: Array<{ status: number; body?: string }>) {
  let i = 0;
  return vi.fn(async (url: string) => {
    if (url.includes('/token/')) return tokenResponse();
    const r = requestToPayResponses[Math.min(i, requestToPayResponses.length - 1)];
    i++;
    return { ok: r.status >= 200 && r.status < 300, status: r.status, text: async () => r.body ?? '', json: async () => ({}) };
  });
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('requestMomoPayment', () => {
  it('returns ok on 202 Accepted', async () => {
    const fetchMock = mockFetch([{ status: 202 }]);
    vi.stubGlobal('fetch', fetchMock);
    const { requestMomoPayment } = await loadModule();

    const result = await requestMomoPayment(REF, 5000, '670000000', 'test');
    expect(result.ok).toBe(true);
    // token + one requesttopay
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('treats 409 Conflict (duplicate reference) as success — never double-charges', async () => {
    const fetchMock = mockFetch([{ status: 409, body: 'duplicate' }]);
    vi.stubGlobal('fetch', fetchMock);
    const { requestMomoPayment } = await loadModule();

    const result = await requestMomoPayment(REF, 5000, '670000000', 'test');
    expect(result.ok).toBe(true);
  });

  it('retries once on a 5xx then succeeds (same reference id = safe)', async () => {
    const fetchMock = mockFetch([{ status: 500, body: 'boom' }, { status: 202 }]);
    vi.stubGlobal('fetch', fetchMock);
    const { requestMomoPayment } = await loadModule();

    const promise = requestMomoPayment(REF, 5000, '670000000', 'test');
    await vi.advanceTimersByTimeAsync(600); // let the backoff sleep elapse
    const result = await promise;

    expect(result.ok).toBe(true);
    // token + two requesttopay attempts
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('does not retry on a 4xx (client error) and reports failure', async () => {
    const fetchMock = mockFetch([{ status: 400, body: 'bad request' }, { status: 202 }]);
    vi.stubGlobal('fetch', fetchMock);
    const { requestMomoPayment } = await loadModule();

    const result = await requestMomoPayment(REF, 5000, '670000000', 'test');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('400');
    // token + exactly one requesttopay (no retry)
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('fails cleanly when credentials are missing', async () => {
    delete process.env.MTN_MOMO_SUBSCRIPTION_KEY;
    delete process.env.MTN_MOMO_API_USER;
    delete process.env.MTN_MOMO_API_KEY;
    vi.resetModules();
    const { requestMomoPayment } = await import('./mobilemoney');

    const result = await requestMomoPayment(REF, 5000, '670000000', 'test');
    expect(result.ok).toBe(false);
  });
});

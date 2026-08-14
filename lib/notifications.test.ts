import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// notifications.ts reads credentials from env at import time, so set them and
// re-import a fresh copy per test via vi.resetModules() + dynamic import.
async function loadModule(withCredentials = true) {
  if (withCredentials) {
    process.env.AFRICASTALKING_USERNAME = 'motopayee';
    process.env.AFRICASTALKING_API_KEY = 'key';
  } else {
    delete process.env.AFRICASTALKING_USERNAME;
    delete process.env.AFRICASTALKING_API_KEY;
  }
  vi.resetModules();
  return import('./notifications');
}

/** Mock fetch that serves the queued responses in order. */
function mockFetch(responses: Array<{ status: number; body?: string }>) {
  let i = 0;
  return vi.fn(async () => {
    const r = responses[Math.min(i, responses.length - 1)];
    i++;
    return {
      ok: r.status >= 200 && r.status < 300,
      status: r.status,
      text: async () => r.body ?? '',
      json: async () => ({}),
    };
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('sendSMS', () => {
  it('sends once on success', async () => {
    const fetchMock = mockFetch([{ status: 201 }]);
    vi.stubGlobal('fetch', fetchMock);
    const { sendSMS } = await loadModule();

    await sendSMS('670000000', 'test');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries once on a 5xx then succeeds', async () => {
    const fetchMock = mockFetch([{ status: 500, body: 'boom' }, { status: 201 }]);
    vi.stubGlobal('fetch', fetchMock);
    const { sendSMS } = await loadModule();

    const promise = sendSMS('670000000', 'test');
    await vi.advanceTimersByTimeAsync(600); // let the backoff sleep elapse
    await promise;

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not retry on a 4xx — a bad number will not fix itself', async () => {
    const fetchMock = mockFetch([{ status: 400, body: 'bad number' }, { status: 201 }]);
    vi.stubGlobal('fetch', fetchMock);
    const { sendSMS } = await loadModule();

    await sendSMS('670000000', 'test');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries once on a network error and never throws', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValueOnce({ ok: true, status: 201, text: async () => '', json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);
    const { sendSMS } = await loadModule();

    const promise = sendSMS('670000000', 'test');
    await vi.advanceTimersByTimeAsync(600);
    await expect(promise).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('swallows a total failure after both attempts', async () => {
    const fetchMock = mockFetch([{ status: 500 }, { status: 500 }]);
    vi.stubGlobal('fetch', fetchMock);
    const { sendSMS } = await loadModule();

    const promise = sendSMS('670000000', 'test');
    await vi.advanceTimersByTimeAsync(600);
    await expect(promise).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('aborts a hung request via the timeout signal', async () => {
    // Resolve only when the abort signal fires, proving a timeout is attached.
    const fetchMock = vi.fn(
      (url: string, init: RequestInit) =>
        new Promise((resolve, reject) => {
          void url;
          void resolve;
          init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        })
    );
    vi.stubGlobal('fetch', fetchMock);
    const { sendSMS } = await loadModule();

    const promise = sendSMS('670000000', 'test');
    // First attempt times out at 10s, backoff 500ms, second attempt times out too.
    await vi.advanceTimersByTimeAsync(10_000);
    await vi.advanceTimersByTimeAsync(600);
    await vi.advanceTimersByTimeAsync(10_000);
    await expect(promise).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('is a no-op when the phone number is missing', async () => {
    const fetchMock = mockFetch([{ status: 201 }]);
    vi.stubGlobal('fetch', fetchMock);
    const { sendSMS } = await loadModule();

    await sendSMS(null, 'test');
    await sendSMS(undefined, 'test');
    await sendSMS('', 'test');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('skips sending when credentials are not configured', async () => {
    const fetchMock = mockFetch([{ status: 201 }]);
    vi.stubGlobal('fetch', fetchMock);
    const { sendSMS } = await loadModule(false);

    await sendSMS('670000000', 'test');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('normalises local Cameroon numbers to +237 E.164', async () => {
    const fetchMock = mockFetch([{ status: 201 }]);
    vi.stubGlobal('fetch', fetchMock);
    const { sendSMS } = await loadModule();

    await sendSMS('670000000', 'test');

    // vi.fn() with a zero-arg impl types calls as []; the real invocation still
    // passes (url, init), so read it back through a cast.
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const sent = new URLSearchParams(init.body as string);
    expect(sent.get('to')).toBe('+237670000000');
    expect(sent.get('message')).toBe('MotoPayee: test');
  });

  it('leaves an already-international number intact', async () => {
    const fetchMock = mockFetch([{ status: 201 }]);
    vi.stubGlobal('fetch', fetchMock);
    const { sendSMS } = await loadModule();

    await sendSMS('+237 6 70 00 00 00', 'test');

    // vi.fn() with a zero-arg impl types calls as []; the real invocation still
    // passes (url, init), so read it back through a cast.
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(new URLSearchParams(init.body as string).get('to')).toBe('+237670000000');
  });
});

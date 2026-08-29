import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { describeError, newEventId, reportError } from './error-reporting';

const originalWebhook = process.env.ERROR_WEBHOOK_URL;

beforeEach(() => {
  vi.restoreAllMocks();
  delete process.env.ERROR_WEBHOOK_URL;
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  if (originalWebhook === undefined) delete process.env.ERROR_WEBHOOK_URL;
  else process.env.ERROR_WEBHOOK_URL = originalWebhook;
});

describe('newEventId', () => {
  it('is short enough to read out loud', () => {
    const id = newEventId();
    expect(id).toMatch(/^[A-Z0-9]{4,8}$/);
  });

  it('does not repeat', () => {
    const ids = new Set(Array.from({ length: 200 }, () => newEventId()));
    expect(ids.size).toBeGreaterThan(190);
  });
});

describe('describeError', () => {
  it('reads message and stack off an Error', () => {
    const described = describeError(new Error('boom'));
    expect(described.message).toBe('boom');
    expect(described.stack).toContain('boom');
  });

  it('falls back to the name when an Error has no message', () => {
    expect(describeError(new TypeError()).message).toBe('TypeError');
  });

  it('accepts a thrown string', () => {
    expect(describeError('just a string').message).toBe('just a string');
  });

  it('serialises a thrown object rather than losing it', () => {
    expect(describeError({ code: 42 }).message).toBe('{"code":42}');
  });

  it('survives something unserialisable', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(describeError(circular).message).toBe('Unserialisable error');
  });
});

describe('reportError', () => {
  it('returns an event id the caller can show the customer', () => {
    expect(reportError(new Error('boom'), { source: 'test' })).toMatch(/^[A-Z0-9]{4,8}$/);
  });

  it('logs the failure with its context', () => {
    const sink = vi.spyOn(console, 'error').mockImplementation(() => {});
    reportError(new Error('payment exploded'), { source: 'api/payments', userId: 'u1' });

    expect(sink).toHaveBeenCalled();
    const logged = sink.mock.calls.flat().join(' ');
    expect(logged).toContain('payment exploded');
    expect(logged).toContain('api/payments');
  });

  it('does not call the webhook when none is configured', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    reportError(new Error('boom'));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('forwards to the webhook when one is configured', async () => {
    process.env.ERROR_WEBHOOK_URL = 'https://hooks.test/incoming';
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('ok', { status: 200 }));

    const eventId = reportError(new Error('boom'), { source: 'api/test' });
    await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalled());

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://hooks.test/incoming');
    const body = JSON.parse(String((init as RequestInit).body));
    expect(body.event_id).toBe(eventId);
    expect(body.message).toBe('boom');
    expect(body.text).toContain('api/test');
  });

  it('never throws when the webhook fails', async () => {
    process.env.ERROR_WEBHOOK_URL = 'https://hooks.test/incoming';
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'));

    expect(() => reportError(new Error('boom'))).not.toThrow();
  });

  it('never throws on a bad error value', () => {
    expect(() => reportError(undefined)).not.toThrow();
    expect(() => reportError(null, { source: 'test' })).not.toThrow();
  });
});

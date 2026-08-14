import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

async function loadModule(env: { NODE_ENV?: string; LOG_LEVEL?: string } = {}) {
  // NODE_ENV is read at call time, not import time, but LOG_LEVEL is too — set
  // both before importing so each test gets a predictable configuration.
  if (env.NODE_ENV === undefined) delete (process.env as Record<string, unknown>).NODE_ENV;
  else (process.env as Record<string, unknown>).NODE_ENV = env.NODE_ENV;

  if (env.LOG_LEVEL === undefined) delete process.env.LOG_LEVEL;
  else process.env.LOG_LEVEL = env.LOG_LEVEL;

  vi.resetModules();
  return import('./logger');
}

const originalNodeEnv = process.env.NODE_ENV;

let logSpy: ReturnType<typeof vi.spyOn>;
let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  (process.env as Record<string, unknown>).NODE_ENV = originalNodeEnv;
  delete process.env.LOG_LEVEL;
  vi.restoreAllMocks();
});

describe('logger output routing', () => {
  it('sends error and warn to stderr', async () => {
    const { logger } = await loadModule({ NODE_ENV: 'development' });

    logger.error('boom');
    logger.warn('careful');

    expect(errorSpy).toHaveBeenCalledTimes(2);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('sends info and debug to stdout', async () => {
    const { logger } = await loadModule({ NODE_ENV: 'development' });

    logger.info('hello');
    logger.debug('details');

    expect(logSpy).toHaveBeenCalledTimes(2);
    expect(errorSpy).not.toHaveBeenCalled();
  });
});

describe('production format', () => {
  it('emits one JSON object per line with level, message and time', async () => {
    const { logger } = await loadModule({ NODE_ENV: 'production' });

    logger.info('Listing published', { listingId: 'abc' });

    const line = logSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(line);
    expect(parsed.level).toBe('info');
    expect(parsed.message).toBe('Listing published');
    expect(parsed.listingId).toBe('abc');
    expect(typeof parsed.time).toBe('string');
  });

  it('serialises an Error rather than emitting {}', async () => {
    const { logger } = await loadModule({ NODE_ENV: 'production' });

    logger.error('Payment failed', { err: new Error('connection reset') });

    const parsed = JSON.parse(errorSpy.mock.calls[0][0] as string);
    expect(parsed.err.name).toBe('Error');
    expect(parsed.err.message).toBe('connection reset');
    expect(typeof parsed.err.stack).toBe('string');
  });

  it('serialises a non-Error thrown value', async () => {
    const { logger } = await loadModule({ NODE_ENV: 'production' });

    logger.error('Odd failure', { err: { code: '23505' } });

    const parsed = JSON.parse(errorSpy.mock.calls[0][0] as string);
    expect(parsed.err.message).toContain('object');
  });

  it('accepts `error` as an alias for `err`', async () => {
    const { logger } = await loadModule({ NODE_ENV: 'production' });

    logger.error('Insert failed', { error: new Error('nope') });

    const parsed = JSON.parse(errorSpy.mock.calls[0][0] as string);
    expect(parsed.err.message).toBe('nope');
  });
});

describe('development format', () => {
  it('emits a readable LEVEL message line', async () => {
    const { logger } = await loadModule({ NODE_ENV: 'development' });

    logger.info('Listing published', { listingId: 'abc' });

    const line = logSpy.mock.calls[0][0] as string;
    expect(line).toContain('INFO Listing published');
    expect(line).toContain('"listingId":"abc"');
  });

  it('omits the context suffix when there is none', async () => {
    const { logger } = await loadModule({ NODE_ENV: 'development' });

    logger.info('Plain message');

    expect(logSpy.mock.calls[0][0]).toBe('INFO Plain message');
  });
});

describe('redaction', () => {
  it('masks phone numbers to the last three digits', async () => {
    const { logger } = await loadModule({ NODE_ENV: 'production' });

    logger.info('Search alert', { phone: '+237670000123' });

    const parsed = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(parsed.phone).toBe('***123');
    expect(parsed.phone).not.toContain('670000');
  });

  it('masks every known phone key', async () => {
    const { logger } = await loadModule({ NODE_ENV: 'production' });

    logger.info('Payment', { msisdn: '237670000456', phone_number: '670000789' });

    const parsed = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(parsed.msisdn).toBe('***456');
    expect(parsed.phone_number).toBe('***789');
  });

  it('fully masks a too-short value', async () => {
    const { logger } = await loadModule({ NODE_ENV: 'production' });

    logger.info('Odd', { phone: '12' });

    expect(JSON.parse(logSpy.mock.calls[0][0] as string).phone).toBe('***');
  });

  it('leaves non-sensitive fields untouched', async () => {
    const { logger } = await loadModule({ NODE_ENV: 'production' });

    logger.info('Alert', { email: 'a@b.com', vehicle: 'Toyota' });

    const parsed = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(parsed.email).toBe('a@b.com');
    expect(parsed.vehicle).toBe('Toyota');
  });

  it('drops undefined context values', async () => {
    const { logger } = await loadModule({ NODE_ENV: 'production' });

    logger.info('Alert', { present: 1, absent: undefined });

    const parsed = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(parsed).toHaveProperty('present');
    expect(parsed).not.toHaveProperty('absent');
  });
});

describe('level filtering', () => {
  it('suppresses debug in production by default', async () => {
    const { logger } = await loadModule({ NODE_ENV: 'production' });

    logger.debug('noisy');
    logger.info('kept');

    expect(logSpy).toHaveBeenCalledTimes(1);
  });

  it('honours LOG_LEVEL', async () => {
    const { logger } = await loadModule({ NODE_ENV: 'production', LOG_LEVEL: 'error' });

    logger.warn('dropped');
    logger.error('kept');

    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it('allows debug through in development', async () => {
    const { logger } = await loadModule({ NODE_ENV: 'development' });

    logger.debug('visible');

    expect(logSpy).toHaveBeenCalledTimes(1);
  });
});

describe('logFailure', () => {
  it('returns a rejection handler that logs with context', async () => {
    const { logFailure } = await loadModule({ NODE_ENV: 'production' });

    await Promise.reject(new Error('SMS down')).catch(
      logFailure('Approval SMS failed', { applicationId: 'app-1' })
    );

    const parsed = JSON.parse(errorSpy.mock.calls[0][0] as string);
    expect(parsed.message).toBe('Approval SMS failed');
    expect(parsed.applicationId).toBe('app-1');
    expect(parsed.err.message).toBe('SMS down');
  });

  it('never rethrows, so a fire-and-forget promise stays settled', async () => {
    const { logFailure } = await loadModule({ NODE_ENV: 'production' });

    await expect(
      Promise.reject(new Error('boom')).catch(logFailure('Failed'))
    ).resolves.toBeUndefined();
  });
});

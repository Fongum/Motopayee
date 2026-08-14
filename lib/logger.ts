/**
 * Structured logging for MotoPayee.
 *
 * Replaces scattered `console.*` calls so log lines carry a level, a stable
 * message and machine-readable context instead of interpolated strings.
 *
 *   logger.error('Payment request failed', { err, paymentId, provider });
 *   logger.info('Listing published', { listingId });
 *
 * Output shape:
 *   - production: one JSON object per line, which Vercel's log drain can index.
 *   - development: a compact `LEVEL message {context}` line that stays readable.
 *
 * Errors passed as `err` are serialised to name/message/stack — a bare Error
 * would otherwise stringify to `{}` under JSON.stringify.
 *
 * Phone numbers are masked (see REDACTED_KEYS): they are customer PII and logs
 * are retained far longer than the request that produced them. The last three
 * digits survive so a specific number can still be correlated during support.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  [key: string]: unknown;
}

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

/** LOG_LEVEL env var gates output; defaults to debug in dev, info elsewhere. */
function minLevel(): number {
  const configured = process.env.LOG_LEVEL as LogLevel | undefined;
  if (configured && configured in LEVEL_ORDER) return LEVEL_ORDER[configured];
  return process.env.NODE_ENV === 'production' ? LEVEL_ORDER.info : LEVEL_ORDER.debug;
}

/** Context keys whose values are masked before they reach the log sink. */
const REDACTED_KEYS = new Set(['phone', 'msisdn', 'phone_number']);

/** Keep the last 3 digits so support can still correlate a number. */
function maskPhone(value: unknown): string {
  const digits = String(value).replace(/\D/g, '');
  if (digits.length <= 3) return '***';
  return `***${digits.slice(-3)}`;
}

function serialiseError(err: unknown): LogContext {
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack };
  }
  return { message: String(err) };
}

function normalise(context: LogContext): LogContext {
  const out: LogContext = {};
  for (const [key, value] of Object.entries(context)) {
    if (value === undefined) continue;
    if (key === 'err' || key === 'error') {
      out.err = serialiseError(value);
    } else if (REDACTED_KEYS.has(key)) {
      out[key] = maskPhone(value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

function emit(level: LogLevel, message: string, context: LogContext = {}): void {
  if (LEVEL_ORDER[level] < minLevel()) return;

  const fields = normalise(context);
  // error/warn go to stderr, everything else to stdout.
  const sink = level === 'error' || level === 'warn' ? console.error : console.log;

  if (process.env.NODE_ENV === 'production') {
    sink(JSON.stringify({ level, message, time: new Date().toISOString(), ...fields }));
    return;
  }

  const suffix = Object.keys(fields).length > 0 ? ` ${JSON.stringify(fields)}` : '';
  sink(`${level.toUpperCase()} ${message}${suffix}`);
}

export const logger = {
  debug: (message: string, context?: LogContext) => emit('debug', message, context),
  info: (message: string, context?: LogContext) => emit('info', message, context),
  warn: (message: string, context?: LogContext) => emit('warn', message, context),
  error: (message: string, context?: LogContext) => emit('error', message, context),
};

/**
 * Handler for fire-and-forget promises, replacing `.catch(console.error)`:
 *
 *   notifyApproved(phone).catch(logFailure('Approval SMS failed', { appId }));
 */
export function logFailure(message: string, context: LogContext = {}) {
  return (err: unknown) => logger.error(message, { ...context, err });
}

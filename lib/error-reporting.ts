import { logger } from '@/lib/logger';

/**
 * Where production failures go.
 *
 * 76 API routes return a 500 and most of them said nothing when they did, so a
 * failure reached the customer as a generic message and left no trace. This
 * records the error through the structured logger — which already masks phone
 * numbers — and optionally forwards it to a webhook so somebody is told
 * without watching a log stream.
 *
 * Deliberately provider-agnostic: ERROR_WEBHOOK_URL accepts a Slack incoming
 * webhook or any collector that takes JSON, so nothing here depends on a
 * vendor SDK. Point it at Sentry's store endpoint later and the call sites do
 * not change.
 *
 * Reporting must never make an incident worse: every path is caught, and the
 * forward is fire-and-forget with a timeout.
 */

const WEBHOOK_TIMEOUT_MS = 5_000;

export interface ErrorContext {
  /** Where it happened: 'api/payments/request', 'client', 'cron/weekly-snapshot'. */
  source?: string;
  userId?: string;
  route?: string;
  [key: string]: unknown;
}

export interface ErrorReport {
  eventId: string;
  message: string;
  stack?: string;
  context: ErrorContext;
}

/**
 * Short, human-quotable id. A customer can read it out and it can be grepped
 * from the logs — that is its only job, so randomness beats structure.
 */
export function newEventId(): string {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

export function describeError(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return { message: error.message || error.name, stack: error.stack };
  }
  if (typeof error === 'string') return { message: error };
  try {
    return { message: JSON.stringify(error) };
  } catch {
    return { message: 'Unserialisable error' };
  }
}

async function forward(report: ErrorReport): Promise<void> {
  const url = process.env.ERROR_WEBHOOK_URL;
  if (!url) return;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // `text` carries the summary so a Slack webhook renders something useful
      // without any mapping; richer collectors can read the structured fields.
      body: JSON.stringify({
        text: `MotoPayee error [${report.eventId}] ${report.context.source ?? 'unknown'}: ${report.message}`,
        event_id: report.eventId,
        message: report.message,
        stack: report.stack,
        context: report.context,
        environment: process.env.NODE_ENV,
        time: new Date().toISOString(),
      }),
      signal: controller.signal,
    });
  } catch (err) {
    // A failing error pipeline must not throw into the failing request.
    logger.warn('Error webhook delivery failed', { err });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Record a failure. Returns the event id so a handler can hand the customer a
 * reference without exposing what actually went wrong.
 */
export function reportError(error: unknown, context: ErrorContext = {}): string {
  const eventId = newEventId();

  try {
    const { message, stack } = describeError(error);
    const report: ErrorReport = { eventId, message, stack, context };

    logger.error(message, { ...context, eventId, err: error });
    void forward(report);
  } catch (reportingFailure) {
    // Last resort: never let reporting throw.
    try {
      logger.error('Error reporting failed', { err: reportingFailure });
    } catch {
      /* give up quietly */
    }
  }

  return eventId;
}

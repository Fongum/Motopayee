/**
 * Rate limiting for MotoPayee.
 *
 * Two layers:
 *   - A durable, distributed limiter backed by Upstash Redis (works correctly
 *     across serverless instances and the edge runtime).
 *   - An in-memory fallback used when Upstash is not configured. The in-memory
 *     store is per-instance, so it only provides best-effort protection — set
 *     UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN in production.
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Periodic cleanup of expired entries. Guarded so it never runs at module scope
// in the edge runtime (where long-lived timers are discouraged).
if (process.env.NEXT_RUNTIME !== 'edge' && typeof setInterval === 'function') {
  const timer = setInterval(() => {
    const now = Date.now();
    store.forEach((entry, key) => {
      if (entry.resetAt < now) store.delete(key);
    });
  }, 5 * 60 * 1000);
  // Don't keep the Node process alive just for cleanup.
  (timer as { unref?: () => void }).unref?.();
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Synchronous in-memory rate limit check.
 *
 * Prefer {@link checkRateLimit} / {@link guardRateLimit} in route handlers so
 * the distributed Upstash limiter is used when available. This is kept for the
 * fallback path and for fully deterministic unit testing.
 *
 * @param key - Unique identifier (e.g., IP or user ID)
 * @param maxRequests - Maximum requests allowed in window
 * @param windowMs - Time window in milliseconds
 */
export function rateLimit(
  key: string,
  maxRequests: number = 60,
  windowMs: number = 60_000
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
  }

  entry.count++;
  if (entry.count > maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return { allowed: true, remaining: maxRequests - entry.count, resetAt: entry.resetAt };
}

// --- Upstash (distributed) limiter -----------------------------------------

let redis: Redis | null | undefined; // undefined = not yet resolved
const limiterCache = new Map<string, Ratelimit>();

function getRedis(): Redis | null {
  if (redis !== undefined) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  redis = url && token ? new Redis({ url, token }) : null;
  return redis;
}

function getLimiter(maxRequests: number, windowMs: number): Ratelimit | null {
  const client = getRedis();
  if (!client) return null;
  const cacheKey = `${maxRequests}:${windowMs}`;
  let limiter = limiterCache.get(cacheKey);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: client,
      limiter: Ratelimit.slidingWindow(maxRequests, `${windowMs} ms`),
      prefix: 'mp_rl',
      analytics: false,
    });
    limiterCache.set(cacheKey, limiter);
  }
  return limiter;
}

/**
 * Distributed-aware rate limit check. Uses Upstash Redis when configured and
 * falls back to the in-memory limiter otherwise.
 */
export async function checkRateLimit(
  key: string,
  maxRequests: number = 60,
  windowMs: number = 60_000
): Promise<RateLimitResult> {
  const limiter = getLimiter(maxRequests, windowMs);
  if (!limiter) {
    return rateLimit(key, maxRequests, windowMs);
  }
  try {
    const { success, remaining, reset } = await limiter.limit(key);
    return { allowed: success, remaining, resetAt: reset };
  } catch {
    // If Redis is unreachable, fail open to the in-memory limiter rather than
    // blocking all traffic.
    return rateLimit(key, maxRequests, windowMs);
  }
}

// --- Helpers ----------------------------------------------------------------

/**
 * Extract client identifier from request.
 * Uses X-Forwarded-For header (Vercel) or falls back to a placeholder.
 */
export function getClientId(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
}

/**
 * Standard 429 response with a Retry-After header (seconds).
 */
export function tooManyRequests(resetAt: number): Response {
  const retryAfter = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
  return new Response(
    JSON.stringify({ error: 'Too many requests. Please slow down and try again shortly.' }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter),
      },
    }
  );
}

/**
 * Convenience guard for route handlers. Returns a 429 Response when the limit
 * is exceeded, or null when the request may proceed.
 *
 * Example:
 *   const limited = await guardRateLimit(`login:${getClientId(request)}`, 5, 60_000);
 *   if (limited) return limited;
 */
export async function guardRateLimit(
  key: string,
  maxRequests?: number,
  windowMs?: number
): Promise<Response | null> {
  const result = await checkRateLimit(key, maxRequests, windowMs);
  return result.allowed ? null : tooManyRequests(result.resetAt);
}

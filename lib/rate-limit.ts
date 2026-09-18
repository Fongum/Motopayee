/**
 * Rate limiting for MotoPayee.
 *
 * Two layers:
 *   - A durable, distributed limiter backed by Upstash Redis. Node.js runtime
 *     only — see lib/rate-limit-edge.ts for why. Every API route (this app's
 *     App Router routes default to the Node.js runtime) can use it freely.
 *   - An in-memory fallback used when Upstash is not configured. The in-memory
 *     store is per-instance, so it only provides best-effort protection — set
 *     UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN in production.
 *
 * middleware.ts runs on the Edge Runtime and must import getClientId/
 * rateLimit/tooManyRequests from lib/rate-limit-edge.ts directly, never from
 * this file — see that file's header comment.
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { rateLimit, getClientId, tooManyRequests } from './rate-limit-edge';
import type { RateLimitResult } from './rate-limit-edge';

export { rateLimit, getClientId, tooManyRequests };
export type { RateLimitResult };

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

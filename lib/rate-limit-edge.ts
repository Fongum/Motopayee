/**
 * Edge-safe primitives for rate limiting.
 *
 * Split out of lib/rate-limit.ts because that file has a static top-level
 * import of @upstash/redis, whose default export resolves to a Node.js-only
 * build (its package.json exports map has no `edge-light` condition — only
 * Node/Cloudflare/Fastly-specific subpaths). middleware.ts must run on
 * Vercel's Edge Runtime in Next.js 14 (there is no Node.js option for
 * Middleware yet), and a bundler pulls in every static import of a module
 * once any export from it is used — so importing anything from
 * lib/rate-limit.ts, even a function that never touches Upstash, dragged the
 * Node-only Redis client into the Edge Function bundle. Vercel's edge
 * bundler rejected the whole function at build time as a result.
 *
 * middleware.ts must only ever import from this file. lib/rate-limit.ts
 * re-exports everything here for the ~20 API routes (Node.js runtime, no
 * Edge constraint) that already import from it.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Periodic cleanup of expired entries. Guarded so it never runs at module
// scope in the edge runtime (where long-lived timers are discouraged).
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
 * Synchronous in-memory rate limit check. Per-instance only — on Vercel Edge
 * each region gets its own counter, which is an accepted tradeoff for the
 * global backstop in middleware.ts. Routes that need a distributed limit use
 * {@link checkRateLimit} / {@link guardRateLimit} from lib/rate-limit.ts
 * instead.
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

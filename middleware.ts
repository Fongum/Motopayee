import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { rateLimit, getClientId, tooManyRequests } from '@/lib/rate-limit-edge';

/**
 * Global safety-net rate limiter for the API.
 *
 * Throttles all state-changing requests (POST/PUT/PATCH/DELETE) under /api by
 * client IP. Individual sensitive routes (e.g. auth) apply their own stricter
 * limits on top of this. Read requests (GET/HEAD) are not throttled here.
 *
 * Deliberately the in-memory limiter, not the Upstash-backed one in
 * lib/rate-limit.ts — this file runs on Vercel's Edge Runtime, which cannot
 * load that module. See lib/rate-limit-edge.ts's header comment.
 */
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const GLOBAL_MAX_WRITES = 60; // per IP
const WINDOW_MS = 60_000;

export function middleware(request: NextRequest) {
  if (!MUTATING_METHODS.has(request.method)) {
    return NextResponse.next();
  }

  const ip = getClientId(request);
  const result = rateLimit(`api:${ip}`, GLOBAL_MAX_WRITES, WINDOW_MS);
  if (!result.allowed) {
    return tooManyRequests(result.resetAt);
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};

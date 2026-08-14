import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { checkRateLimit, getClientId, tooManyRequests } from '@/lib/rate-limit';

/**
 * Global safety-net rate limiter for the API.
 *
 * Throttles all state-changing requests (POST/PUT/PATCH/DELETE) under /api by
 * client IP. Individual sensitive routes (e.g. auth) apply their own stricter
 * limits on top of this. Read requests (GET/HEAD) are not throttled here.
 */
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const GLOBAL_MAX_WRITES = 60; // per IP
const WINDOW_MS = 60_000;

export async function middleware(request: NextRequest) {
  if (!MUTATING_METHODS.has(request.method)) {
    return NextResponse.next();
  }

  const ip = getClientId(request);
  const result = await checkRateLimit(`api:${ip}`, GLOBAL_MAX_WRITES, WINDOW_MS);
  if (!result.allowed) {
    return tooManyRequests(result.resetAt);
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};

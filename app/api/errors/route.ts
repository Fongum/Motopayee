import { NextResponse } from 'next/server';
import { z } from 'zod';
import { parseBody } from '@/lib/validation';
import { reportError } from '@/lib/error-reporting';
import { getCurrentUser } from '@/lib/auth/server';

/**
 * Client-side crash reports from the error boundaries.
 *
 * A React render failure in the browser leaves no trace on the server, so
 * without this the only errors MotoPayee ever sees are the ones that happen
 * server-side. Anonymous by design — a visitor who is not signed in is exactly
 * who you most want to hear about — and covered by the global write throttle
 * in middleware.ts.
 */
const schema = z.object({
  message: z.string().trim().min(1).max(500),
  digest: z.string().trim().max(120).optional(),
  route: z.string().trim().max(300).optional(),
  stack: z.string().trim().max(4000).optional(),
});

export async function POST(request: Request) {
  const parsed = await parseBody(schema, request, 'Invalid error report.');
  if (!parsed.success) return parsed.response;

  const user = await getCurrentUser().catch(() => null);

  const eventId = reportError(parsed.data.message, {
    source: 'client',
    route: parsed.data.route,
    digest: parsed.data.digest,
    stack: parsed.data.stack,
    userId: user?.id,
  });

  return NextResponse.json({ eventId });
}

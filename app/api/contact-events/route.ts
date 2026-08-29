import { NextResponse } from 'next/server';
import { getCurrentUser, supabaseAdmin } from '@/lib/auth/server';
import { contactEventRow, contactEventSchema } from '@/lib/contact-events';
import { parseBody } from '@/lib/validation';
import { dayKey } from '@/lib/daily-series';
import { logFailure } from '@/lib/logger';

/**
 * Records buyer/renter contact intent. Called client-side (sendBeacon) right
 * before a wa.me / tel: handoff, so it is anonymous-friendly and must never
 * block the navigation — failures are logged, not surfaced.
 *
 * Global write throttling comes from middleware.ts (60/min/IP).
 */
export async function POST(request: Request) {
  const parsed = await parseBody(contactEventSchema, request, 'Invalid contact event.');
  if (!parsed.success) return parsed.response;

  const user = await getCurrentUser().catch(() => null);
  const { error } = await supabaseAdmin
    .from('contact_events')
    .insert(contactEventRow(parsed.data, user?.id ?? null, dayKey(new Date())));

  if (error) {
    logFailure('contact_event.insert_failed', {
      surface: parsed.data.surface,
      channel: parsed.data.channel,
      error,
    });
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

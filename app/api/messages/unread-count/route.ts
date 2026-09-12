import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { fetchUnreadCounts } from '@/lib/unread-messages.server';

// GET /api/messages/unread-count — total unread messages for navbar badge
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) return NextResponse.json({ count: 0 });

  // One call: the membership test lives in the SQL, so there is no round trip
  // to resolve conversation ids and no `.in(...)` list to cap.
  const counts = await fetchUnreadCounts(auth.user.id);

  return NextResponse.json({ count: counts.total });
}

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/auth/server';
import { requireAuth } from '@/lib/auth/middleware';

// GET /api/messages/unread-count — total unread messages for navbar badge
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) return NextResponse.json({ count: 0 });

  const { data: convs } = await supabaseAdmin
    .from('conversations')
    .select('id')
    .or(`participant_a.eq.${auth.user.id},participant_b.eq.${auth.user.id}`);

  if (!convs || convs.length === 0) return NextResponse.json({ count: 0 });

  const convIds = convs.map((c: Record<string, unknown>) => c.id as string);

  const { count } = await supabaseAdmin
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .in('conversation_id', convIds)
    .neq('sender_id', auth.user.id)
    .is('read_at', null);

  return NextResponse.json({ count: count ?? 0 });
}

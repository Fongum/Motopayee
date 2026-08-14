import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/auth/server';
import { requireAuth } from '@/lib/auth/middleware';
import { rateLimit } from '@/lib/rate-limit';
import { parseBody } from '@/lib/validation';

const messageSchema = z.object({
  body: z.string().trim().min(1, 'Message vide.').max(5000),
});

// GET /api/conversations/[id]/messages — get messages for a conversation
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) return NextResponse.json({ error: auth.error }, { status: auth.status });

  // Verify user is a participant
  const { data: conv } = await supabaseAdmin
    .from('conversations')
    .select('participant_a, participant_b')
    .eq('id', params.id)
    .single();

  if (!conv || (conv.participant_a !== auth.user.id && conv.participant_b !== auth.user.id)) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }

  // Pagination
  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '50')));
  const offset = (page - 1) * limit;

  // Fetch messages
  const { data, error } = await supabaseAdmin
    .from('messages')
    .select('*, sender:profiles!sender_id(full_name)')
    .eq('conversation_id', params.id)
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Mark unread messages as read
  await supabaseAdmin
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('conversation_id', params.id)
    .neq('sender_id', auth.user.id)
    .is('read_at', null);

  return NextResponse.json(data);
}

// POST /api/conversations/[id]/messages — send a message
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) return NextResponse.json({ error: auth.error }, { status: auth.status });

  // Rate limit: 30 messages per minute per user
  const rl = rateLimit(`msg:${auth.user.id}`, 30, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: 'Trop de messages. Réessayez dans un instant.' }, { status: 429 });

  const parsed = await parseBody(messageSchema, request, 'Message invalide.');
  if (!parsed.success) return parsed.response;

  // Verify participation
  const { data: conv } = await supabaseAdmin
    .from('conversations')
    .select('participant_a, participant_b')
    .eq('id', params.id)
    .single();

  if (!conv || (conv.participant_a !== auth.user.id && conv.participant_b !== auth.user.id)) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }

  // Insert message
  const { data, error } = await supabaseAdmin
    .from('messages')
    .insert({
      conversation_id: params.id,
      sender_id: auth.user.id,
      body: parsed.data.body,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update conversation last_message_at
  await supabaseAdmin
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', params.id);

  return NextResponse.json(data, { status: 201 });
}

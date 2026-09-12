import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/auth/server';
import { requireAuth } from '@/lib/auth/middleware';
import { rateLimit } from '@/lib/rate-limit';
import { parseBody } from '@/lib/validation';
import { reportError } from '@/lib/error-reporting';
import { fetchUnreadCounts } from '@/lib/unread-messages.server';
import { unreadFor } from '@/lib/unread-messages';

// A conversation hangs off at most one listing — a sale listing or a hire one.
const createSchema = z
  .object({
    other_user_id: z.string().uuid(),
    listing_id: z.string().uuid().optional(),
    hire_listing_id: z.string().uuid().optional(),
  })
  .refine((v) => !(v.listing_id && v.hire_listing_id), {
    message: 'Indiquez une annonce de vente ou de location, pas les deux.',
    path: ['hire_listing_id'],
  });

// GET /api/conversations — list user's conversations with last message
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const userId = auth.user.id;

  // Fetch conversations where user is either participant
  const { data, error } = await supabaseAdmin
    .from('conversations')
    .select(`
      *,
      participant_a_profile:profiles!participant_a(id, full_name, phone),
      participant_b_profile:profiles!participant_b(id, full_name, phone),
      listing:listings(id, asking_price, vehicle:vehicles(make, model, year)),
      hire_listing:hire_listings(id, make, model, year)
    `)
    .or(`participant_a.eq.${userId},participant_b.eq.${userId}`)
    .order('last_message_at', { ascending: false });

  if (error) {
    // The raw Postgres message used to be echoed to the caller, which leaks
    // schema detail from a route any signed-in user can reach.
    reportError(error, { source: 'api/conversations', route: '/api/conversations', userId });
    return NextResponse.json({ error: 'Failed to load conversations.' }, { status: 500 });
  }

  // Counted in Postgres (migration 042). This used to fetch every unread row
  // and tally the array, which truncates at db-max-rows on a busy inbox.
  const unread = await fetchUnreadCounts(userId);

  const conversations = (data ?? []).map((c: Record<string, unknown>) => ({
    ...c,
    unread_count: unreadFor(unread, c.id as string),
    other_user: (c.participant_a as string) === userId ? c.participant_b_profile : c.participant_a_profile,
  }));

  return NextResponse.json(conversations);
}

// POST /api/conversations — create or get existing conversation
export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const parsed = await parseBody(createSchema, request, 'Conversation invalide.');
  if (!parsed.success) return parsed.response;

  const { other_user_id, listing_id, hire_listing_id } = parsed.data;

  // Rate limit: 20 conversation creations per minute
  const rl = rateLimit(`conv:${auth.user.id}`, 20, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: 'Trop de requêtes.' }, { status: 429 });
  if (other_user_id === auth.user.id) return NextResponse.json({ error: 'Cannot message yourself.' }, { status: 400 });

  // Normalize order for uniqueness
  const [a, b] = [auth.user.id, other_user_id].sort();

  // Check for existing conversation
  let query = supabaseAdmin
    .from('conversations')
    .select('*')
    .eq('participant_a', a)
    .eq('participant_b', b);

  if (listing_id) query = query.eq('listing_id', listing_id);
  else if (hire_listing_id) query = query.eq('hire_listing_id', hire_listing_id);

  const { data: existing } = await query.maybeSingle();
  if (existing) return NextResponse.json(existing);

  // Create new
  const { data, error } = await supabaseAdmin
    .from('conversations')
    .insert({
      participant_a: a,
      participant_b: b,
      listing_id: listing_id ?? null,
      hire_listing_id: hire_listing_id ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

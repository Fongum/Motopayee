import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/auth/server';
import { requireAuth } from '@/lib/auth/middleware';
import { parseBody } from '@/lib/validation';

// Mirrors the browsing_history_entity_type_check constraint (migration 013).
const trackSchema = z.object({
  entity_type: z.enum(['listing', 'hire_listing']),
  entity_id: z.string().uuid(),
});

// POST /api/browsing-history — track a view
export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const parsed = await parseBody(trackSchema, request, 'Consultation invalide.');
  if (!parsed.success) return parsed.response;

  const { entity_type, entity_id } = parsed.data;

  // Insert — ignore if duplicate for today (unique index on date)
  await supabaseAdmin
    .from('browsing_history')
    .insert({ user_id: auth.user.id, entity_type, entity_id, viewed_at: new Date().toISOString() });

  return NextResponse.json({ success: true });
}

// GET /api/browsing-history — user's recent browsing
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data } = await supabaseAdmin
    .from('browsing_history')
    .select('*')
    .eq('user_id', auth.user.id)
    .order('viewed_at', { ascending: false })
    .limit(50);

  return NextResponse.json(data ?? []);
}

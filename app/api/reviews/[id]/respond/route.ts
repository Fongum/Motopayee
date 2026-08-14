import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/auth/server';
import { requireAuth } from '@/lib/auth/middleware';
import { parseBody } from '@/lib/validation';

const respondSchema = z.object({
  comment: z.string().trim().min(1, 'Réponse vide.').max(2000),
});

// POST /api/reviews/[id]/respond — seller/owner replies to a review
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const parsed = await parseBody(respondSchema, request, 'Réponse invalide.');
  if (!parsed.success) return parsed.response;

  // Verify the review exists and the user is the reviewed party
  const { data: review } = await supabaseAdmin
    .from('reviews')
    .select('reviewed_id')
    .eq('id', params.id)
    .single();

  if (!review) {
    return NextResponse.json({ error: 'Avis non trouvé.' }, { status: 404 });
  }
  if (review.reviewed_id !== auth.user.id) {
    return NextResponse.json({ error: 'Seul le vendeur/propriétaire peut répondre.' }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from('review_responses')
    .insert({
      review_id: params.id,
      responder_id: auth.user.id,
      comment: parsed.data.comment,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Vous avez déjà répondu à cet avis.' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireBuyer } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';
import { parseBody } from '@/lib/validation';

const toggleSchema = z.object({ listing_id: z.string().uuid() });

export async function POST(request: Request) {
  const auth = await requireBuyer(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const parsed = await parseBody(toggleSchema, request, 'Annonce invalide.');
  if (!parsed.success) return parsed.response;

  const { listing_id } = parsed.data;

  // Check if already saved
  const { data: existing } = await supabaseAdmin
    .from('favourites')
    .select('id')
    .eq('user_id', auth.user.id)
    .eq('listing_id', listing_id)
    .maybeSingle();

  if (existing) {
    await supabaseAdmin.from('favourites').delete().eq('id', existing.id);
    return NextResponse.json({ saved: false });
  }

  await supabaseAdmin.from('favourites').insert({
    user_id: auth.user.id,
    listing_id,
  });
  return NextResponse.json({ saved: true });
}

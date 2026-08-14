import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/auth/server';
import { requireAuth } from '@/lib/auth/middleware';
import { parseBody, amountXaf } from '@/lib/validation';

// Both fields are optional, but sending neither is a no-op update — rejected so
// the caller gets a clear 400 instead of a silent success.
const patchSchema = z
  .object({
    threshold_price: amountXaf.optional(),
    active: z.boolean().optional(),
  })
  .refine((v) => v.threshold_price !== undefined || v.active !== undefined, {
    message: 'Indiquez threshold_price ou active.',
  });

// PATCH /api/price-alerts/[id]
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const parsed = await parseBody(patchSchema, request, 'Mise à jour invalide.');
  if (!parsed.success) return parsed.response;

  const updates: Record<string, unknown> = {};
  if (parsed.data.threshold_price !== undefined) updates.threshold_price = parsed.data.threshold_price;
  if (parsed.data.active !== undefined) updates.active = parsed.data.active;

  const { data, error } = await supabaseAdmin
    .from('price_alerts')
    .update(updates)
    .eq('id', params.id)
    .eq('user_id', auth.user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  return NextResponse.json(data);
}

// DELETE /api/price-alerts/[id]
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { error } = await supabaseAdmin
    .from('price_alerts')
    .delete()
    .eq('id', params.id)
    .eq('user_id', auth.user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

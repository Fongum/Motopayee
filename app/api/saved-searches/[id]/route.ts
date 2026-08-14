import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/auth/server';
import { requireAuth } from '@/lib/auth/middleware';
import { parseBody } from '@/lib/validation';

// Same field rules as the create route; every field optional for a partial
// update, but at least one must be present.
const patchSchema = z
  .object({
    label: z.string().trim().min(1).max(120).optional(),
    filters: z
      .record(
        z.string().max(60),
        z.union([z.string().max(200), z.number(), z.boolean(), z.null()])
      )
      .optional(),
    notify_via: z.enum(['sms', 'whatsapp', 'none']).optional(),
    active: z.boolean().optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: 'Aucun champ à mettre à jour.',
  });

// PATCH /api/saved-searches/[id]
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const parsed = await parseBody(patchSchema, request, 'Mise à jour invalide.');
  if (!parsed.success) return parsed.response;

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.data.label !== undefined) updates.label = parsed.data.label;
  if (parsed.data.filters !== undefined) updates.filters = parsed.data.filters;
  if (parsed.data.notify_via !== undefined) updates.notify_via = parsed.data.notify_via;
  if (parsed.data.active !== undefined) updates.active = parsed.data.active;

  const { data, error } = await supabaseAdmin
    .from('saved_searches')
    .update(updates)
    .eq('id', params.id)
    .eq('user_id', auth.user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  return NextResponse.json(data);
}

// DELETE /api/saved-searches/[id]
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { error } = await supabaseAdmin
    .from('saved_searches')
    .delete()
    .eq('id', params.id)
    .eq('user_id', auth.user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

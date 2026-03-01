import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';
import { z } from 'zod';

interface RouteParams { params: { id: string } }

const patchSchema = z.object({
  financeable: z.boolean().optional(),
  down_payment_percent: z.number().min(0).max(100).optional(),
  max_tenor_months: z.number().int().min(1).max(120).optional(),
  manual_review_required: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireAdmin(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('zone_rules')
    .update(parsed.data)
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to update rule.' }, { status: 500 });
  }

  return NextResponse.json({ rule: data });
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const auth = await requireAdmin(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { error } = await supabaseAdmin
    .from('zone_rules')
    .delete()
    .eq('id', params.id);

  if (error) {
    return NextResponse.json({ error: 'Failed to delete rule.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

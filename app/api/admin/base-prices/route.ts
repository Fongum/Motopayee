import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';
import { reportError } from '@/lib/error-reporting';
import { optionalText } from '@/lib/validation';
import { recomputeEstimatesForMake } from '@/lib/pricing.server';

const schema = z.discriminatedUnion('intent', [
  z.object({
    intent: z.literal('save'),
    id: z.string().uuid().optional().or(z.literal('').transform(() => undefined)),
    // Inner spaces collapsed on the way in: the unique index compares
    // lower(btrim()), and the lookup also collapses runs of spaces, so storing
    // "Land  Cruiser" would let two rows the lookup treats as one coexist.
    make: z.string().trim().min(1).max(60).transform((v) => v.replace(/\s+/g, ' ')),
    // Empty means a make-wide price: the fallback for every model of the make.
    model: optionalText(80).transform((v) => v?.replace(/\s+/g, ' ')),
    base_price_xaf: z.coerce.number().int().positive().max(1_000_000_000),
    notes: optionalText(500),
  }),
  z.object({ intent: z.literal('delete'), id: z.string().uuid() }),
]);

async function readForm(request: Request): Promise<Record<string, string>> {
  const body: Record<string, string> = {};
  new URLSearchParams(await request.text()).forEach((value, key) => { body[key] = value; });
  return body;
}

/**
 * POST /api/admin/base-prices — maintain vehicle_base_prices (admin only).
 *
 * Every change re-estimates the listings of the makes it touches, so a price
 * entered today corrects the vehicles already priced off the default, not
 * only those inspected from now on.
 */
export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const back = (params: Record<string, string | number>) => {
    const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
    return NextResponse.redirect(new URL(`/admin/pricing?${qs}`, request.url), 303);
  };

  const parsed = schema.safeParse(await readForm(request));
  if (!parsed.success) return back({ notice: 'invalid' });
  const input = parsed.data;

  const audit = (entityId: string, action: string, meta: Record<string, string | number | null>) =>
    supabaseAdmin.from('audit_logs').insert({
      actor_id: auth.user.id,
      actor_email: auth.user.email,
      actor_role: auth.user.role,
      action,
      entity_type: 'vehicle_base_prices',
      entity_id: entityId,
      meta,
    });

  if (input.intent === 'delete') {
    const { data: removed, error } = await supabaseAdmin
      .from('vehicle_base_prices')
      .delete()
      .eq('id', input.id)
      .select('id, make, model, base_price_xaf')
      .maybeSingle();
    if (error) {
      reportError(error, { source: 'api/admin/base-prices', route: '/api/admin/base-prices' });
      return back({ notice: 'error' });
    }
    if (!removed) return back({ notice: 'not_found' });
    await audit(removed.id, 'vehicle_base_price_deleted', { make: removed.make, model: removed.model, base_price_xaf: removed.base_price_xaf });
    const updated = await recomputeEstimatesForMake(removed.make);
    return back({ notice: 'deleted', updated });
  }

  // An edit can rename the make; the listings of the old make lose this price
  // and need re-estimating as much as those of the new one.
  const { data: previous } = input.id
    ? await supabaseAdmin.from('vehicle_base_prices').select('make, base_price_xaf').eq('id', input.id).maybeSingle()
    : { data: null };
  if (input.id && !previous) return back({ notice: 'not_found' });

  const values = {
    make: input.make,
    model: input.model ?? null,
    base_price_xaf: input.base_price_xaf,
    notes: input.notes ?? null,
    updated_by: auth.user.id,
    updated_at: new Date().toISOString(),
  };
  const { data: saved, error } = input.id
    ? await supabaseAdmin.from('vehicle_base_prices').update(values).eq('id', input.id).select('id').single()
    : await supabaseAdmin.from('vehicle_base_prices').insert(values).select('id').single();

  if (error || !saved) {
    // 23505: the unique index on (make, model) — that vehicle already has a row.
    if (error?.code === '23505') return back({ notice: 'duplicate' });
    reportError(error, { source: 'api/admin/base-prices', route: '/api/admin/base-prices' });
    return back({ notice: 'error' });
  }

  await audit(saved.id, input.id ? 'vehicle_base_price_updated' : 'vehicle_base_price_created', {
    make: values.make,
    model: values.model,
    base_price_xaf: values.base_price_xaf,
    previous_base_price_xaf: previous?.base_price_xaf ?? null,
  });

  let updated = await recomputeEstimatesForMake(values.make);
  if (previous && previous.make.trim().toLowerCase() !== values.make.trim().toLowerCase()) {
    updated += await recomputeEstimatesForMake(previous.make);
  }
  return back({ notice: 'saved', updated });
}

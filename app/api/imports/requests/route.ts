import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireBuyer } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';

const createSchema = z.object({
  mode: z.enum(['offer', 'custom']).default('custom'),
  offer_id: z.string().uuid().optional().nullable(),
  source_country: z.string().trim().min(2).max(50).default('US'),
  make: z.string().trim().min(2).max(50),
  model: z.string().trim().max(50).optional().nullable(),
  year_min: z.number().int().min(1960).max(new Date().getFullYear() + 1).optional().nullable(),
  year_max: z.number().int().min(1960).max(new Date().getFullYear() + 1).optional().nullable(),
  budget_max_xaf: z.number().positive(),
  body_type: z.enum(['sedan', 'suv', 'pickup', 'hatchback', 'van', 'coupe', 'wagon', 'other']).optional().nullable(),
  fuel_type: z.enum(['petrol', 'diesel', 'electric', 'hybrid', 'other']).optional().nullable(),
  transmission: z.enum(['manual', 'automatic', 'other']).optional().nullable(),
  color_preferences: z.string().trim().max(120).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.year_min && data.year_max && data.year_min > data.year_max) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'year_min must be less than or equal to year_max.',
      path: ['year_min'],
    });
  }
});

export async function POST(request: Request) {
  const auth = await requireBuyer(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid import request data.' }, { status: 400 });
  }

  const payload = {
    offer_id: parsed.data.offer_id ?? null,
    buyer_id: auth.user.id,
    mode: parsed.data.offer_id ? 'offer' : parsed.data.mode,
    source_country: parsed.data.source_country,
    make: parsed.data.make,
    model: parsed.data.model || null,
    year_min: parsed.data.year_min ?? null,
    year_max: parsed.data.year_max ?? null,
    budget_max_xaf: parsed.data.budget_max_xaf,
    body_type: parsed.data.body_type ?? null,
    fuel_type: parsed.data.fuel_type ?? null,
    transmission: parsed.data.transmission ?? null,
    color_preferences: parsed.data.color_preferences || null,
    notes: parsed.data.notes || null,
    status: 'submitted',
  };

  if (parsed.data.offer_id) {
    const { data: offer } = await supabaseAdmin
      .from('import_offers')
      .select('id, source_country, make, model, status')
      .eq('id', parsed.data.offer_id)
      .eq('status', 'active')
      .maybeSingle();

    if (!offer) {
      return NextResponse.json({ error: 'Selected import offer is no longer available.' }, { status: 400 });
    }

    payload.source_country = offer.source_country;
  }

  const { data, error } = await supabaseAdmin
    .from('import_requests')
    .insert(payload)
    .select('*')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to create import request.' }, { status: 500 });
  }

  await supabaseAdmin.from('audit_logs').insert({
    actor_id: auth.user.id,
    actor_email: auth.user.email,
    actor_role: auth.user.role,
    action: 'import_request_created',
    entity_type: 'import_requests',
    entity_id: data.id,
    meta: {
      offer_id: data.offer_id,
      source_country: data.source_country,
      make: data.make,
      model: data.model,
      budget_max_xaf: data.budget_max_xaf,
    },
  });

  return NextResponse.json({ request: data }, { status: 201 });
}

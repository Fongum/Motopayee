import { NextResponse } from 'next/server';
import { requireAdmin, requireStaff } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';
import { z } from 'zod';

export async function GET(request: Request) {
  const auth = await requireStaff(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data, error } = await supabaseAdmin
    .from('zone_rules')
    .select('*')
    .order('zone')
    .order('income_grade')
    .order('vehicle_price_band')
    .order('condition_grade');

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch rules.' }, { status: 500 });
  }

  return NextResponse.json({ rules: data ?? [] });
}

const createSchema = z.object({
  zone: z.enum(['A', 'B', 'C']),
  income_grade: z.enum(['A', 'B', 'C', 'D']),
  vehicle_price_band: z.enum(['green', 'yellow', 'red']),
  condition_grade: z.enum(['A', 'B', 'C', 'D']),
  financeable: z.boolean(),
  down_payment_percent: z.number().min(0).max(100),
  max_tenor_months: z.number().int().min(1).max(120),
  manual_review_required: z.boolean(),
});

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid rule data.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('zone_rules')
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ rule: data }, { status: 201 });
}

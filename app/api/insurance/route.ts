import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/auth/server';
import { requireAuth } from '@/lib/auth/middleware';
import { rateLimit } from '@/lib/rate-limit';
import { parseBody, amountXaf } from '@/lib/validation';

// product_type mirrors the insurance_quotes check constraint (migration 013).
// vehicle_value_xaf drives the premium calculation, so it must be a sane
// positive amount rather than whatever the client sends.
const quoteSchema = z.object({
  partner_id: z.string().uuid(),
  product_type: z.enum(['comprehensive', 'third_party', 'hire_coverage']),
  vehicle_value_xaf: amountXaf.optional(),
  listing_id: z.string().uuid().optional(),
  hire_listing_id: z.string().uuid().optional(),
});

// GET /api/insurance — list active insurance partners
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('insurance_partners')
    .select('*')
    .eq('active', true)
    .order('name');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST /api/insurance — request a quote
export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const parsed = await parseBody(quoteSchema, request, 'Demande de devis invalide.');
  if (!parsed.success) return parsed.response;

  const { partner_id, product_type, vehicle_value_xaf, listing_id, hire_listing_id } = parsed.data;

  // Rate limit: 10 quotes per minute
  const rl = rateLimit(`ins:${auth.user.id}`, 10, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: 'Trop de demandes. Réessayez dans un instant.' }, { status: 429 });

  // Get partner to check it exists and is active
  const { data: partner } = await supabaseAdmin
    .from('insurance_partners')
    .select('*')
    .eq('id', partner_id)
    .eq('active', true)
    .maybeSingle();

  if (!partner) return NextResponse.json({ error: 'Partenaire non trouvé.' }, { status: 404 });

  // Estimate premium (simple formula: 3-5% of vehicle value depending on product)
  const rates: Record<string, number> = {
    third_party: 0.03,
    comprehensive: 0.05,
    hire_coverage: 0.04,
  };
  const rate = rates[product_type];
  const vehicleValue = vehicle_value_xaf ?? 5000000;
  const annualPremium = Math.round(vehicleValue * rate);

  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 30);

  const { data: quote, error } = await supabaseAdmin
    .from('insurance_quotes')
    .insert({
      partner_id,
      user_id: auth.user.id,
      product_type,
      vehicle_value_xaf: vehicleValue,
      annual_premium_xaf: annualPremium,
      monthly_premium_xaf: Math.round(annualPremium / 12),
      listing_id: listing_id ?? null,
      hire_listing_id: hire_listing_id ?? null,
      status: 'quoted',
      valid_until: validUntil.toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(quote, { status: 201 });
}

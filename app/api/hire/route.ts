import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/auth/server';
import { requireAuth, requireSeller } from '@/lib/auth/middleware';
import { parseBody } from '@/lib/validation';
import { reportError } from '@/lib/error-reporting';
import { HIRE_CARD_SELECT, applyHireSearch, hireRange, parseHireSearch } from '@/lib/hire-query';
import type { HireQuery, RawHireParams } from '@/lib/hire-query';
import { createHireListingSchema } from '@/lib/hire-schemas';
import { recordLeadActivity } from '@/lib/launch-lead-activities';
import type { HireListing } from '@/lib/types';

// GET /api/hire — Browse published hire listings (public)
export async function GET(request: NextRequest) {
  const raw: RawHireParams = Object.fromEntries(request.nextUrl.searchParams.entries());
  const params = parseHireSearch(raw);
  const [from, to] = hireRange(params.page);

  const query = supabaseAdmin
    .from('hire_listings')
    .select(HIRE_CARD_SELECT, { count: 'exact' })
    .eq('status', 'published');

  // Shared with the /hire page so the two cannot drift apart again.
  const shaped = applyHireSearch(query as unknown as HireQuery, params) as unknown as typeof query;
  const { data, count, error } = await shaped.range(from, to);

  if (error) {
    // The raw Postgres message used to be echoed to the caller, which leaks
    // schema detail on a public, unauthenticated endpoint.
    reportError(error, { source: 'api/hire', route: '/api/hire' });
    return NextResponse.json({ error: 'Failed to fetch hire listings.' }, { status: 500 });
  }

  return NextResponse.json({ listings: (data ?? []) as unknown as HireListing[], total: count ?? 0 });
}

// POST /api/hire — Create a hire listing (sellers only)
export async function POST(request: NextRequest) {
  const auth = await requireSeller(request);
  if (!auth.authenticated) {
    // Also allow buyers to list for hire
    const authAny = await requireAuth(request);
    if (!authAny.authenticated) {
      return NextResponse.json({ error: authAny.error }, { status: authAny.status });
    }
    // Any authenticated user can create a hire listing
    return createHireListing(authAny.user.id, request);
  }

  return createHireListing(auth.user.id, request);
}

async function createHireListing(ownerId: string, request: NextRequest) {
  const parsed = await parseBody(createHireListingSchema, request, 'Annonce de location invalide.');
  if (!parsed.success) return parsed.response;
  const { launch_lead_id, ...hireListingData } = parsed.data;

  // The schema supplies every default, so the payload can be written straight
  // through — null-coalescing per field is no longer needed.
  const { data, error } = await supabaseAdmin
    .from('hire_listings')
    .insert({
      ...hireListingData,
      owner_id: ownerId,
      status: 'pending_review',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (launch_lead_id) {
    const { data: convertedLead } = await supabaseAdmin
      .from('launch_leads')
      .update({
        status: 'converted',
        converted_entity_type: 'hire_listing',
        converted_entity_id: data.id,
        next_follow_up_at: null,
      })
      .eq('id', launch_lead_id)
      .eq('lead_type', 'rental_owner')
      .neq('status', 'converted')
      .select('id')
      .maybeSingle();

    if (convertedLead) {
      await recordLeadActivity({
        leadId: launch_lead_id,
        actorId: ownerId,
        action: 'converted',
        summary: 'Lead converted into rental listing',
        meta: { hire_listing_id: data.id },
      });
    }
  }

  return NextResponse.json(data, { status: 201 });
}

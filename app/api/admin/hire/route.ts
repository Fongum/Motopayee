import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/auth/server';
import { requireAdmin, requireStaff } from '@/lib/auth/middleware';
import { recordLeadActivity } from '@/lib/launch-lead-activities';
import type { HireListing } from '@/lib/types';
import { z } from 'zod';

// GET /api/admin/hire — List all hire listings (admin)
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = request.nextUrl;
  const status = searchParams.get('status');

  let q = supabaseAdmin
    .from('hire_listings')
    .select('*, owner:profiles!owner_id(full_name, email, phone, is_verified), media:hire_listing_media(id, storage_path, bucket, display_order)', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (status) q = q.eq('status', status);

  const { data, count, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ listings: data as unknown as HireListing[], total: count ?? 0 });
}

const createSchema = z.object({
  owner_id: z.string().uuid(),
  make: z.string().trim().min(1),
  model: z.string().trim().min(1),
  year: z.coerce.number().int().min(1970).max(new Date().getFullYear() + 1),
  fuel_type: z.enum(['petrol', 'diesel', 'electric', 'hybrid', 'other']).default('petrol'),
  transmission: z.enum(['manual', 'automatic', 'other']).default('automatic'),
  color: z.string().trim().optional().or(z.literal('')),
  seats: z.coerce.number().int().min(1).max(60).default(5),
  plate_number: z.string().trim().optional().or(z.literal('')),
  hire_type: z.enum(['self_drive', 'with_driver', 'both']).default('self_drive'),
  daily_rate: z.coerce.number().int().min(0),
  deposit_amount: z.coerce.number().int().min(0).default(0),
  driver_daily_rate: z.coerce.number().int().min(0).optional().or(z.literal('')),
  min_hire_days: z.coerce.number().int().min(1).default(1),
  max_hire_days: z.coerce.number().int().min(1).optional().or(z.literal('')),
  city: z.string().trim().min(1),
  zone: z.enum(['A', 'B', 'C']).default('A'),
  description: z.string().trim().optional().or(z.literal('')),
  conditions: z.string().trim().optional().or(z.literal('')),
  launch_lead_id: z.string().uuid().optional().or(z.literal('')),
});

async function parseAdminHireBody(request: Request) {
  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) return request.json().catch(() => ({}));
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const text = await request.text();
    const body: Record<string, unknown> = {};
    const form = new URLSearchParams(text);
    form.forEach((value, key) => { body[key] = value; });
    return body;
  }
  return {};
}

export async function POST(request: NextRequest) {
  const auth = await requireStaff(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const parsed = createSchema.safeParse(await parseAdminHireBody(request));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid hire listing.' }, { status: 400 });
  }

  const { launch_lead_id, owner_id, ...payload } = parsed.data;
  const { data: owner } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('id', owner_id)
    .single();

  if (!owner) {
    return NextResponse.json({ error: 'Owner profile is required.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('hire_listings')
    .insert({
      ...payload,
      owner_id,
      color: payload.color || null,
      plate_number: payload.plate_number || null,
      driver_daily_rate: payload.driver_daily_rate || null,
      max_hire_days: payload.max_hire_days || null,
      description: payload.description || null,
      conditions: payload.conditions || null,
      features: [],
      insurance_included: false,
      status: 'pending_review',
    })
    .select('id')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to create hire listing.' }, { status: 500 });
  }

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
        actorId: auth.user.id,
        action: 'converted',
        summary: 'Lead converted into staff-created rental listing',
        meta: { hire_listing_id: data.id, owner_id },
      });
    }
  }

  await supabaseAdmin.from('audit_logs').insert({
    actor_id: auth.user.id,
    actor_email: auth.user.email,
    actor_role: auth.user.role,
    action: 'admin_hire_listing_created',
    entity_type: 'hire_listings',
    entity_id: data.id,
    meta: { owner_id, launch_lead_id: launch_lead_id || null },
  });

  if (request.headers.get('accept')?.includes('text/html')) {
    return NextResponse.redirect(new URL('/admin/hire', request.url));
  }

  return NextResponse.json({ hire_listing_id: data.id }, { status: 201 });
}

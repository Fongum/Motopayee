import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/auth/server';
import { requireAuth } from '@/lib/auth/middleware';
import { parseBody } from '@/lib/validation';

// search_type / notify_via mirror the check constraints in migration 012.
// `filters` is a free-form JSON blob, so it is capped at a shallow object of
// scalar values to keep unbounded payloads out of the column.
const createSchema = z.object({
  search_type: z.enum(['listing', 'hire']),
  label: z.string().trim().min(1).max(120),
  filters: z.record(
    z.string().max(60),
    z.union([z.string().max(200), z.number(), z.boolean(), z.null()])
  ),
  notify_via: z.enum(['sms', 'whatsapp', 'none']).default('none'),
});

// GET /api/saved-searches
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') ?? '20')));
  const offset = (page - 1) * limit;

  const { data, error } = await supabaseAdmin
    .from('saved_searches')
    .select('*')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/saved-searches
export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const parsed = await parseBody(createSchema, request, 'Recherche enregistrée invalide.');
  if (!parsed.success) return parsed.response;

  const { search_type, label, filters, notify_via } = parsed.data;

  const { data, error } = await supabaseAdmin
    .from('saved_searches')
    .insert({
      user_id: auth.user.id,
      search_type,
      label,
      filters,
      notify_via,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

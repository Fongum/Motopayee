import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/auth/server';
import { requireAuth } from '@/lib/auth/middleware';

// GET /api/saved-searches
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data, error } = await supabaseAdmin
    .from('saved_searches')
    .select('*')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/saved-searches
export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  const { search_type, label, filters, notify_via } = body;

  if (!search_type || !label || !filters) {
    return NextResponse.json({ error: 'search_type, label, and filters are required.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('saved_searches')
    .insert({
      user_id: auth.user.id,
      search_type,
      label,
      filters,
      notify_via: notify_via ?? 'none',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

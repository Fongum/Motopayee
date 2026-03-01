import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';
import { z } from 'zod';

const schema = z.object({
  phone: z.string().min(8).optional(),
  city: z.string().min(1).optional(),
  zone: z.enum(['A', 'B', 'C']).optional(),
});

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const updates: Record<string, string> = {};
  if (parsed.data.phone) updates.phone = parsed.data.phone;
  if (parsed.data.city) updates.city = parsed.data.city;
  if (parsed.data.zone) updates.zone = parsed.data.zone;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields provided.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update(updates)
    .eq('id', auth.user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to update profile.' }, { status: 500 });
  }

  return NextResponse.json({ profile: data });
}

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';
import { z } from 'zod';

const schema = z.object({
  entity_type: z.enum(['listing', 'application']),
  entity_id: z.string().uuid(),
  staff_role: z.enum(['field_agent', 'inspector', 'verifier']),
  staff_id: z.string().uuid(),
});

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const { entity_type, entity_id, staff_role, staff_id } = parsed.data;

  // Verify staff member has the right role
  const { data: staff } = await supabaseAdmin
    .from('profiles')
    .select('id, role')
    .eq('id', staff_id)
    .single();

  if (!staff || staff.role !== staff_role) {
    return NextResponse.json({ error: 'Staff member not found or wrong role.' }, { status: 400 });
  }

  if (entity_type === 'listing') {
    const columnMap: Record<string, string> = {
      field_agent: 'field_agent_id',
      inspector: 'inspector_id',
      verifier: 'verifier_id',
    };
    const col = columnMap[staff_role];

    const { error } = await supabaseAdmin
      .from('listings')
      .update({ [col]: staff_id })
      .eq('id', entity_id);

    if (error) {
      return NextResponse.json({ error: 'Failed to assign.' }, { status: 500 });
    }
  } else {
    if (staff_role !== 'verifier') {
      return NextResponse.json({ error: 'Only verifiers can be assigned to applications.' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('financing_applications')
      .update({ verifier_id: staff_id })
      .eq('id', entity_id);

    if (error) {
      return NextResponse.json({ error: 'Failed to assign.' }, { status: 500 });
    }
  }

  await supabaseAdmin.from('audit_logs').insert({
    actor_id: auth.user.id,
    actor_email: auth.user.email,
    actor_role: auth.user.role,
    action: 'staff_assigned',
    entity_type: entity_type === 'listing' ? 'listings' : 'financing_applications',
    entity_id,
    meta: { staff_role, staff_id },
  });

  return NextResponse.json({ success: true });
}

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/auth/server';
import { guardRateLimit, getClientId } from '@/lib/rate-limit';
import { SITE_URL } from '@/lib/site';

const schema = z.object({
  email: z.string().email(),
});

// Always resolves to the same generic response — the body must never reveal
// whether an account exists for the submitted email.
const GENERIC_RESPONSE = NextResponse.json({ success: true });

export async function POST(request: Request) {
  // Stricter than login/register: this triggers an email send, so a lower
  // ceiling limits both abuse and the blast radius of a leaked client id.
  const limited = await guardRateLimit(`forgot-password:${getClientId(request)}`, 3, 15 * 60_000);
  if (limited) return limited;

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  await supabaseAdmin.auth
    .resetPasswordForEmail(parsed.data.email, { redirectTo: `${SITE_URL}/reset-password` })
    .catch((error) => {
      // Never surface this to the client — that would let an attacker probe
      // for registered emails. Logged server-side only.
      console.error('resetPasswordForEmail failed', error);
    });

  return GENERIC_RESPONSE;
}

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserByEmail, signUp, signIn } from '@/lib/auth/server';
import { guardRateLimit, getClientId } from '@/lib/rate-limit';
import { z } from 'zod';
import type { Role } from '@/lib/types';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  name: z.string().min(1).optional(),
  role: z.enum(['buyer', 'seller_individual', 'seller_dealer', 'mfi_partner']),
});

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

export async function POST(request: Request) {
  // Throttle sign-ups per client to limit automated account creation.
  const limited = await guardRateLimit(`register:${getClientId(request)}`, 5, 60_000);
  if (limited) return limited;

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const issues = parsed.error.issues;
    return NextResponse.json(
      { error: issues[0]?.message ?? 'Invalid request.' },
      { status: 400 }
    );
  }

  const { email, password, name, role } = parsed.data;

  if (role === 'mfi_partner') {
    const existingProfile = await getUserByEmail(email);
    if (!existingProfile || existingProfile.role !== 'mfi_partner' || !existingProfile.mfi_institution_id) {
      return NextResponse.json(
        { error: 'MFI partner registration requires an admin-created partner access record.' },
        { status: 403 }
      );
    }
  }

  const result = await signUp(email, password, role as Role, { name });
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  // Auto sign-in after registration
  const loginResult = await signIn(email, password);
  if (loginResult.success && loginResult.session) {
    const cookieStore = cookies();
    cookieStore.set('mp_access_token', loginResult.session.accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 60 * 60,
    });
    cookieStore.set('mp_refresh_token', loginResult.session.refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 60 * 60 * 24 * 7,
    });
    cookieStore.set('mp_user_role', loginResult.user.role, {
      ...COOKIE_OPTIONS,
      maxAge: 60 * 60 * 24 * 7,
    });
  }

  return NextResponse.json({ user: result.user }, { status: 201 });
}

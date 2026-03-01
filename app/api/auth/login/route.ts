import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { signIn } from '@/lib/auth/server';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const result = await signIn(parsed.data.email, parsed.data.password);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 401 });
  }

  const cookieStore = cookies();
  if (result.session) {
    cookieStore.set('mp_access_token', result.session.accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 60 * 60,
    });
    cookieStore.set('mp_refresh_token', result.session.refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 60 * 60 * 24 * 7,
    });
    cookieStore.set('mp_user_role', result.user.role, {
      ...COOKIE_OPTIONS,
      maxAge: 60 * 60 * 24 * 7,
    });
  }

  return NextResponse.json({ user: result.user });
}

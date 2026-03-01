import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { signOut } from '@/lib/auth/server';

export async function POST() {
  const cookieStore = cookies();
  const accessToken = cookieStore.get('mp_access_token')?.value;

  if (accessToken) {
    await signOut(accessToken).catch(() => {});
  }

  cookieStore.delete('mp_access_token');
  cookieStore.delete('mp_refresh_token');
  cookieStore.delete('mp_user_role');

  return NextResponse.json({ success: true });
}

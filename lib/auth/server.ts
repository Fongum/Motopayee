/**
 * Server-side Authentication Utilities for MotoPayee
 */

import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { AuthUser, Session, AuthResult } from './types';
import type { Profile, Role } from '../types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const adminHeaders = {
  Authorization: `Bearer ${supabaseServiceKey}`,
  apikey: supabaseServiceKey,
};

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  global: {
    headers: adminHeaders,
    fetch: (url: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers ?? {});
      if (!headers.has('Authorization')) headers.set('Authorization', adminHeaders.Authorization);
      if (!headers.has('apikey')) headers.set('apikey', adminHeaders.apikey);
      return fetch(url, { ...init, headers, cache: 'no-store' });
    },
  },
});

// Cookie names
export const ACCESS_TOKEN_COOKIE = 'mp_access_token';
export const REFRESH_TOKEN_COOKIE = 'mp_refresh_token';
export const USER_ROLE_COOKIE = 'mp_user_role';

function profileToAuthUser(profile: Profile): AuthUser {
  return {
    id: profile.id,
    email: profile.email,
    name: profile.full_name ?? undefined,
    role: profile.role,
    status: profile.status,
  };
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) return null;

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    if (error || !user) return null;
    return getUserByAuthId(user.id);
  } catch {
    return null;
  }
}

export async function getUserByAuthId(authId: string): Promise<AuthUser | null> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('auth_id', authId)
    .single();
  if (error || !data) return null;
  return profileToAuthUser(data as Profile);
}

export async function getUserByEmail(email: string): Promise<Profile | null> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('email', email)
    .single();
  if (error || !data) return null;
  return data as Profile;
}

export async function signUp(
  email: string,
  password: string,
  role: Role,
  metadata?: { name?: string }
): Promise<AuthResult> {
  // Check if email already registered
  const existing = await getUserByEmail(email);
  if (existing?.auth_id) {
    return { success: false, error: 'An account with this email already exists.' };
  }

  // Create Supabase auth user
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role, name: metadata?.name },
  });

  if (authError || !authData.user) {
    return { success: false, error: authError?.message ?? 'Failed to create account.' };
  }

  const rollback = async () => {
    try {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    } catch {}
  };

  if (existing) {
    // Link existing profile
    const { data: updated, error: linkError } = await supabaseAdmin
      .from('profiles')
      .update({ auth_id: authData.user.id, full_name: metadata?.name ?? existing.full_name })
      .eq('id', existing.id)
      .select()
      .single();
    if (linkError || !updated) {
      await rollback();
      return { success: false, error: `Failed to link account: ${linkError?.message ?? 'unknown'}` };
    }
    return { success: true, user: profileToAuthUser(updated as Profile) };
  } else {
    // Create new profile
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('profiles')
      .insert({ email, auth_id: authData.user.id, role, full_name: metadata?.name, status: 'active' })
      .select()
      .single();
    if (insertError || !inserted) {
      await rollback();
      return { success: false, error: `Failed to create profile: ${insertError?.message ?? 'unknown'}` };
    }
    return { success: true, user: profileToAuthUser(inserted as Profile) };
  }
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password });
  if (error || !data.user || !data.session) {
    return { success: false, error: error?.message ?? 'Invalid credentials.' };
  }

  let user = await getUserByAuthId(data.user.id);
  if (!user) {
    // Try linking by email (profile might exist without auth_id)
    const profile = await getUserByEmail(email);
    if (profile) {
      await supabaseAdmin
        .from('profiles')
        .update({ auth_id: data.user.id })
        .eq('id', profile.id);
      user = profileToAuthUser(profile);
    }
  }

  if (!user) {
    return { success: false, error: 'User account not found.' };
  }

  // Update last login
  await supabaseAdmin
    .from('profiles')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', user.id);

  const session: Session = {
    user,
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresAt: data.session.expires_at ?? Date.now() / 1000 + 3600,
  };

  return { success: true, user, session };
}

export async function signOut(accessToken: string): Promise<void> {
  await supabaseAdmin.auth.admin.signOut(accessToken);
}

export async function refreshSession(refreshToken: string): Promise<AuthResult> {
  const { data, error } = await supabaseAdmin.auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data.user || !data.session) {
    return { success: false, error: 'Session expired. Please log in again.' };
  }

  const user = await getUserByAuthId(data.user.id);
  if (!user) {
    return { success: false, error: 'User not found.' };
  }

  const session: Session = {
    user,
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresAt: data.session.expires_at ?? Date.now() / 1000 + 3600,
  };

  return { success: true, user, session };
}

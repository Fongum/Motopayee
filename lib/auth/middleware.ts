/**
 * Authentication Middleware for MotoPayee API routes
 */

import { cookies } from 'next/headers';
import {
  getUserByAuthId,
  supabaseAdmin,
  refreshSession,
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from './server';
import type { AuthUser } from './types';
import {
  isAdminRole,
  isStaffRole,
  isSellerRole,
  isBuyerRole,
  isFieldAgentRole,
  isInspectorRole,
  isVerifierRole,
  isMFIPartnerRole,
} from './roles';

export type AuthCheckResult =
  | { authenticated: true; user: AuthUser }
  | { authenticated: false; error: string; status: number };

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return null;
    return getUserByAuthId(user.id);
  } catch {
    return null;
  }
}

export async function authenticateRequest(request: Request): Promise<AuthCheckResult> {
  // 1. Check Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const user = await verifyToken(token);
    if (user) return { authenticated: true, user };
  }

  // 2. Check cookie
  const cookieStore = cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  if (accessToken) {
    const user = await verifyToken(accessToken);
    if (user) return { authenticated: true, user };
  }

  // 3. Try refresh
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;
  if (refreshToken) {
    try {
      const result = await refreshSession(refreshToken);
      if (result.success && result.session && result.user) {
        cookieStore.set(ACCESS_TOKEN_COOKIE, result.session.accessToken, {
          ...COOKIE_OPTIONS,
          maxAge: 60 * 60,
        });
        if (result.session.refreshToken) {
          cookieStore.set(REFRESH_TOKEN_COOKIE, result.session.refreshToken, {
            ...COOKIE_OPTIONS,
            maxAge: 60 * 60 * 24 * 7,
          });
        }
        return { authenticated: true, user: result.user };
      }
    } catch {}
  }

  return { authenticated: false, error: 'Authentication required.', status: 401 };
}

export async function requireAuth(request: Request): Promise<AuthCheckResult> {
  return authenticateRequest(request);
}

export async function requireBuyer(request: Request): Promise<AuthCheckResult> {
  const result = await authenticateRequest(request);
  if (!result.authenticated) return result;
  if (!isBuyerRole(result.user.role)) {
    return { authenticated: false, error: 'Buyer access required.', status: 403 };
  }
  return result;
}

export async function requireSeller(request: Request): Promise<AuthCheckResult> {
  const result = await authenticateRequest(request);
  if (!result.authenticated) return result;
  if (!isSellerRole(result.user.role)) {
    return { authenticated: false, error: 'Seller access required.', status: 403 };
  }
  return result;
}

export async function requireFieldAgent(request: Request): Promise<AuthCheckResult> {
  const result = await authenticateRequest(request);
  if (!result.authenticated) return result;
  if (!isFieldAgentRole(result.user.role) && !isAdminRole(result.user.role)) {
    return { authenticated: false, error: 'Field agent access required.', status: 403 };
  }
  return result;
}

export async function requireInspector(request: Request): Promise<AuthCheckResult> {
  const result = await authenticateRequest(request);
  if (!result.authenticated) return result;
  if (!isInspectorRole(result.user.role) && !isAdminRole(result.user.role)) {
    return { authenticated: false, error: 'Inspector access required.', status: 403 };
  }
  return result;
}

export async function requireVerifier(request: Request): Promise<AuthCheckResult> {
  const result = await authenticateRequest(request);
  if (!result.authenticated) return result;
  if (!isVerifierRole(result.user.role) && !isAdminRole(result.user.role)) {
    return { authenticated: false, error: 'Verifier access required.', status: 403 };
  }
  return result;
}

export async function requireAdmin(request: Request): Promise<AuthCheckResult> {
  const result = await authenticateRequest(request);
  if (!result.authenticated) return result;
  if (!isAdminRole(result.user.role)) {
    return { authenticated: false, error: 'Admin access required.', status: 403 };
  }
  return result;
}

export async function requireStaff(request: Request): Promise<AuthCheckResult> {
  const result = await authenticateRequest(request);
  if (!result.authenticated) return result;
  if (!isStaffRole(result.user.role)) {
    return { authenticated: false, error: 'Staff access required.', status: 403 };
  }
  return result;
}

export async function requireMFIPartner(request: Request): Promise<AuthCheckResult> {
  const result = await authenticateRequest(request);
  if (!result.authenticated) return result;
  if (!isMFIPartnerRole(result.user.role) && !isAdminRole(result.user.role)) {
    return { authenticated: false, error: 'MFI partner access required.', status: 403 };
  }
  return result;
}

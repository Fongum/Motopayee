import type { Role } from '../types';

export interface AuthUser {
  id: string;
  email: string;
  name: string | undefined;
  role: Role;
  status: 'active' | 'inactive' | 'suspended';
}

export interface Session {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export type AuthResult =
  | { success: true; user: AuthUser; session?: Session }
  | { success: false; error: string };

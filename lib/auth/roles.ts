import type { Role } from '../types';

export const ROLES = {
  BUYER: 'buyer' as Role,
  SELLER_INDIVIDUAL: 'seller_individual' as Role,
  SELLER_DEALER: 'seller_dealer' as Role,
  FIELD_AGENT: 'field_agent' as Role,
  INSPECTOR: 'inspector' as Role,
  VERIFIER: 'verifier' as Role,
  MFI_PARTNER: 'mfi_partner' as Role,
  ADMIN: 'admin' as Role,
} as const;

const ADMIN_ROLES: Role[] = ['admin'];
const STAFF_ROLES: Role[] = ['field_agent', 'inspector', 'verifier', 'admin'];
const SELLER_ROLES: Role[] = ['seller_individual', 'seller_dealer'];

export function isAdminRole(role: string | undefined | null): boolean {
  if (!role) return false;
  return ADMIN_ROLES.includes(role as Role);
}

export function isStaffRole(role: string | undefined | null): boolean {
  if (!role) return false;
  return STAFF_ROLES.includes(role as Role);
}

export function isSellerRole(role: string | undefined | null): boolean {
  if (!role) return false;
  return SELLER_ROLES.includes(role as Role);
}

export function isBuyerRole(role: string | undefined | null): boolean {
  return role === 'buyer';
}

export function isFieldAgentRole(role: string | undefined | null): boolean {
  return role === 'field_agent';
}

export function isInspectorRole(role: string | undefined | null): boolean {
  return role === 'inspector';
}

export function isVerifierRole(role: string | undefined | null): boolean {
  return role === 'verifier';
}

export function isMFIPartnerRole(role: string | undefined | null): boolean {
  return role === 'mfi_partner';
}

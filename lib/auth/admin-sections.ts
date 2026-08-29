import { isAdminRole, isStaffRole } from '@/lib/auth/roles';

/**
 * Who may reach each section of /admin.
 *
 * The admin layout gates on isStaffRole, which includes field agents,
 * inspectors and verifiers — contractors who work a single vehicle at a time.
 * That is the right gate for the operational screens and far too wide for the
 * customer database and the finance pipeline, so each section states its own
 * requirement here and every page declares which section it is.
 *
 * Kept free of next/navigation and the Supabase client so the policy can be
 * tested directly; requireAdminPage in ./admin-access applies it.
 *
 * 'staff'  — any staff role: the screens field work actually needs.
 * 'admin'  — administrators only: customer data, money, partners, strategy.
 */

export type AdminAccessLevel = 'staff' | 'admin';

export type AdminSection =
  | 'applications'
  | 'dashboard'
  | 'finance'
  | 'hire'
  | 'imports'
  | 'inspection-requests'
  | 'launch'
  | 'leads'
  | 'listings'
  | 'ops'
  | 'reviews'
  | 'rules'
  | 'users';

export const ADMIN_SECTION_ACCESS: Record<AdminSection, AdminAccessLevel> = {
  // Operational screens: the work field agents, inspectors and verifiers do.
  'inspection-requests': 'staff',
  listings: 'staff',
  dashboard: 'staff',

  // Customer contact details, money, partners and business strategy.
  applications: 'admin',
  finance: 'admin',
  hire: 'admin',
  imports: 'admin',
  launch: 'admin',
  leads: 'admin',
  ops: 'admin',
  reviews: 'admin',
  rules: 'admin',
  users: 'admin',
};

export function canAccessAdminSection(role: string | undefined | null, section: AdminSection): boolean {
  return ADMIN_SECTION_ACCESS[section] === 'admin' ? isAdminRole(role) : isStaffRole(role);
}

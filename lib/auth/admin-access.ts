import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/server';
import { isStaffRole } from '@/lib/auth/roles';
import { canAccessAdminSection, type AdminSection } from '@/lib/auth/admin-sections';

export * from '@/lib/auth/admin-sections';

/**
 * Guard for an /admin page. Returns the signed-in user, or redirects.
 *
 * Staff who lack the section go to the admin dashboard rather than the login
 * page: they are signed in correctly, just not entitled to this screen, and
 * bouncing them to a login form would look like a broken session.
 */
export async function requireAdminPage(section: AdminSection) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!isStaffRole(user.role)) redirect('/');
  if (!canAccessAdminSection(user.role, section)) redirect('/admin/dashboard');
  return user;
}

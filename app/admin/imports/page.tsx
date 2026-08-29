import { redirect } from 'next/navigation';
import { requireAdminPage } from '@/lib/auth/admin-access';

export default async function AdminImportsIndexPage() {
  await requireAdminPage('imports');
  redirect('/admin/imports/requests');
}

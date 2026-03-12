import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/server';
import { isStaffRole } from '@/lib/auth/roles';
import Link from 'next/link';

const NAV = [
  { href: '/admin/dashboard', label: 'Vue d\'ensemble' },
  { href: '/admin/listings', label: 'Annonces' },
  { href: '/admin/imports/requests', label: 'Imports' },
  { href: '/admin/applications', label: 'Demandes' },
  { href: '/admin/rules', label: 'Règles de zone' },
  { href: '/admin/users', label: 'Utilisateurs' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user || !isStaffRole(user.role)) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-lg font-bold text-blue-600">MotoPayee</Link>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium capitalize">
              {user.role.replace(/_/g, ' ')}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 hidden sm:inline">{user.name ?? user.email}</span>
            <form action="/api/auth/logout" method="POST">
              <button type="submit" className="text-sm text-gray-400 hover:text-gray-600">Déconnexion</button>
            </form>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex gap-8">
        {/* Sidebar */}
        <aside className="w-52 flex-shrink-0 hidden md:block">
          <nav className="space-y-1">
            {NAV.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}

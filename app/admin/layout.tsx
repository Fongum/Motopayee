import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/server';
import { isStaffRole } from '@/lib/auth/roles';
import Link from 'next/link';

const NAV = [
  { href: '/admin/dashboard', label: 'Vue d\'ensemble' },
  { href: '/admin/ops', label: 'Daily ops' },
  { href: '/admin/launch', label: 'Lancement' },
  { href: '/admin/listings', label: 'Annonces' },
  { href: '/admin/leads', label: 'Leads' },
  { href: '/admin/leads/action-board', label: 'Action leads' },
  { href: '/admin/leads/inventory', label: 'File inventory' },
  { href: '/admin/leads/campaign-links', label: 'Liens campagnes' },
  { href: '/admin/leads/action-board?scope=mine', label: 'Mes actions' },
  { href: '/admin/inspection-requests', label: 'Inspections' },
  { href: '/inspector', label: 'Mes inspections' },
  { href: '/admin/imports/requests', label: 'Imports' },
  { href: '/admin/applications', label: 'Demandes' },
  { href: '/admin/finance', label: 'Finance' },
  { href: '/admin/finance/eligible', label: 'Finance eligible' },
  { href: '/admin/finance/matches', label: 'Matching finance' },
  { href: '/admin/finance/partners', label: 'Partenaires finance' },
  { href: '/admin/hire', label: 'Location' },
  { href: '/admin/hire/bookings', label: 'Reservations' },
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
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-lg font-bold"><span className="text-[#3d9e3d]">Moto</span><span className="text-[#1a3a6b]">Payee</span></Link>
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
        <aside className="w-52 flex-shrink-0 hidden md:block print:hidden">
          <nav className="space-y-1">
            {NAV.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-[#3d9e3d]/10 hover:text-[#1a3a6b] transition-colors"
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

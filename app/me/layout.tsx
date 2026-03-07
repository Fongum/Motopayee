import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/server';
import Link from 'next/link';

export default async function MeLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const sellerLinks = [
    { href: '/me/listings', label: 'Mes annonces' },
    { href: '/me/listings/new', label: 'Nouvelle annonce' },
    ...(user.role === 'seller_dealer'
      ? [{ href: '/me/listings/bulk', label: 'Import en lot' }]
      : []),
  ];

  const navLinks = user.role === 'buyer'
    ? [
        { href: '/me/applications', label: 'Mes demandes' },
        { href: '/me/favourites', label: 'Mes favoris' },
      ]
    : sellerLinks;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold text-blue-600">MotoPayee</Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user.name ?? user.email}</span>
            <form action="/api/auth/logout" method="POST">
              <button type="submit" className="text-sm text-gray-400 hover:text-gray-600">Déconnexion</button>
            </form>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex gap-8">
        {/* Sidebar */}
        <aside className="w-48 flex-shrink-0 hidden md:block">
          <nav className="space-y-1">
            {navLinks.map((link) => (
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

        {/* Main */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}

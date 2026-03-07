import { getCurrentUser } from '@/lib/auth/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function MFILayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'mfi_partner' && user.role !== 'admin') redirect('/');

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold text-[#1a3a6b]">
            MotoPayee — Portail IMF
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user.name ?? user.email}</span>
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="text-sm text-gray-400 hover:text-gray-600"
              >
                Déconnexion
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex gap-8">
        <aside className="w-48 flex-shrink-0 hidden md:block">
          <nav className="space-y-1">
            <Link
              href="/mfi/applications"
              className="block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700"
            >
              Demandes
            </Link>
          </nav>
        </aside>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}

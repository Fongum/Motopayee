'use client';

import Link from 'next/link';
import { useState } from 'react';
import { logout } from '@/lib/auth/client';
import { useUser } from '@/lib/auth/client';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const { user, loading } = useUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push('/');
    router.refresh();
  }

  function getPortalLink() {
    if (!user) return null;
    if (user.role === 'buyer') return { href: '/me/applications', label: 'My Applications' };
    if (user.role === 'seller_individual' || user.role === 'seller_dealer') return { href: '/me/listings', label: 'My Listings' };
    if (['field_agent', 'inspector', 'verifier', 'admin'].includes(user.role)) return { href: '/admin/dashboard', label: 'Dashboard' };
    return null;
  }

  const portalLink = getPortalLink();

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-blue-600">MotoPayee</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/listings" className="text-sm text-gray-600 hover:text-gray-900">
              Browse Vehicles
            </Link>
            <Link href="/sell" className="text-sm text-gray-600 hover:text-gray-900">
              Sell a Vehicle
            </Link>
            <Link href="/apply" className="text-sm text-gray-600 hover:text-gray-900">
              Get Financing
            </Link>
            {!loading && (
              <>
                {user ? (
                  <div className="flex items-center gap-4">
                    {portalLink && (
                      <Link href={portalLink.href} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                        {portalLink.label}
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      Sign out
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">
                      Sign in
                    </Link>
                    <Link
                      href="/register"
                      className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    >
                      Get Started
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2 rounded-md text-gray-500 hover:text-gray-700"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span className="sr-only">Menu</span>
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-200 px-4 py-4 space-y-3">
          <Link href="/listings" className="block text-sm text-gray-700">Browse Vehicles</Link>
          <Link href="/sell" className="block text-sm text-gray-700">Sell a Vehicle</Link>
          <Link href="/apply" className="block text-sm text-gray-700">Get Financing</Link>
          {user ? (
            <>
              {portalLink && (
                <Link href={portalLink.href} className="block text-sm text-blue-600 font-medium">
                  {portalLink.label}
                </Link>
              )}
              <button onClick={handleLogout} className="block text-sm text-gray-500">Sign out</button>
            </>
          ) : (
            <>
              <Link href="/login" className="block text-sm text-gray-700">Sign in</Link>
              <Link href="/register" className="block text-sm font-medium text-blue-600">Get Started</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { logout, useUser } from '@/lib/auth/client';
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
    if (user.role === 'buyer') return { href: '/me/applications', label: 'Mes demandes' };
    if (user.role === 'seller_individual' || user.role === 'seller_dealer') return { href: '/me/listings', label: 'Mes annonces' };
    if (user.role === 'mfi_partner') return { href: '/mfi/applications', label: 'Demandes IMF' };
    if (['field_agent', 'inspector', 'verifier', 'admin'].includes(user.role)) return { href: '/admin/dashboard', label: 'Tableau de bord' };
    return null;
  }

  const portalLink = getPortalLink();

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Image src="/logo2.png" alt="MotoPayee" width={160} height={52} className="h-12 w-auto" priority />
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="/listings" className="text-sm font-medium text-gray-700 hover:text-[#1a3a6b] transition-colors">
              Véhicules
            </Link>
            <Link href="/imports" className="text-sm font-medium text-gray-700 hover:text-[#1a3a6b] transition-colors">
              Import US
            </Link>
            <Link href="/hire" className="text-sm font-medium text-gray-700 hover:text-[#1a3a6b] transition-colors">
              Location
            </Link>
            <Link href="/sell" className="text-sm font-medium text-gray-700 hover:text-[#1a3a6b] transition-colors">
              Vendre
            </Link>
            <Link href="/apply" className="text-sm font-medium text-gray-700 hover:text-[#1a3a6b] transition-colors">
              Financement
            </Link>
            <Link href="/calculator" className="text-sm font-medium text-gray-700 hover:text-[#1a3a6b] transition-colors">
              Simulateur
            </Link>

            {!loading && (
              user ? (
                <div className="flex items-center gap-4">
                  {portalLink && (
                    <Link href={portalLink.href} className="text-sm font-semibold text-[#1a3a6b] hover:text-[#3d9e3d] transition-colors">
                      {portalLink.label}
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="text-sm text-gray-500 hover:text-gray-700 border border-gray-300 px-4 py-2 rounded-lg transition"
                  >
                    Déconnexion
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Link href="/login" className="text-sm font-medium text-[#1a3a6b] hover:text-[#3d9e3d] transition-colors">
                    Connexion
                  </Link>
                  <Link
                    href="/register"
                    className="text-sm font-semibold bg-[#3d9e3d] text-white px-5 py-2.5 rounded-lg hover:bg-[#2d8a2d] transition shadow-sm"
                  >
                    Commencer
                  </Link>
                </div>
              )
            )}
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-5 space-y-4">
          <Link href="/listings" onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-gray-700 hover:text-[#1a3a6b] py-1">Véhicules</Link>
          <Link href="/imports" onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-gray-700 hover:text-[#1a3a6b] py-1">Import US</Link>
          <Link href="/hire" onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-gray-700 hover:text-[#1a3a6b] py-1">Location</Link>
          <Link href="/sell" onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-gray-700 hover:text-[#1a3a6b] py-1">Vendre</Link>
          <Link href="/apply" onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-gray-700 hover:text-[#1a3a6b] py-1">Financement</Link>
          <Link href="/calculator" onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-gray-700 hover:text-[#1a3a6b] py-1">Simulateur</Link>
          <div className="pt-2 border-t border-gray-100">
            {user ? (
              <>
                {portalLink && (
                  <Link href={portalLink.href} onClick={() => setMenuOpen(false)} className="block text-sm font-semibold text-[#1a3a6b] py-1">{portalLink.label}</Link>
                )}
                <button onClick={handleLogout} className="block text-sm text-gray-500 py-1">Déconnexion</button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-gray-700 py-1 mb-2">Connexion</Link>
                <Link
                  href="/register"
                  onClick={() => setMenuOpen(false)}
                  className="block w-full text-center text-sm font-semibold bg-[#3d9e3d] text-white px-5 py-3 rounded-lg"
                >
                  Commencer gratuitement
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

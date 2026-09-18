'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { logout, useUser } from '@/lib/auth/client';
import { useRouter, usePathname } from 'next/navigation';

const PRIMARY_LINKS = [
  { href: '/listings', label: 'Véhicules' },
  { href: '/hire', label: 'Location' },
  { href: '/sell', label: 'Vendre' },
  { href: '/apply', label: 'Financement' },
];

const MORE_LINKS = [
  { href: '/imports', label: 'Import US' },
  { href: '/rental-partners', label: 'Loueurs' },
  { href: '/calculator', label: 'Simulateur' },
  { href: '/finance-partners', label: 'Partenaires' },
  { href: '/inspection', label: 'Inspection' },
];

export default function Navbar() {
  const { user, loading } = useUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();
  const pathname = usePathname();
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const fetchUnread = () => {
      fetch('/api/messages/unread-count')
        .then((r) => r.json())
        .then((d) => setUnreadCount(d.count ?? 0))
        .catch(() => {});
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (!moreOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [moreOpen]);

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
    if (user.role === 'inspector') return { href: '/inspector', label: 'Mes inspections' };
    if (['field_agent', 'verifier', 'admin'].includes(user.role)) return { href: '/admin/dashboard', label: 'Tableau de bord' };
    return null;
  }

  const portalLink = getPortalLink();
  const isActive = (href: string) => pathname === href || pathname?.startsWith(`${href}/`);
  const moreActive = MORE_LINKS.some((l) => isActive(l.href));

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Image src="/logo.png" alt="MotoPayee" width={180} height={72} className="h-11 w-auto" priority />
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {PRIMARY_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors ${
                  isActive(link.href) ? 'text-brand-navy' : 'text-gray-700 hover:text-brand-navy'
                }`}
              >
                {link.label}
              </Link>
            ))}

            {/* More dropdown */}
            <div className="relative" ref={moreRef}>
              <button
                onClick={() => setMoreOpen((v) => !v)}
                className={`flex items-center gap-1 text-sm font-medium transition-colors ${
                  moreActive ? 'text-brand-navy' : 'text-gray-700 hover:text-brand-navy'
                }`}
                aria-expanded={moreOpen}
                aria-haspopup="true"
              >
                Plus
                <svg className={`w-3.5 h-3.5 transition-transform ${moreOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {moreOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl border border-gray-200 shadow-card-hover py-2 z-50">
                  {MORE_LINKS.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMoreOpen(false)}
                      className={`block px-4 py-2 text-sm font-medium transition-colors ${
                        isActive(link.href) ? 'text-brand-navy bg-gray-50' : 'text-gray-700 hover:text-brand-navy hover:bg-gray-50'
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {!loading && (
              user ? (
                <div className="flex items-center gap-4">
                  <Link href="/me/inbox" className="relative text-sm font-medium text-gray-700 hover:text-brand-navy transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    {unreadCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-brand-green text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Link>
                  {portalLink && (
                    <Link href={portalLink.href} className="text-sm font-semibold text-brand-navy hover:text-brand-green transition-colors">
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
                  <Link href="/login" className="text-sm font-medium text-brand-navy hover:text-brand-green transition-colors">
                    Connexion
                  </Link>
                  <Link
                    href="/register"
                    className="text-sm font-semibold bg-brand-green text-white px-5 py-2.5 rounded-lg hover:bg-brand-green-dark transition shadow-sm"
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
          {PRIMARY_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`block text-sm font-medium py-1 ${isActive(link.href) ? 'text-brand-navy' : 'text-gray-700 hover:text-brand-navy'}`}
            >
              {link.label}
            </Link>
          ))}
          {MORE_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`block text-sm font-medium py-1 ${isActive(link.href) ? 'text-brand-navy' : 'text-gray-700 hover:text-brand-navy'}`}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-gray-100">
            {user ? (
              <>
                <Link href="/me/inbox" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 text-sm font-medium text-gray-700 py-1">
                  Messages
                  {unreadCount > 0 && (
                    <span className="bg-brand-green text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{unreadCount > 9 ? '9+' : unreadCount}</span>
                  )}
                </Link>
                {portalLink && (
                  <Link href={portalLink.href} onClick={() => setMenuOpen(false)} className="block text-sm font-semibold text-brand-navy py-1">{portalLink.label}</Link>
                )}
                <button onClick={handleLogout} className="block text-sm text-gray-500 py-1">Déconnexion</button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-gray-700 py-1 mb-2">Connexion</Link>
                <Link
                  href="/register"
                  onClick={() => setMenuOpen(false)}
                  className="block w-full text-center text-sm font-semibold bg-brand-green text-white px-5 py-3 rounded-lg"
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

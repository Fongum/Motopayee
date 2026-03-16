import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-[#0d1f3c] text-blue-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <p className="text-2xl font-bold mb-1">
              <span className="text-[#3d9e3d]">Moto</span>
              <span className="text-white">Payee</span>
            </p>
            <p className="text-[#f5a623] text-xs font-semibold tracking-widest uppercase mb-4">
              Marketplace Auto · Cameroun
            </p>
            <p className="text-sm leading-relaxed text-blue-300 max-w-xs">
              La référence pour acheter, vendre, louer et financer votre véhicule au Cameroun.
              Transparence, inspection et financement — tout en un seul endroit.
            </p>
            <div className="mt-6 flex gap-3">
              <a href="#" className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#3d9e3d] transition">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
              <a href="#" className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#3d9e3d] transition">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
              </a>
              <a href="#" className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#3d9e3d] transition">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.79 1.53V6.77a4.85 4.85 0 01-1.02-.08z" />
                </svg>
              </a>
            </div>
          </div>

          <div>
            <p className="text-white text-xs font-bold mb-5 uppercase tracking-widest">Marketplace</p>
            <ul className="space-y-3 text-sm">
              <li><Link href="/listings" className="text-blue-300 hover:text-[#3d9e3d] transition-colors">Acheter un véhicule</Link></li>
              <li><Link href="/hire" className="text-blue-300 hover:text-[#3d9e3d] transition-colors">Louer un véhicule</Link></li>
              <li><Link href="/sell" className="text-blue-300 hover:text-[#3d9e3d] transition-colors">Vendre un véhicule</Link></li>
              <li><Link href="/imports" className="text-blue-300 hover:text-[#3d9e3d] transition-colors">Importer des USA</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-white text-xs font-bold mb-5 uppercase tracking-widest">Services</p>
            <ul className="space-y-3 text-sm">
              <li><Link href="/apply" className="text-blue-300 hover:text-[#3d9e3d] transition-colors">Financement</Link></li>
              <li><Link href="/calculator" className="text-blue-300 hover:text-[#3d9e3d] transition-colors">Simulateur MVE</Link></li>
              <li><Link href="/register" className="text-blue-300 hover:text-[#3d9e3d] transition-colors">Créer un compte</Link></li>
              <li><Link href="/login" className="text-blue-300 hover:text-[#3d9e3d] transition-colors">Se connecter</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-blue-400">
          <p>© {new Date().getFullYear()} MotoPayee. Tous droits réservés.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-[#3d9e3d] transition-colors">Politique de confidentialité</a>
            <a href="#" className="hover:text-[#3d9e3d] transition-colors">Conditions d&apos;utilisation</a>
            <a href="#" className="hover:text-[#3d9e3d] transition-colors">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

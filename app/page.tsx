import Link from 'next/link';
import Image from 'next/image';
import Navbar from './(components)/Navbar';
import Footer from './(components)/Footer';
import ListingCarousel from './(components)/ListingCarousel';
import HireCarousel from './(components)/HireCarousel';
import HeroSearch from './(components)/HeroSearch';
import { supabaseAdmin } from '@/lib/auth/server';
import type { HireListing } from '@/lib/types';

// ─── Data fetching ────────────────────────────────────────────────────────────

async function getLatestListings(limit = 14) {
  const { data } = await supabaseAdmin
    .from('listings')
    .select('id, asking_price, zone, price_band, vehicle:vehicles(make,model,year,mileage_km,fuel_type), media:media_assets(id)')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}

async function getFinanceableListings(limit = 10) {
  const { data } = await supabaseAdmin
    .from('listings')
    .select('id, asking_price, zone, price_band, vehicle:vehicles(make,model,year,mileage_km,fuel_type), media:media_assets(id)')
    .eq('status', 'published')
    .eq('financeable', true)
    .order('created_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}

async function getHireListings(limit = 10) {
  const { data } = await supabaseAdmin
    .from('hire_listings')
    .select('*, owner:profiles!owner_id(full_name, is_verified), media:hire_listing_media(id, storage_path, bucket, display_order)')
    .eq('status', 'published')
    .eq('availability', 'available')
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as unknown as HireListing[];
}

async function getCounts() {
  const [{ count: vehicleCount }, { count: hireCount }, { count: appCount }] = await Promise.all([
    supabaseAdmin.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'published'),
    supabaseAdmin.from('hire_listings').select('id', { count: 'exact', head: true }).eq('status', 'published'),
    supabaseAdmin.from('financing_applications').select('id', { count: 'exact', head: true }),
  ]);
  return {
    vehicles: vehicleCount ?? 0,
    hires: hireCount ?? 0,
    applications: appCount ?? 0,
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAKES = [
  'Toyota', 'Honda', 'Nissan', 'Hyundai',
  'Mercedes', 'BMW', 'Peugeot', 'Renault',
  'Mitsubishi', 'Kia', 'Volkswagen', 'Ford',
];

const MAKE_INITIALS: Record<string, string> = {
  Toyota: 'T', Honda: 'H', Nissan: 'N', Hyundai: 'Y',
  Mercedes: 'M', BMW: 'B', Peugeot: 'P', Renault: 'R',
  Mitsubishi: 'Mi', Kia: 'K', Volkswagen: 'VW', Ford: 'F',
};

const MAKE_COLORS: Record<string, string> = {
  Toyota: 'bg-red-50 text-red-700 border-red-100',
  Honda: 'bg-gray-50 text-gray-700 border-gray-100',
  Nissan: 'bg-red-50 text-red-800 border-red-100',
  Hyundai: 'bg-blue-50 text-blue-700 border-blue-100',
  Mercedes: 'bg-gray-50 text-gray-800 border-gray-200',
  BMW: 'bg-blue-50 text-blue-800 border-blue-100',
  Peugeot: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  Renault: 'bg-yellow-50 text-yellow-700 border-yellow-100',
  Mitsubishi: 'bg-red-50 text-red-700 border-red-100',
  Kia: 'bg-gray-50 text-gray-700 border-gray-100',
  Volkswagen: 'bg-blue-50 text-blue-700 border-blue-100',
  Ford: 'bg-blue-50 text-blue-800 border-blue-100',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const [latest, financeable, hireListings, counts] = await Promise.all([
    getLatestListings(14),
    getFinanceableListings(10),
    getHireListings(10),
    getCounts(),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toCarousel = (arr: any[]) => arr as Parameters<typeof ListingCarousel>[0]['listings'];

  return (
    <>
      <Navbar />
      <main>

        {/* ─── HERO ─────────────────────────────────────────────────── */}
        <section className="relative bg-[#0d1f3c] overflow-hidden">
          {/* Background image with overlay */}
          <div className="absolute inset-0 z-0">
            <Image src="/car-hero.png" alt="" fill className="object-cover object-right opacity-30" priority />
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-[#0d1f3c]/90 via-[#0d1f3c]/70 to-[#0d1f3c] z-[1]" />

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20">
            {/* Badge */}
            <div className="flex justify-center mb-8">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 rounded-full px-5 py-2">
                <span className="w-2 h-2 rounded-full bg-[#3d9e3d] animate-pulse" />
                <span className="text-white/80 text-xs font-semibold tracking-wide">Plateforme automobile #1 au Cameroun</span>
              </div>
            </div>

            {/* Headline */}
            <div className="text-center max-w-3xl mx-auto mb-10">
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white leading-[1.1] mb-5">
                Achetez, louez ou{' '}
                <span className="relative">
                  <span className="text-[#3d9e3d]">financez</span>
                  <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 200 8" fill="none">
                    <path d="M2 6C40 2 160 2 198 6" stroke="#3d9e3d" strokeWidth="3" strokeLinecap="round" opacity="0.4" />
                  </svg>
                </span>{' '}
                votre véhicule
              </h1>
              <p className="text-blue-200/80 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
                Véhicules inspectés, prix transparents, location avec ou sans chauffeur, import des USA et financement rapide — tout en un seul endroit.
              </p>
            </div>

            {/* Tabbed search */}
            <HeroSearch makes={MAKES} />

            {/* Quick stats under search */}
            <div className="mt-10 flex flex-wrap justify-center gap-8 text-center">
              {[
                { value: counts.vehicles > 0 ? `${counts.vehicles}+` : '500+', label: 'Véhicules en vente' },
                { value: counts.hires > 0 ? `${counts.hires}+` : '50+', label: 'Véhicules en location' },
                { value: counts.applications > 0 ? `${counts.applications}+` : '1 200+', label: 'Demandes traitées' },
                { value: '3', label: 'Zones couvertes' },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-2xl sm:text-3xl font-extrabold text-white">{s.value}</p>
                  <p className="text-[11px] text-blue-300/70 mt-1 font-medium">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── SERVICES ───────────────────────────────────────────────── */}
        <section className="relative -mt-6 z-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {[
                {
                  href: '/listings',
                  title: 'Acheter',
                  desc: 'Parcourez des véhicules inspectés et vérifiés avec prix de marché transparent',
                  icon: (
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  ),
                  color: 'from-[#3d9e3d] to-emerald-600',
                  iconBg: 'bg-[#3d9e3d]/10 text-[#3d9e3d]',
                },
                {
                  href: '/hire',
                  title: 'Louer',
                  desc: 'Location de véhicules avec ou sans chauffeur, tarifs journaliers flexibles',
                  icon: (
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ),
                  color: 'from-[#f5a623] to-orange-500',
                  iconBg: 'bg-amber-50 text-[#f5a623]',
                },
                {
                  href: '/sell',
                  title: 'Vendre',
                  desc: 'Listez votre véhicule avec estimation MVE et touchez des milliers d\'acheteurs',
                  icon: (
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                  ),
                  color: 'from-[#1a3a6b] to-blue-700',
                  iconBg: 'bg-blue-50 text-[#1a3a6b]',
                },
                {
                  href: '/imports',
                  title: 'Importer',
                  desc: 'Import assisté depuis les USA — devis, suivi logistique et dédouanement',
                  icon: (
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ),
                  color: 'from-purple-600 to-violet-600',
                  iconBg: 'bg-purple-50 text-purple-600',
                },
              ].map((svc) => (
                <Link
                  key={svc.title}
                  href={svc.href}
                  className="group relative bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 hover:shadow-xl hover:border-gray-300 transition-all duration-300 overflow-hidden"
                >
                  {/* Gradient top line */}
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${svc.color} opacity-0 group-hover:opacity-100 transition-opacity`} />

                  <div className={`w-12 h-12 rounded-xl ${svc.iconBg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    {svc.icon}
                  </div>
                  <h3 className="font-bold text-[#1a3a6b] text-base mb-1 group-hover:text-[#3d9e3d] transition-colors">{svc.title}</h3>
                  <p className="text-xs text-gray-400 leading-relaxed hidden sm:block">{svc.desc}</p>

                  {/* Arrow */}
                  <div className="absolute bottom-4 right-4 w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-[#3d9e3d] transition-colors">
                    <svg className="w-3 h-3 text-gray-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ─── VEHICLE CAROUSELS ──────────────────────────────────────── */}
        <section className="bg-white pt-16 pb-12 px-4">
          <div className="max-w-7xl mx-auto space-y-14">
            {/* Latest for sale */}
            {latest.length > 0 && (
              <ListingCarousel
                listings={toCarousel(latest)}
                title="Dernières annonces"
                seeAllHref="/listings"
                accent="#3d9e3d"
              />
            )}

            {/* Hire vehicles */}
            {hireListings.length > 0 && (
              <HireCarousel
                listings={hireListings}
                title="Véhicules disponibles en location"
                seeAllHref="/hire"
                accent="#f5a623"
              />
            )}

            {/* Financeable */}
            {financeable.length > 0 && (
              <ListingCarousel
                listings={toCarousel(financeable)}
                title="Éligibles au financement"
                seeAllHref="/listings?financeable=true"
                accent="#1a3a6b"
              />
            )}

            {/* Empty state */}
            {latest.length === 0 && financeable.length === 0 && hireListings.length === 0 && (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2-.001" />
                  </svg>
                </div>
                <p className="text-gray-400 text-sm">Les premières annonces arrivent bientôt.</p>
              </div>
            )}
          </div>
        </section>

        {/* ─── BROWSE BY MAKE ───────────────────────────────────────── */}
        <section className="bg-gray-50 py-14 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <span className="text-[#3d9e3d] text-xs font-bold uppercase tracking-widest">Explorer</span>
                <h2 className="text-2xl font-extrabold text-[#1a3a6b] mt-1">Parcourir par marque</h2>
              </div>
              <Link href="/listings" className="text-sm font-semibold text-[#3d9e3d] flex items-center gap-1 hover:gap-2 transition-all">
                Toutes les marques
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {MAKES.map((make) => (
                <Link
                  key={make}
                  href={`/listings?make=${make}`}
                  className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl border border-gray-200 hover:border-[#3d9e3d] hover:shadow-md transition-all group"
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-extrabold border-2 ${MAKE_COLORS[make]} group-hover:scale-110 transition-transform`}>
                    {MAKE_INITIALS[make]}
                  </div>
                  <span className="text-xs font-semibold text-gray-700 group-hover:text-[#1a3a6b]">{make}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ─── HOW IT WORKS — MULTI-SERVICE ──────────────────────────── */}
        <section className="py-20 px-4 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <span className="text-[#3d9e3d] text-xs font-bold uppercase tracking-widest">Comment ça marche</span>
              <h2 className="text-3xl md:text-4xl font-extrabold text-[#1a3a6b] mt-3 mb-4">Simple, rapide, transparent</h2>
              <p className="text-gray-400 max-w-lg mx-auto text-sm">Que vous achetiez, louiez, vendiez ou importiez — le processus est guidé du début à la fin</p>
            </div>

            {/* Two-column grid for Buy + Hire flows */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
              {/* Buy flow */}
              <div className="bg-gradient-to-br from-gray-50 to-white rounded-3xl border border-gray-100 p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-[#3d9e3d] rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-[#1a3a6b]">Acheter un véhicule</h3>
                </div>
                <div className="space-y-4">
                  {[
                    { step: '1', text: 'Parcourez nos annonces inspectées et vérifiées' },
                    { step: '2', text: 'Vérifiez votre éligibilité au financement' },
                    { step: '3', text: 'Déposez vos documents, réponse sous 72h' },
                  ].map((s) => (
                    <div key={s.step} className="flex items-start gap-3">
                      <span className="w-7 h-7 rounded-full bg-[#3d9e3d]/10 text-[#3d9e3d] text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{s.step}</span>
                      <p className="text-sm text-gray-600">{s.text}</p>
                    </div>
                  ))}
                </div>
                <Link href="/listings" className="inline-flex items-center gap-2 text-sm font-semibold text-[#3d9e3d] mt-6 hover:gap-3 transition-all">
                  Voir les véhicules
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>

              {/* Hire flow */}
              <div className="bg-gradient-to-br from-amber-50/50 to-white rounded-3xl border border-amber-100/50 p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-[#f5a623] rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-[#1a3a6b]">Louer un véhicule</h3>
                </div>
                <div className="space-y-4">
                  {[
                    { step: '1', text: 'Trouvez un véhicule disponible dans votre ville' },
                    { step: '2', text: 'Choisissez vos dates et le mode (avec/sans chauffeur)' },
                    { step: '3', text: 'Réservez et récupérez le véhicule' },
                  ].map((s) => (
                    <div key={s.step} className="flex items-start gap-3">
                      <span className="w-7 h-7 rounded-full bg-[#f5a623]/10 text-[#f5a623] text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{s.step}</span>
                      <p className="text-sm text-gray-600">{s.text}</p>
                    </div>
                  ))}
                </div>
                <Link href="/hire" className="inline-flex items-center gap-2 text-sm font-semibold text-[#f5a623] mt-6 hover:gap-3 transition-all">
                  Parcourir les locations
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* Sell + Import row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-gradient-to-br from-blue-50/50 to-white rounded-3xl border border-blue-100/50 p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-[#1a3a6b] rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-[#1a3a6b]">Vendre votre véhicule</h3>
                </div>
                <p className="text-sm text-gray-500 mb-4">Listez votre véhicule, recevez une estimation MVE, et touchez des milliers d&apos;acheteurs vérifiés dans les 3 zones.</p>
                <Link href="/sell" className="inline-flex items-center gap-2 text-sm font-semibold text-[#1a3a6b] hover:gap-3 transition-all">
                  Commencer à vendre
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>

              <div className="bg-gradient-to-br from-purple-50/50 to-white rounded-3xl border border-purple-100/50 p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-[#1a3a6b]">Importer des USA</h3>
                </div>
                <p className="text-sm text-gray-500 mb-4">Import assisté depuis les enchères américaines — devis tout inclus, suivi en temps réel et dédouanement facilité.</p>
                <Link href="/imports" className="inline-flex items-center gap-2 text-sm font-semibold text-purple-600 hover:gap-3 transition-all">
                  Explorer les offres
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ─── HIRE PROMO BANNER ──────────────────────────────────────── */}
        <section className="bg-gradient-to-r from-[#1a3a6b] via-[#1a3a6b] to-[#0d1f3c] py-16 px-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#f5a623]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="max-w-6xl mx-auto relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-[#f5a623]/20 border border-[#f5a623]/30 rounded-full px-4 py-1.5 mb-6">
                  <span className="text-[#f5a623] text-xs font-bold tracking-wide uppercase">Nouveau</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-extrabold text-white leading-tight mb-4">
                  Location de véhicules<br />
                  <span className="text-[#f5a623]">partout au Cameroun</span>
                </h2>
                <p className="text-blue-200/70 text-sm leading-relaxed mb-8 max-w-md">
                  Besoin d&apos;un véhicule pour quelques jours ? Louez directement auprès de propriétaires vérifiés.
                  Avec ou sans chauffeur, à des tarifs transparents.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Link href="/hire" className="inline-flex items-center gap-2 bg-[#f5a623] text-[#1a3a6b] font-bold px-6 py-3 rounded-xl hover:bg-[#e6951c] transition text-sm">
                    Parcourir les véhicules
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                  <Link href="/me/hire-listings/new" className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white font-semibold px-6 py-3 rounded-xl hover:bg-white/20 transition text-sm">
                    Mettre en location
                  </Link>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: '🚗', value: 'Self-drive', label: 'Conduisez vous-même' },
                  { icon: '👨‍✈️', value: 'Avec chauffeur', label: 'Chauffeur professionnel' },
                  { icon: '📅', value: 'Jour / Semaine / Mois', label: 'Durée flexible' },
                  { icon: '🛡️', value: 'Assurance', label: 'Option disponible' },
                ].map((f) => (
                  <div key={f.value} className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                    <span className="text-2xl mb-2 block">{f.icon}</span>
                    <p className="text-white text-sm font-bold">{f.value}</p>
                    <p className="text-blue-300/60 text-[11px] mt-0.5">{f.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ─── WHY CHOOSE US ──────────────────────────────────────────── */}
        <section className="py-20 px-4 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div className="relative">
                <div className="relative rounded-3xl overflow-hidden shadow-2xl aspect-[4/3]">
                  <Image src="/team.png" alt="Équipe MotoPayee" fill className="object-cover" />
                </div>
                <div className="absolute -bottom-5 -right-5 bg-white rounded-2xl shadow-xl p-5 border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#f0faf0] flex items-center justify-center">
                      <svg className="w-5 h-5 text-[#3d9e3d]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-2xl font-extrabold text-[#1a3a6b] leading-none">{counts.vehicles > 0 ? `${counts.vehicles}+` : '500+'}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Véhicules vérifiés</p>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <span className="text-[#3d9e3d] text-xs font-bold uppercase tracking-widest">Pourquoi MotoPayee</span>
                <h2 className="text-3xl md:text-4xl font-extrabold text-[#1a3a6b] mt-3 mb-5">La confiance au centre<br />de chaque transaction</h2>
                <p className="text-gray-500 mb-8 leading-relaxed text-sm">Notre équipe assure que chaque véhicule est inspecté, chaque document vérifié et chaque location/vente se déroule en toute sécurité.</p>
                <div className="space-y-5">
                  {[
                    { title: 'Inspection professionnelle', desc: 'Rapport en 12 points par nos agents certifiés.', bg: 'bg-[#f0faf0]', color: 'text-[#3d9e3d]', icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>) },
                    { title: 'Prix de marché transparent', desc: 'Estimation MVE pour chaque annonce — pas de mauvaise surprise.', bg: 'bg-amber-50', color: 'text-[#f5a623]', icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>) },
                    { title: 'Financement sous 72h', desc: 'Traitement express avec nos IMF partenaires.', bg: 'bg-blue-50', color: 'text-[#1a3a6b]', icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>) },
                    { title: 'Location sécurisée', desc: 'Propriétaires vérifiés, réservation en ligne, conditions claires.', bg: 'bg-purple-50', color: 'text-purple-600', icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>) },
                  ].map((f) => (
                    <div key={f.title} className="flex items-start gap-4">
                      <div className={`w-10 h-10 ${f.bg} ${f.color} rounded-xl flex items-center justify-center flex-shrink-0`}>{f.icon}</div>
                      <div>
                        <p className="font-bold text-[#1a3a6b] text-sm">{f.title}</p>
                        <p className="text-sm text-gray-400 mt-0.5">{f.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── TESTIMONIALS ─────────────────────────────────────────── */}
        <section className="py-20 px-4 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <span className="text-[#3d9e3d] text-xs font-bold uppercase tracking-widest">Témoignages</span>
              <h2 className="text-3xl font-extrabold text-[#1a3a6b] mt-3">Ce que disent nos clients</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { name: 'Aminata K.', city: 'Yaoundé — Zone A', photo: '/woman.png', text: "J'ai trouvé ma Toyota Corolla en moins d'une semaine et obtenu mon financement en 3 jours. Le processus est vraiment transparent.", service: 'Achat + Financement' },
                { name: 'Eric M.', city: 'Douala — Zone A', photo: '/man.png', text: "En tant que vendeur, MotoPayee m'a permis de vendre ma voiture au juste prix grâce à leur estimation de marché.", service: 'Vente' },
                { name: 'Marie T.', city: 'Bafoussam — Zone B', photo: '/woman.png', text: "J'ai loué un SUV pour un voyage d'affaires. Réservation rapide, véhicule impeccable, chauffeur professionnel.", service: 'Location' },
              ].map((t) => (
                <div key={t.name} className="bg-gray-50 rounded-2xl p-7 border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="w-4 h-4 text-[#f5a623]" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed mb-5 italic">&ldquo;{t.text}&rdquo;</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                        <Image src={t.photo} alt={t.name} width={40} height={40} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="font-bold text-[#1a3a6b] text-sm">{t.name}</p>
                        <p className="text-[11px] text-gray-400">{t.city}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold bg-gray-100 text-gray-500 px-2 py-1 rounded-full">{t.service}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── FINAL CTA ────────────────────────────────────────────── */}
        <section className="relative bg-[#0d1f3c] overflow-hidden py-20 px-4">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[#3d9e3d]/10 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-[#f5a623]/10 blur-3xl" />
          <div className="relative z-10 max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mb-5 leading-tight">Prêt à démarrer ?</h2>
            <p className="text-blue-200/70 text-base mb-10 max-w-xl mx-auto">Que vous cherchiez à acheter, louer, vendre ou importer — MotoPayee vous accompagne à chaque étape.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/listings" className="inline-flex items-center justify-center gap-2 bg-[#3d9e3d] text-white font-bold px-7 py-3.5 rounded-xl hover:bg-[#2d8a2d] transition shadow-lg text-sm">
                Acheter un véhicule
              </Link>
              <Link href="/hire" className="inline-flex items-center justify-center gap-2 bg-[#f5a623] text-[#1a3a6b] font-bold px-7 py-3.5 rounded-xl hover:bg-[#e6951c] transition shadow-lg text-sm">
                Louer un véhicule
              </Link>
              <Link href="/sell" className="inline-flex items-center justify-center gap-2 bg-white/10 border border-white/20 text-white font-bold px-7 py-3.5 rounded-xl hover:bg-white/20 transition text-sm">
                Vendre
              </Link>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}

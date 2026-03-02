import Link from 'next/link';
import Image from 'next/image';
import Navbar from './(components)/Navbar';
import Footer from './(components)/Footer';
import ListingCarousel from './(components)/ListingCarousel';
import { supabaseAdmin } from '@/lib/auth/server';

// ─── Data fetching ────────────────────────────────────────────────────────────

async function getLatestListings(limit = 12) {
  const { data } = await supabaseAdmin
    .from('listings')
    .select('id, asking_price, zone, price_band, vehicle:vehicles(make,model,year,mileage_km,fuel_type), media:media_assets(id)')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}

async function getListingsByZone(zone: string, limit = 10) {
  const { data } = await supabaseAdmin
    .from('listings')
    .select('id, asking_price, zone, price_band, vehicle:vehicles(make,model,year,mileage_km,fuel_type), media:media_assets(id)')
    .eq('status', 'published')
    .eq('zone', zone)
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

const BODY_TYPES = [
  {
    label: 'Berline', param: 'sedan',
    icon: (
      <svg viewBox="0 0 80 40" className="w-16 h-10" fill="currentColor">
        <path d="M8 30 Q8 22 16 20 L24 12 Q28 8 36 8 L52 8 Q58 8 62 12 L70 20 Q76 22 76 28 L76 30 Q76 32 74 32 L68 32 Q66 38 60 38 Q54 38 52 32 L28 32 Q26 38 20 38 Q14 38 12 32 L8 32 Q6 32 6 30 Z" />
      </svg>
    ),
  },
  {
    label: 'SUV', param: 'suv',
    icon: (
      <svg viewBox="0 0 80 44" className="w-16 h-10" fill="currentColor">
        <path d="M6 34 L6 16 Q6 8 14 8 L66 8 Q74 8 74 16 L74 34 Q74 36 72 36 L66 36 Q64 42 58 42 Q52 42 50 36 L28 36 Q26 42 20 42 Q14 42 12 36 L6 36 Z" />
      </svg>
    ),
  },
  {
    label: 'Pick-up', param: 'pickup',
    icon: (
      <svg viewBox="0 0 80 40" className="w-16 h-10" fill="currentColor">
        <path d="M6 30 L6 18 Q6 10 14 10 L38 10 L38 16 L70 16 Q76 16 76 22 L76 30 L70 30 Q68 36 62 36 Q56 36 54 30 L26 30 Q24 36 18 36 Q12 36 10 30 Z" />
      </svg>
    ),
  },
  {
    label: 'Hatchback', param: 'hatchback',
    icon: (
      <svg viewBox="0 0 80 40" className="w-16 h-10" fill="currentColor">
        <path d="M8 30 Q8 22 14 20 L24 10 Q28 6 36 6 L52 6 Q58 6 62 10 L68 20 Q76 22 76 28 L76 30 Q76 32 74 32 L68 32 Q66 38 60 38 Q54 38 52 32 L28 32 Q26 38 20 38 Q14 38 12 32 L8 32 Q6 32 6 30 Z" />
      </svg>
    ),
  },
  {
    label: 'Minibus', param: 'van',
    icon: (
      <svg viewBox="0 0 80 40" className="w-16 h-10" fill="currentColor">
        <path d="M6 30 L6 10 Q6 6 10 6 L64 6 Q74 6 74 16 L74 30 Q74 32 72 32 L66 32 Q64 38 58 38 Q52 38 50 32 L28 32 Q26 38 20 38 Q14 38 12 32 L6 32 Q4 32 4 30 Z" />
      </svg>
    ),
  },
  {
    label: 'Hybride', param: 'hybrid',
    icon: (
      <svg viewBox="0 0 80 40" className="w-16 h-10" fill="currentColor">
        <path d="M8 30 Q8 22 16 20 L26 12 Q30 8 38 8 L50 8 Q56 8 60 12 L68 20 Q76 22 76 28 L76 30 Q74 32 70 32 L68 32 Q66 38 60 38 Q54 38 52 32 L28 32 Q26 38 20 38 Q14 38 12 32 L8 32 Q6 32 6 30 Z" />
        <circle cx="40" cy="18" r="5" fill="white" opacity="0.4"/>
      </svg>
    ),
  },
];

const PRICE_RANGES = [
  { label: 'Moins de 1M XAF', min: 0, max: 1_000_000 },
  { label: '1M – 2M XAF', min: 1_000_000, max: 2_000_000 },
  { label: '2M – 3M XAF', min: 2_000_000, max: 3_000_000 },
  { label: '3M – 5M XAF', min: 3_000_000, max: 5_000_000 },
  { label: '5M – 8M XAF', min: 5_000_000, max: 8_000_000 },
  { label: '8M – 12M XAF', min: 8_000_000, max: 12_000_000 },
  { label: 'Plus de 12M XAF', min: 12_000_000, max: 999_000_000 },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const [latest, zoneA, financeable] = await Promise.all([
    getLatestListings(14),
    getListingsByZone('A', 10),
    getFinanceableListings(10),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toCarousel = (arr: any[]) => arr as Parameters<typeof ListingCarousel>[0]['listings'];

  return (
    <>
      <Navbar />
      <main>

        {/* ─── HERO ─────────────────────────────────────────────────── */}
        <section className="relative bg-[#0d1f3c] overflow-hidden min-h-[85vh] flex items-center">
          <div className="absolute inset-0 bg-gradient-to-r from-[#0d1f3c] via-[#0d1f3c]/80 to-[#0d1f3c]/10 z-10" />
          <div className="absolute inset-0 z-0">
            <Image src="/car-hero.png" alt="MotoPayee Vehicle" fill className="object-cover object-right" priority />
          </div>

          <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 w-full">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 bg-[#3d9e3d]/20 border border-[#3d9e3d]/40 rounded-full px-4 py-1.5 mb-8">
                <span className="w-2 h-2 rounded-full bg-[#3d9e3d] animate-pulse" />
                <span className="text-[#3d9e3d] text-xs font-bold tracking-widest uppercase">Marketplace #1 au Cameroun</span>
              </div>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-white leading-[1.05] mb-6">
                Votre voiture,{' '}
                <span className="text-[#3d9e3d]">financée</span>{' '}
                simplement.
              </h1>
              <p className="text-blue-200 text-lg md:text-xl leading-relaxed mb-8 max-w-xl">
                Achetez, vendez et financez votre véhicule — inspecté, vérifié et disponible partout au Cameroun.
              </p>

              {/* ── Quick search form ── */}
              <form action="/listings" method="GET" className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-4 flex flex-col sm:flex-row gap-3">
                <select name="make" className="flex-1 bg-white/20 border border-white/30 text-white rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-[#3d9e3d] appearance-none">
                  <option value="" className="text-gray-900">Toutes les marques</option>
                  {MAKES.map((m) => (
                    <option key={m} value={m} className="text-gray-900">{m}</option>
                  ))}
                </select>
                <select name="zone" className="flex-1 bg-white/20 border border-white/30 text-white rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-[#3d9e3d] appearance-none">
                  <option value="" className="text-gray-900">Toutes les zones</option>
                  <option value="A" className="text-gray-900">Zone A — Grandes villes</option>
                  <option value="B" className="text-gray-900">Zone B — Villes secondaires</option>
                  <option value="C" className="text-gray-900">Zone C — Rural</option>
                </select>
                <button type="submit" className="bg-[#3d9e3d] text-white font-bold px-6 py-3 rounded-xl hover:bg-[#2d8a2d] transition flex items-center gap-2 whitespace-nowrap">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Rechercher
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* ─── STATS ────────────────────────────────────────────────── */}
        <section className="bg-[#1a3a6b] py-6">
          <div className="max-w-6xl mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              {[
                { value: '500+', label: 'Véhicules disponibles' },
                { value: '1 200+', label: 'Demandes traitées' },
                { value: '3', label: 'Zones couvertes' },
                { value: '72%', label: "Taux d'approbation" },
              ].map((s) => (
                <div key={s.label} className="py-2">
                  <p className="text-3xl font-extrabold text-[#f5a623]">{s.value}</p>
                  <p className="text-xs text-blue-300 mt-1 font-medium">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── CAROUSELS ────────────────────────────────────────────── */}
        <section className="bg-white py-12 px-4">
          <div className="max-w-7xl mx-auto space-y-12">

            {/* Latest listings */}
            {latest.length > 0 && (
              <ListingCarousel
                listings={toCarousel(latest)}
                title="Dernières annonces"
                seeAllHref="/listings"
                accent="#3d9e3d"
              />
            )}

            {/* Financeable */}
            {financeable.length > 0 && (
              <ListingCarousel
                listings={toCarousel(financeable)}
                title="Éligibles au financement"
                seeAllHref="/listings?financeable=true"
                accent="#f5a623"
              />
            )}

            {/* Zone A */}
            {zoneA.length > 0 && (
              <ListingCarousel
                listings={toCarousel(zoneA)}
                title="Zone A — Grandes villes"
                seeAllHref="/listings?zone=A"
                accent="#1a3a6b"
              />
            )}

            {/* Empty state */}
            {latest.length === 0 && financeable.length === 0 && zoneA.length === 0 && (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2-.001" />
                  </svg>
                </div>
                <p className="text-gray-400 text-sm">Les premières annonces arrivent bientôt.</p>
                <Link href="/listings" className="mt-4 inline-block text-sm font-semibold text-[#3d9e3d] hover:underline">
                  Voir la marketplace →
                </Link>
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

        {/* ─── BROWSE BY BODY TYPE ──────────────────────────────────── */}
        <section className="bg-white py-14 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <span className="text-[#3d9e3d] text-xs font-bold uppercase tracking-widest">Explorer</span>
              <h2 className="text-2xl font-extrabold text-[#1a3a6b] mt-1">Parcourir par type</h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              {BODY_TYPES.map((bt) => (
                <Link
                  key={bt.label}
                  href={`/listings?body_type=${bt.param}`}
                  className="flex flex-col items-center gap-3 p-5 bg-gray-50 rounded-2xl border border-gray-100 hover:border-[#3d9e3d] hover:bg-[#f0faf0] hover:shadow-md transition-all group"
                >
                  <div className="text-gray-400 group-hover:text-[#3d9e3d] transition-colors">
                    {bt.icon}
                  </div>
                  <span className="text-xs font-bold text-gray-600 group-hover:text-[#1a3a6b] uppercase tracking-wide">{bt.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ─── BROWSE BY PRICE ──────────────────────────────────────── */}
        <section className="bg-gray-50 py-14 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <span className="text-[#3d9e3d] text-xs font-bold uppercase tracking-widest">Explorer</span>
              <h2 className="text-2xl font-extrabold text-[#1a3a6b] mt-1">Parcourir par budget</h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {PRICE_RANGES.map((range) => (
                <Link
                  key={range.label}
                  href={`/listings?min_price=${range.min}&max_price=${range.max}`}
                  className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:border-[#3d9e3d] hover:shadow-md transition-all group"
                >
                  <div className="w-10 h-10 bg-[#f0faf0] rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-[#3d9e3d] transition-colors">
                    <svg className="w-5 h-5 text-[#3d9e3d] group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-gray-700 group-hover:text-[#1a3a6b]">{range.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ─── HOW IT WORKS ─────────────────────────────────────────── */}
        <section className="py-24 px-4 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <span className="text-[#3d9e3d] text-xs font-bold uppercase tracking-widest">Processus</span>
              <h2 className="text-3xl md:text-4xl font-extrabold text-[#1a3a6b] mt-3 mb-4">Comment ça marche</h2>
              <p className="text-gray-500 max-w-lg mx-auto text-sm">Du choix du véhicule à l&apos;obtention du financement — un parcours guidé et transparent</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { step: '01', title: 'Trouvez votre véhicule', desc: "Parcourez nos annonces vérifiées avec photos, rapport d'inspection et prix estimés.", color: 'bg-[#3d9e3d]', icon: (<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>) },
                { step: '02', title: "Vérifiez l'éligibilité", desc: 'Notre système calcule automatiquement votre éligibilité selon votre zone et votre profil.', color: 'bg-[#f5a623]', icon: (<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>) },
                { step: '03', title: 'Obtenez le financement', desc: 'Déposez vos documents, notre équipe les traite sous 72h avec nos IMF partenaires.', color: 'bg-[#1a3a6b]', icon: (<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>) },
              ].map((item, idx) => (
                <div key={item.step} className="relative bg-gray-50 rounded-2xl p-8 border border-gray-100 hover:shadow-md transition-shadow">
                  {idx < 2 && (
                    <div className="hidden md:block absolute top-14 -right-4 z-10">
                      <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  )}
                  <div className={`w-14 h-14 ${item.color} rounded-2xl flex items-center justify-center text-white mb-6`}>{item.icon}</div>
                  <span className="text-xs font-bold tracking-widest text-gray-400 uppercase">Étape {item.step}</span>
                  <h3 className="text-lg font-bold text-[#1a3a6b] mt-2 mb-3">{item.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── TEAM + FEATURES ──────────────────────────────────────── */}
        <section className="py-24 px-4 bg-gray-50">
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
                      <p className="text-2xl font-extrabold text-[#1a3a6b] leading-none">500+</p>
                      <p className="text-xs text-gray-500 mt-0.5">Véhicules vérifiés</p>
                    </div>
                  </div>
                </div>
                <div className="absolute -top-5 -left-5 bg-[#1a3a6b] rounded-2xl shadow-xl px-4 py-3">
                  <p className="text-[#f5a623] text-xs font-bold uppercase tracking-wide">Depuis 2024</p>
                  <p className="text-white text-sm font-bold">MotoPayee</p>
                </div>
              </div>
              <div>
                <span className="text-[#3d9e3d] text-xs font-bold uppercase tracking-widest">Pourquoi nous choisir</span>
                <h2 className="text-3xl md:text-4xl font-extrabold text-[#1a3a6b] mt-3 mb-5">La confiance au cœur<br />de chaque transaction</h2>
                <p className="text-gray-500 mb-8 leading-relaxed">Notre équipe certifiée assure que chaque véhicule est inspecté, chaque document vérifié et chaque dossier traité avec rigueur.</p>
                <div className="space-y-5">
                  {[
                    { title: 'Inspection professionnelle', desc: 'Chaque véhicule est inspecté par nos agents certifiés avec rapport en 12 points.', icon: '🔍', bg: 'bg-[#f0faf0]' },
                    { title: 'Prix de marché transparent', desc: "Estimation MVE fournie pour chaque annonce — vous savez exactement ce que vous payez.", icon: '📊', bg: 'bg-amber-50' },
                    { title: 'Financement sous 72h', desc: 'Traitement express des dossiers avec nos institutions de microfinance partenaires.', icon: '⚡', bg: 'bg-blue-50' },
                    { title: 'Documents 100% sécurisés', desc: 'Vos documents sont chiffrés et accessibles uniquement à notre équipe.', icon: '🔒', bg: 'bg-gray-50' },
                  ].map((f) => (
                    <div key={f.title} className="flex items-start gap-4">
                      <div className={`w-11 h-11 ${f.bg} rounded-xl flex items-center justify-center text-xl flex-shrink-0`}>{f.icon}</div>
                      <div>
                        <p className="font-bold text-[#1a3a6b] text-sm">{f.title}</p>
                        <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{f.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── TESTIMONIALS ─────────────────────────────────────────── */}
        <section className="py-24 px-4 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <span className="text-[#3d9e3d] text-xs font-bold uppercase tracking-widest">Témoignages</span>
              <h2 className="text-3xl font-extrabold text-[#1a3a6b] mt-3">Ce que disent nos clients</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { name: 'Aminata K.', city: 'Yaoundé — Zone A', photo: '/woman.png', text: "J'ai trouvé ma Toyota Corolla en moins d'une semaine et obtenu mon financement en 3 jours. Le processus est vraiment transparent et l'équipe très professionnelle." },
                { name: 'Eric M.', city: 'Douala — Zone A', photo: '/man.png', text: "En tant que vendeur, MotoPayee m'a permis de vendre ma voiture au juste prix grâce à leur estimation de marché. Je recommande à tous les vendeurs." },
              ].map((t) => (
                <div key={t.name} className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
                  <div className="flex gap-1 mb-5">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="w-5 h-5 text-[#f5a623]" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed mb-6 italic">&ldquo;{t.text}&rdquo;</p>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                      <Image src={t.photo} alt={t.name} width={48} height={48} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="font-bold text-[#1a3a6b] text-sm">{t.name}</p>
                      <p className="text-xs text-gray-400">{t.city}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── FINAL CTA ────────────────────────────────────────────── */}
        <section className="relative bg-[#1a3a6b] overflow-hidden py-24 px-4">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[#3d9e3d]/15 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-[#f5a623]/10 blur-3xl" />
          <div className="relative z-10 max-w-3xl mx-auto text-center">
            <span className="text-[#3d9e3d] text-xs font-bold uppercase tracking-widest">Rejoignez-nous</span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mt-4 mb-5 leading-tight">Prêt à conduire<br />votre futur ?</h2>
            <p className="text-blue-200 text-lg mb-10 max-w-xl mx-auto">Rejoignez des milliers de Camerounais qui ont trouvé leur véhicule et leur financement sur MotoPayee.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/apply" className="inline-flex items-center justify-center gap-2 bg-[#3d9e3d] text-white font-bold px-8 py-4 rounded-xl hover:bg-[#2d8a2d] transition shadow-lg text-base">
                Financer un véhicule
              </Link>
              <Link href="/sell" className="inline-flex items-center justify-center gap-2 bg-white text-[#1a3a6b] font-bold px-8 py-4 rounded-xl hover:bg-gray-50 transition shadow-lg text-base">
                Vendre un véhicule
              </Link>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}

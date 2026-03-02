import Link from 'next/link';
import Image from 'next/image';
import Navbar from './(components)/Navbar';
import Footer from './(components)/Footer';

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>

        {/* ─── HERO ─────────────────────────────────────────────────── */}
        <section className="relative bg-[#0d1f3c] overflow-hidden min-h-[90vh] flex items-center">
          {/* Gradient overlay — left bright, right transparent to reveal image */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0d1f3c] via-[#0d1f3c]/80 to-[#0d1f3c]/20 z-10" />

          {/* Car image — full bleed right side */}
          <div className="absolute inset-0 z-0">
            <Image
              src="/car-hero.png"
              alt="MotoPayee Vehicle"
              fill
              className="object-cover object-right"
              priority
            />
          </div>

          {/* Hero content */}
          <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-28 w-full">
            <div className="max-w-2xl">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-[#3d9e3d]/20 border border-[#3d9e3d]/40 rounded-full px-4 py-1.5 mb-8">
                <span className="w-2 h-2 rounded-full bg-[#3d9e3d] animate-pulse" />
                <span className="text-[#3d9e3d] text-xs font-bold tracking-widest uppercase">Marketplace #1 au Cameroun</span>
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-white leading-[1.05] mb-6">
                Votre voiture,{' '}
                <span className="text-[#3d9e3d]">financée</span>{' '}
                simplement.
              </h1>

              <p className="text-blue-200 text-lg md:text-xl leading-relaxed mb-10 max-w-xl">
                MotoPayee connecte acheteurs, vendeurs et microfinanciers pour rendre
                l&apos;accès au véhicule simple, transparent et accessible partout au Cameroun.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/listings"
                  className="inline-flex items-center justify-center gap-2 bg-[#3d9e3d] text-white font-bold px-8 py-4 rounded-xl hover:bg-[#2d8a2d] transition-all shadow-lg shadow-green-900/30 text-base"
                >
                  Parcourir les véhicules
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
                <Link
                  href="/apply"
                  className="inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur border border-white/25 text-white font-bold px-8 py-4 rounded-xl hover:bg-white/20 transition-all text-base"
                >
                  Demander un financement
                </Link>
              </div>

              {/* Trust signals */}
              <div className="flex items-center gap-6 mt-10">
                <div className="flex -space-x-2">
                  <div className="w-9 h-9 rounded-full border-2 border-[#0d1f3c] overflow-hidden bg-[#1a3a6b]">
                    <Image src="/woman.png" alt="Client" width={36} height={36} className="w-full h-full object-cover" />
                  </div>
                  <div className="w-9 h-9 rounded-full border-2 border-[#0d1f3c] overflow-hidden bg-[#1a3a6b]">
                    <Image src="/man.png" alt="Client" width={36} height={36} className="w-full h-full object-cover" />
                  </div>
                  <div className="w-9 h-9 rounded-full border-2 border-[#0d1f3c] bg-[#3d9e3d] flex items-center justify-center text-xs font-bold text-white">+</div>
                </div>
                <p className="text-blue-300 text-sm">
                  <span className="text-white font-semibold">1 200+</span> clients satisfaits
                </p>
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-4 h-4 text-[#f5a623]" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── STATS BAR ────────────────────────────────────────────── */}
        <section className="bg-[#1a3a6b] py-8">
          <div className="max-w-6xl mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              {[
                { value: '500+', label: 'Véhicules disponibles' },
                { value: '1 200+', label: 'Demandes traitées' },
                { value: '3', label: 'Zones couvertes' },
                { value: '72%', label: "Taux d'approbation" },
              ].map((stat) => (
                <div key={stat.label} className="py-2">
                  <p className="text-3xl font-extrabold text-[#f5a623]">{stat.value}</p>
                  <p className="text-xs text-blue-300 mt-1 font-medium">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── HOW IT WORKS ─────────────────────────────────────────── */}
        <section className="py-24 px-4 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <span className="text-[#3d9e3d] text-xs font-bold uppercase tracking-widest">Processus</span>
              <h2 className="text-3xl md:text-4xl font-extrabold text-[#1a3a6b] mt-3 mb-4">Comment ça marche</h2>
              <p className="text-gray-500 max-w-lg mx-auto text-sm">
                Du choix du véhicule à l&apos;obtention du financement — un parcours guidé et transparent
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  step: '01',
                  title: 'Trouvez votre véhicule',
                  desc: "Parcourez nos annonces vérifiées avec photos, rapport d'inspection et prix évalués par des experts.",
                  color: 'bg-[#3d9e3d]',
                  light: 'bg-[#f0faf0]',
                  icon: (
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  ),
                },
                {
                  step: '02',
                  title: "Vérifiez l'éligibilité",
                  desc: 'Notre système calcule automatiquement votre éligibilité selon votre zone géographique et votre profil financier.',
                  color: 'bg-[#f5a623]',
                  light: 'bg-amber-50',
                  icon: (
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  ),
                },
                {
                  step: '03',
                  title: 'Obtenez le financement',
                  desc: 'Déposez vos documents, notre équipe les traite rapidement pour vous connecter à une IMF partenaire.',
                  color: 'bg-[#1a3a6b]',
                  light: 'bg-blue-50',
                  icon: (
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ),
                },
              ].map((item, idx) => (
                <div key={item.step} className="relative bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  {/* Step connector dot */}
                  {idx < 2 && (
                    <div className="hidden md:block absolute top-14 -right-4 z-10">
                      <svg className="w-8 h-8 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  )}
                  <div className={`w-14 h-14 ${item.color} rounded-2xl flex items-center justify-center text-white mb-6`}>
                    {item.icon}
                  </div>
                  <span className="text-xs font-bold tracking-widest text-gray-400 uppercase">Étape {item.step}</span>
                  <h3 className="text-lg font-bold text-[#1a3a6b] mt-2 mb-3">{item.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── WHY MOTOPAYEE (Team photo + features) ────────────────── */}
        <section className="py-24 px-4 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              {/* Team photo */}
              <div className="relative order-2 lg:order-1">
                <div className="relative rounded-3xl overflow-hidden shadow-2xl aspect-[4/3]">
                  <Image src="/team.png" alt="Équipe MotoPayee" fill className="object-cover" />
                </div>
                {/* Floating stat card */}
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
                {/* Floating brand badge */}
                <div className="absolute -top-5 -left-5 bg-[#1a3a6b] rounded-2xl shadow-xl px-4 py-3">
                  <p className="text-[#f5a623] text-xs font-bold uppercase tracking-wide">Depuis 2024</p>
                  <p className="text-white text-sm font-bold">MotoPayee</p>
                </div>
              </div>

              {/* Features */}
              <div className="order-1 lg:order-2">
                <span className="text-[#3d9e3d] text-xs font-bold uppercase tracking-widest">Pourquoi nous choisir</span>
                <h2 className="text-3xl md:text-4xl font-extrabold text-[#1a3a6b] mt-3 mb-5">
                  La confiance au cœur<br />de chaque transaction
                </h2>
                <p className="text-gray-500 mb-8 leading-relaxed">
                  Notre équipe de professionnels certifiés assure que chaque véhicule est inspecté,
                  chaque document vérifié et chaque dossier traité avec rigueur et rapidité.
                </p>

                <div className="space-y-5">
                  {[
                    {
                      title: 'Inspection professionnelle',
                      desc: 'Chaque véhicule est inspecté par nos agents certifiés avec rapport en 12 points.',
                      icon: '🔍',
                      bg: 'bg-[#f0faf0]',
                    },
                    {
                      title: 'Prix de marché transparent',
                      desc: "Estimation MVE fournie pour chaque annonce — vous savez exactement ce que vous payez.",
                      icon: '📊',
                      bg: 'bg-amber-50',
                    },
                    {
                      title: 'Financement sous 72h',
                      desc: 'Traitement express des dossiers avec nos institutions de microfinance partenaires.',
                      icon: '⚡',
                      bg: 'bg-blue-50',
                    },
                    {
                      title: 'Documents 100% sécurisés',
                      desc: 'Vos documents sont chiffrés et accessibles uniquement à notre équipe vérifiée.',
                      icon: '🔒',
                      bg: 'bg-gray-50',
                    },
                  ].map((f) => (
                    <div key={f.title} className="flex items-start gap-4">
                      <div className={`w-11 h-11 ${f.bg} rounded-xl flex items-center justify-center text-xl flex-shrink-0`}>
                        {f.icon}
                      </div>
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
        <section className="py-24 px-4 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <span className="text-[#3d9e3d] text-xs font-bold uppercase tracking-widest">Témoignages</span>
              <h2 className="text-3xl font-extrabold text-[#1a3a6b] mt-3">Ce que disent nos clients</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  name: 'Aminata K.',
                  city: 'Yaoundé — Zone A',
                  photo: '/woman.png',
                  text: "J'ai trouvé ma Toyota Corolla en moins d'une semaine et obtenu mon financement en 3 jours. Le processus est vraiment transparent et l'équipe très professionnelle.",
                  rating: 5,
                },
                {
                  name: 'Eric M.',
                  city: 'Douala — Zone A',
                  photo: '/man.png',
                  text: "En tant que vendeur, MotoPayee m'a permis de vendre ma voiture au juste prix grâce à leur estimation de marché. Je recommande à tous les vendeurs.",
                  rating: 5,
                },
              ].map((t) => (
                <div key={t.name} className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                  <div className="flex gap-1 mb-5">
                    {[...Array(t.rating)].map((_, i) => (
                      <svg key={i} className="w-5 h-5 text-[#f5a623]" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed mb-6 italic">&ldquo;{t.text}&rdquo;</p>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
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
          {/* Decorative blobs */}
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[#3d9e3d]/15 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-[#f5a623]/10 blur-3xl" />

          <div className="relative z-10 max-w-3xl mx-auto text-center">
            <span className="text-[#3d9e3d] text-xs font-bold uppercase tracking-widest">Rejoignez-nous</span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mt-4 mb-5 leading-tight">
              Prêt à conduire<br />votre futur ?
            </h2>
            <p className="text-blue-200 text-lg mb-10 max-w-xl mx-auto">
              Rejoignez des milliers de Camerounais qui ont trouvé leur véhicule et leur financement sur MotoPayee.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/apply"
                className="inline-flex items-center justify-center gap-2 bg-[#3d9e3d] text-white font-bold px-8 py-4 rounded-xl hover:bg-[#2d8a2d] transition-all shadow-lg shadow-green-900/30 text-base"
              >
                Financer un véhicule
              </Link>
              <Link
                href="/sell"
                className="inline-flex items-center justify-center gap-2 bg-white text-[#1a3a6b] font-bold px-8 py-4 rounded-xl hover:bg-gray-50 transition-all shadow-lg text-base"
              >
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

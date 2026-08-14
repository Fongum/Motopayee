import Link from 'next/link';
import Navbar from '../(components)/Navbar';
import Footer from '../(components)/Footer';
import LeadCaptureForm from '../(components)/LeadCaptureForm';
import { campaignNameFromSearch, leadSourceFromSearch, type AcquisitionSearchParams } from '@/lib/campaigns';

export default function ApplyPage({
  searchParams,
}: {
  searchParams?: AcquisitionSearchParams;
}) {
  const campaignName = campaignNameFromSearch(searchParams, 'Buyer finance page');
  const source = leadSourceFromSearch(searchParams);

  return (
    <>
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-[#1a3a6b] mb-4">Financez votre véhicule</h1>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            MotoPayee facilite votre accès au crédit véhicule via des institutions de microfinance partenaires.
          </p>
        </div>

        {/* Eligibility factors */}
        <div className="bg-white border border-gray-200 rounded-2xl p-8 mb-10">
          <h2 className="text-xl font-bold text-[#1a3a6b] mb-6">Comment est calculée l&apos;éligibilité ?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              {
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" />,
                title: 'Votre zone géographique',
                desc: 'Zone A (Douala/Yaoundé), Zone B (villes secondaires) ou Zone C (zones rurales).',
              },
              {
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
                title: 'Votre classe de revenus',
                desc: 'De A (revenus élevés) à D (revenus modestes). Évalué par notre équipe.',
              },
              {
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13l2-5a2 2 0 011.9-1.4h10.2A2 2 0 0119 8l2 5m-18 0v5a1 1 0 001 1h1a1 1 0 001-1v-1h12v1a1 1 0 001 1h1a1 1 0 001-1v-5m-18 0h18M7 16h.01M17 16h.01" />,
                title: "L'état du véhicule",
                desc: 'Grade A (excellent) à D (à réparer). Déterminé par notre inspecteur certifié.',
              },
              {
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />,
                title: 'La bande de prix',
                desc: 'Vert (prix juste), jaune (légèrement surévalué) ou rouge (trop cher).',
              },
            ].map((item) => (
              <div key={item.title} className="flex gap-4">
                <span className="w-10 h-10 rounded-xl bg-[#3d9e3d]/10 text-[#3d9e3d] flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">{item.icon}</svg>
                </span>
                <div>
                  <p className="font-semibold text-[#1a3a6b] text-sm mb-1">{item.title}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-4 mb-12">
          <h2 className="text-xl font-bold text-[#1a3a6b] mb-4">Comment ça marche</h2>
          {[
            {
              num: 1,
              title: 'Créez un compte acheteur',
              desc: 'Renseignez votre email, téléphone et ville. Gratuit et rapide.',
            },
            {
              num: 2,
              title: 'Choisissez un véhicule',
              desc: 'Parcourez les véhicules marqués "finançable" et cliquez sur "Demander un financement".',
            },
            {
              num: 3,
              title: 'Déposez vos documents',
              desc: "CNI/Passeport, justificatif de revenus, relevé bancaire des 3 derniers mois.",
            },
            {
              num: 4,
              title: 'Décision sous 5 jours ouvrés',
              desc: 'Notre équipe analyse votre dossier et vous communique la décision via l\'application.',
            },
          ].map((item) => (
            <div key={item.num} className="flex gap-4 items-start bg-gray-50 rounded-xl p-4 border border-gray-100">
              <div className="w-8 h-8 rounded-full bg-[#3d9e3d] text-white font-bold flex items-center justify-center flex-shrink-0 text-sm">
                {item.num}
              </div>
              <div>
                <p className="font-semibold text-[#1a3a6b] text-sm">{item.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/register?role=buyer"
            className="bg-[#3d9e3d] text-white font-semibold px-8 py-3 rounded-xl hover:bg-[#2d8a2d] transition shadow-sm text-center"
          >
            Créer mon compte acheteur
          </Link>
          <Link
            href="/listings"
            className="border border-gray-300 text-gray-700 font-semibold px-8 py-3 rounded-xl hover:bg-gray-50 text-center"
          >
            Voir les véhicules disponibles
          </Link>
        </div>
        <div className="mt-10 bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-[#1a3a6b] mb-2">Vous cherchez un financement?</h2>
          <p className="text-sm text-gray-500 mb-6">
            Laissez vos informations si vous voulez que MotoPayee vous aide a trouver un vehicule financeable et un partenaire IMF.
          </p>
          <LeadCaptureForm
            leadType="buyer"
            source={source}
            campaignName={campaignName}
            defaultInterest="Je cherche un vehicule financeable avec un partenaire MotoPayee."
          />
        </div>
      </main>
      <Footer />
    </>
  );
}

import Link from 'next/link';
import Navbar from '../(components)/Navbar';
import Footer from '../(components)/Footer';
import LeadCaptureForm from '../(components)/LeadCaptureForm';
import { campaignNameFromSearch, leadSourceFromSearch, type AcquisitionSearchParams } from '@/lib/campaigns';

export default function SellPage({
  searchParams,
}: {
  searchParams?: AcquisitionSearchParams;
}) {
  const campaignName = campaignNameFromSearch(searchParams, 'Sell page');
  const source = leadSourceFromSearch(searchParams);

  return (
    <>
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-[#1a3a6b] mb-4">Vendez votre véhicule</h1>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Particulier ou concessionnaire — nous vous accompagnons de la mise en ligne à la vente.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {/* Individual */}
          <div className="border-2 border-[#3d9e3d]/30 rounded-2xl p-8 hover:border-[#3d9e3d] hover:shadow-card-hover transition">
            <div className="w-12 h-12 rounded-xl bg-[#3d9e3d]/10 text-[#3d9e3d] flex items-center justify-center mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-[#1a3a6b] mb-3">Vendeur particulier</h2>
            <p className="text-gray-500 text-sm mb-6">
              Vous vendez votre propre véhicule. Créez une annonce, soumettez les documents
              de propriété et notre équipe s&apos;occupe de la vérification et de l&apos;inspection.
            </p>
            <ul className="space-y-2 text-sm text-gray-600 mb-8">
              {[
                'Mise en ligne gratuite',
                'Inspection à domicile',
                'Évaluation du prix par experts',
                'Visible par tous les acheteurs financés',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> {item}
                </li>
              ))}
            </ul>
            <Link
              href="/register?role=seller_individual"
              className="block w-full text-center bg-[#3d9e3d] text-white font-semibold py-3 rounded-xl hover:bg-[#2d8a2d] transition shadow-sm"
            >
              Créer un compte vendeur
            </Link>
          </div>

          {/* Dealer */}
          <div className="border-2 border-gray-200 rounded-2xl p-8 hover:border-[#1a3a6b]/40 hover:shadow-card-hover transition">
            <div className="w-12 h-12 rounded-xl bg-[#1a3a6b]/10 text-[#1a3a6b] flex items-center justify-center mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2M5 21H3m6-14h.01M13 7h.01M9 11h.01M13 11h.01M9 15h.01M13 15h.01" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-[#1a3a6b] mb-3">Concessionnaire</h2>
            <p className="text-gray-500 text-sm mb-6">
              Vous êtes un garage ou un négociant professionnel. Profitez de fonctionnalités
              avancées pour gérer plusieurs annonces et accéder aux acheteurs financés.
            </p>
            <ul className="space-y-2 text-sm text-gray-600 mb-8">
              {[
                'Compte multi-annonces',
                'Code concessionnaire dédié',
                'Tableau de bord avancé',
                'Priorité dans les résultats',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> {item}
                </li>
              ))}
            </ul>
            <Link
              href="/dealers"
              className="block w-full text-center border border-gray-300 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-50"
            >
              En savoir plus sur les concessions
            </Link>
          </div>
        </div>

        {/* Process */}
        <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200">
          <h2 className="text-xl font-bold text-[#1a3a6b] mb-6 text-center">Le processus de vente</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { step: 1, label: 'Créez votre annonce', desc: 'Renseignez les infos du véhicule et votre prix demandé.' },
              { step: 2, label: 'Soumettez les docs', desc: 'Téléchargez le titre de propriété et la CIE/passeport.' },
              { step: 3, label: 'Inspection sur place', desc: 'Un inspecteur visite le véhicule et produit un rapport.' },
              { step: 4, label: 'Publication & vente', desc: 'Votre annonce est publiée et accessible aux acheteurs.' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-10 h-10 rounded-full bg-[#3d9e3d] text-white font-bold flex items-center justify-center mx-auto mb-3">
                  {item.step}
                </div>
                <p className="font-semibold text-gray-800 text-sm mb-1">{item.label}</p>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 bg-white rounded-2xl p-6 border border-gray-200">
          <h2 className="text-xl font-bold text-[#1a3a6b] mb-2">Vous voulez que MotoPayee vous contacte?</h2>
          <p className="text-sm text-gray-500 mb-6">
            Si vous preferez parler avec notre equipe avant de creer un compte, laissez vos informations.
          </p>
          <LeadCaptureForm
            leadType="seller"
            source={source}
            campaignName={campaignName}
            defaultInterest="Je veux vendre mon vehicule sur MotoPayee."
          />
        </div>
      </main>
      <Footer />
    </>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '../(components)/Navbar';
import Footer from '../(components)/Footer';
import LeadCaptureForm from '../(components)/LeadCaptureForm';
import { campaignNameFromSearch, leadSourceFromSearch, type AcquisitionSearchParams } from '@/lib/campaigns';

export const metadata: Metadata = {
  title: 'Enregistrer un véhicule en location — MotoPayee',
  description: 'Enregistrez votre voiture, SUV, van, bus, camion, véhicule avec chauffeur ou véhicule événementiel pour une location vérifiée via MotoPayee Cameroun.',
  openGraph: {
    title: 'Enregistrer un véhicule en location avec MotoPayee',
    description: 'MotoPayee intègre des véhicules de location vérifiés partout au Cameroun.',
    type: 'website',
  },
};

const RENTAL_TYPES = [
  'Voitures particulières et SUV',
  'Véhicules avec chauffeur',
  'Vans, bus et camions',
  'Véhicules mariage et événementiel',
  'Locations entreprise et voyage',
];

const REQUIREMENTS = [
  'Propriétaire ou contact professionnel confirmé',
  'Photos et localisation du véhicule fournies',
  'Tarif journalier et caution confirmés',
  'Statut d\'assurance et mode de location renseignés',
  'Sans chauffeur, avec chauffeur ou les deux clairement indiqué',
];

const PROCESS = [
  { step: '1', title: 'Envoyer les détails', text: 'Envoyez les coordonnées du propriétaire, le type de véhicule, la ville, les tarifs, la caution, la disponibilité et les photos.' },
  { step: '2', title: 'Revue MotoPayee', text: 'Notre équipe vérifie le propriétaire, les informations du véhicule, les tarifs, les conditions de caution et les règles de location de base.' },
  { step: '3', title: 'Publication de la location vérifiée', text: 'Les véhicules approuvés peuvent apparaître sur MotoPayee avec des conditions claires et une gestion des demandes de location.' },
  { step: '4', title: 'Recevoir des réservations', text: 'Les paiements de réservation sont suivis via MotoPayee, avec une commission de lancement à partir de 10%.' },
];

export default function RentalPartnersPage({
  searchParams,
}: {
  searchParams?: AcquisitionSearchParams;
}) {
  const campaignName = campaignNameFromSearch(searchParams, 'Rental partner page');
  const source = leadSourceFromSearch(searchParams);

  return (
    <>
      <Navbar />
      <main className="bg-white">
        <section className="bg-brand-navy-dark px-4 py-16 text-white sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_420px] lg:items-center">
            <div>
              <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-blue-100">
                Programme partenaire location
              </span>
              <h1 className="mt-5 text-4xl font-extrabold leading-tight sm:text-5xl">
                Rentabilisez votre véhicule avec la location vérifiée MotoPayee.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-blue-100">
                MotoPayee intègre des propriétaires, sociétés de location, véhicules avec chauffeur, vans, bus, camions et véhicules événementiels partout au Cameroun.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#rental-form" className="rounded-xl bg-brand-green px-6 py-3 text-sm font-bold text-white hover:bg-brand-green-dark">
                  Enregistrer un véhicule
                </a>
                <Link href="/hire" className="rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10">
                  Voir les locations
                </Link>
              </div>
            </div>

            <div id="rental-form" className="rounded-2xl border border-white/10 bg-white p-6 text-gray-900 shadow-2xl">
              <h2 className="text-xl font-bold text-brand-navy">Demander l&apos;intégration</h2>
              <p className="mt-2 text-sm text-gray-500">
                Laissez vos coordonnées et MotoPayee vous contactera pour les photos du véhicule, les tarifs, la caution, la disponibilité et la vérification.
              </p>
              <div className="mt-5">
                <LeadCaptureForm
                  leadType="rental_owner"
                  source={source}
                  campaignName={campaignName}
                  defaultInterest="Je veux enregistrer un véhicule en location sur MotoPayee."
                />
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-8 lg:grid-cols-2">
              <div>
                <span className="text-xs font-bold uppercase tracking-[0.22em] text-brand-green">Véhicules acceptés</span>
                <h2 className="mt-3 text-3xl font-extrabold text-brand-navy">Catégories de location que MotoPayee peut intégrer</h2>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {RENTAL_TYPES.map((item) => (
                    <div key={item} className="rounded-xl border border-gray-200 bg-white p-4 text-sm font-semibold text-gray-800">
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6">
                <h2 className="text-xl font-bold text-brand-navy">Avant la mise en ligne d&apos;une location</h2>
                <div className="mt-5 space-y-3">
                  {REQUIREMENTS.map((item) => (
                    <div key={item} className="flex gap-3 rounded-xl bg-white p-3 text-sm text-gray-700">
                      <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-brand-green" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-gray-50 px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8">
              <span className="text-xs font-bold uppercase tracking-[0.22em] text-brand-green">Comment ça marche</span>
              <h2 className="mt-3 text-3xl font-extrabold text-brand-navy">Intégration simple, conditions de location claires</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {PROCESS.map((item) => (
                <div key={item.step} className="rounded-2xl border border-gray-200 bg-white p-5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-navy text-sm font-bold text-white">
                    {item.step}
                  </span>
                  <h3 className="mt-4 font-bold text-gray-900">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-500">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl rounded-2xl border border-blue-100 bg-blue-50 p-8 text-center">
            <h2 className="text-2xl font-extrabold text-brand-navy">Conditions commerciales de lancement</h2>
            <p className="mt-3 text-sm leading-7 text-blue-900">
              La commission de réservation démarre à 10% de la valeur de la réservation. Le propriétaire du véhicule conserve la caution sauf accord distinct confirmé par MotoPayee.
            </p>
            <a href="#rental-form" className="mt-6 inline-flex rounded-xl bg-brand-green px-6 py-3 text-sm font-bold text-white hover:bg-brand-green-dark">
              Enregistrer maintenant
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

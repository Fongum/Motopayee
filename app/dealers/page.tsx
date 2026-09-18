import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '../(components)/Navbar';
import Footer from '../(components)/Footer';
import LeadCaptureForm from '../(components)/LeadCaptureForm';
import { campaignNameFromSearch, leadSourceFromSearch, type AcquisitionSearchParams } from '@/lib/campaigns';

export const metadata: Metadata = {
  title: 'Programme pilote concessionnaires — MotoPayee',
  description: 'Rejoignez le programme pilote gratuit de 6 mois pour concessionnaires MotoPayee : inventaire revu, acheteurs qualifiés et opportunités de financement partout au Cameroun.',
};

const DEALER_BENEFITS = [
  {
    title: 'Pilote gratuit de 6 mois',
    text: 'Les concessionnaires sélectionnés peuvent rejoindre le programme sans frais mensuels pendant le lancement.',
  },
  {
    title: 'Mise en forme de l\'inventaire',
    text: 'MotoPayee aide à structurer les détails du véhicule, les photos, le prix et la préparation de l\'annonce.',
  },
  {
    title: 'Redirection des acheteurs',
    text: 'Les demandes générées par MotoPayee sont suivies pour que les prospects sérieux ne soient jamais perdus.',
  },
  {
    title: 'Revue des candidats au financement',
    text: 'Les véhicules qui correspondent aux critères partenaires peuvent être marqués pour une demande de financement.',
  },
];

const DEALER_RULES = [
  'Fournir des prix exacts et des détails de véhicule à jour.',
  'Envoyer des photos utilisables et mettre à jour rapidement les véhicules vendus ou indisponibles.',
  'Répondre rapidement aux prospects générés par MotoPayee.',
  'Éviter les fausses mentions "finançable" sauf si MotoPayee a marqué le véhicule éligible.',
  'Traiter les prospects générés par MotoPayee via MotoPayee pendant le pilote.',
];

const PROCESS = [
  { step: '1', title: 'Postuler au pilote', text: 'Envoyez le nom du concessionnaire, la personne de contact, la ville, la taille de l\'inventaire et les catégories de véhicules.' },
  { step: '2', title: 'Accepter les règles du pilote', text: 'MotoPayee confirme le traitement des prospects, les labels de confiance, la qualité des annonces et les règles d\'éligibilité au financement.' },
  { step: '3', title: 'Soumettre le premier lot', text: 'Commencez avec 5 à 10 véhicules dont le prix, les photos, la ville et la disponibilité sont confirmés.' },
  { step: '4', title: 'Suivre les prospects', text: 'MotoPayee redirige les demandes, effectue le suivi et évalue la qualité des prospects du concessionnaire pendant le pilote.' },
];

export default function DealersPage({
  searchParams,
}: {
  searchParams?: AcquisitionSearchParams;
}) {
  const campaignName = campaignNameFromSearch(searchParams, 'Dealer pilot page');
  const source = leadSourceFromSearch(searchParams);

  return (
    <>
      <Navbar />
      <main className="bg-white">
        <section className="bg-brand-navy-dark px-4 py-16 text-white sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_420px] lg:items-center">
            <div>
              <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-blue-100">
                Pilote concessionnaire gratuit
              </span>
              <h1 className="mt-5 text-4xl font-extrabold leading-tight sm:text-5xl">
                Rejoignez MotoPayee comme concessionnaire partenaire de lancement.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-blue-100">
                MotoPayee sélectionne des concessionnaires partout au Cameroun pour un pilote gratuit de 6 mois axé sur un inventaire de confiance, des acheteurs qualifiés et des opportunités de financement.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#dealer-form" className="rounded-xl bg-brand-green px-6 py-3 text-sm font-bold text-white hover:bg-brand-green-dark">
                  Demander un appel pilote
                </a>
                <Link href="/listings" className="rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10">
                  Voir la marketplace
                </Link>
              </div>
            </div>

            <div id="dealer-form" className="rounded-2xl border border-white/10 bg-white p-6 text-gray-900 shadow-2xl">
              <h2 className="text-xl font-bold text-brand-navy">Demander l&apos;intégration concessionnaire</h2>
              <p className="mt-2 text-sm text-gray-500">
                Laissez vos coordonnées et MotoPayee vous contactera pour examiner l&apos;inventaire, les conditions du pilote et les prochaines étapes.
              </p>
              <div className="mt-5">
                <LeadCaptureForm
                  leadType="dealer"
                  source={source}
                  campaignName={campaignName}
                  defaultInterest="Je veux rejoindre le pilote gratuit concessionnaire MotoPayee."
                />
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8">
              <span className="text-xs font-bold uppercase tracking-[0.22em] text-brand-green">Valeur du pilote</span>
              <h2 className="mt-3 text-3xl font-extrabold text-brand-navy">Ce que reçoivent les concessionnaires sélectionnés</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {DEALER_BENEFITS.map((item) => (
                <div key={item.title} className="rounded-2xl border border-gray-200 bg-white p-5">
                  <h3 className="font-bold text-gray-900">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-500">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-gray-50 px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="text-xl font-bold text-brand-navy">Responsabilités du concessionnaire</h2>
              <div className="mt-5 space-y-3">
                {DEALER_RULES.map((item) => (
                  <div key={item} className="flex gap-3 rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
                    <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-brand-green" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-6">
              <h2 className="text-xl font-bold text-brand-navy">Objectifs du pilote</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {[
                  ['3-5', 'Concessionnaires pilotes'],
                  ['5-10', 'Véhicules pour le premier lot'],
                  ['5-10', 'Candidats au financement'],
                  ['6 mois', 'Période pilote gratuite'],
                ].map(([value, label]) => (
                  <div key={label} className="rounded-xl bg-white p-4">
                    <p className="text-2xl font-extrabold text-brand-navy">{value}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8">
              <span className="text-xs font-bold uppercase tracking-[0.22em] text-brand-green">Processus</span>
              <h2 className="mt-3 text-3xl font-extrabold text-brand-navy">Du premier appel au pilote actif</h2>
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
      </main>
      <Footer />
    </>
  );
}

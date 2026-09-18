import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '../(components)/Navbar';
import Footer from '../(components)/Footer';
import LeadCaptureForm from '../(components)/LeadCaptureForm';
import { campaignNameFromSearch, leadSourceFromSearch, type AcquisitionSearchParams } from '@/lib/campaigns';

export const metadata: Metadata = {
  title: 'Inspection véhicule — MotoPayee',
  description: "Demandez une inspection de véhicule MotoPayee au Cameroun. Options pour acheteur, vendeur, partenaire financier et propriétaire en location.",
  openGraph: {
    title: 'Inspection véhicule MotoPayee',
    description: "Les demandes d'inspection démarrent autour de 15 000 XAF et aident acheteurs, vendeurs, partenaires financiers et propriétaires en location à réduire le risque transactionnel.",
    type: 'website',
  },
};

const INSPECTION_TYPES = [
  {
    title: "Inspection à la demande de l'acheteur",
    text: "Pour les acheteurs qui souhaitent une vérification de l'état du véhicule par MotoPayee avant de payer ou de se déplacer pour le voir.",
  },
  {
    title: 'Forfait inspection vendeur',
    text: 'Pour les vendeurs qui veulent renforcer les signaux de confiance avant de publier ou promouvoir une annonce.',
  },
  {
    title: 'Vérification financement',
    text: "Pour les véhicules envisagés pour un financement partenaire et une revue d'éligibilité.",
  },
  {
    title: 'Vérification location',
    text: "Pour les propriétaires avant qu'un véhicule ne soit publié comme location vérifiée.",
  },
];

const CHECKS = [
  "Contrôle de l'état extérieur et intérieur",
  'Relevé du kilométrage/compteur si disponible',
  'Notes sur les défauts visibles et résumé de l\'état',
  'Vérification de la localisation et de l\'identité du véhicule',
  "Date d'inspection et rapport de l'agent",
  'Recommandation de label de confiance public si pertinent',
];

const LIMITS = [
  "L'inspection réduit le risque mais ne l'élimine pas totalement.",
  "Ce n'est pas un diagnostic mécanique complet en atelier, sauf organisation séparée.",
  "MotoPayee ne garantit ni l'approbation du financement ni la performance future du véhicule.",
];

export default function InspectionPage({
  searchParams,
}: {
  searchParams?: AcquisitionSearchParams;
}) {
  const campaignName = campaignNameFromSearch(searchParams, 'Inspection page');
  const source = leadSourceFromSearch(searchParams);

  return (
    <>
      <Navbar />
      <main className="bg-white">
        <section className="bg-brand-navy-dark px-4 py-16 text-white sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_420px] lg:items-center">
            <div>
              <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-blue-100">
                Inspection MotoPayee
              </span>
              <h1 className="mt-5 text-4xl font-extrabold leading-tight sm:text-5xl">
                Demandez une inspection avant la prochaine étape.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-blue-100">
                Les inspections MotoPayee aident acheteurs, vendeurs, propriétaires en location et partenaires financiers à mieux décider grâce à un résumé structuré de l&apos;état du véhicule.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#inspection-form" className="rounded-xl bg-brand-green px-6 py-3 text-sm font-bold text-white hover:bg-brand-green-dark">
                  Demander une inspection
                </a>
                <Link href="/listings" className="rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10">
                  Voir les annonces
                </Link>
              </div>
            </div>

            <div id="inspection-form" className="rounded-2xl border border-white/10 bg-white p-6 text-gray-900 shadow-2xl">
              <h2 className="text-xl font-bold text-brand-navy">Suivi de la demande</h2>
              <p className="mt-2 text-sm text-gray-500">
                Laissez vos coordonnées et MotoPayee confirmera le véhicule, le lieu, le tarif et le rendez-vous.
              </p>
              <div className="mt-5 rounded-xl border border-green-100 bg-green-50 p-4">
                <p className="text-sm font-bold text-green-800">Tarif de départ : 15 000 XAF</p>
                <p className="mt-1 text-xs leading-6 text-green-700">
                  Le prix final peut varier selon la ville, la distance, la profondeur du contrôle et le besoin d&apos;un diagnostic en atelier.
                </p>
              </div>
              <div className="mt-5">
                <LeadCaptureForm
                  leadType="inspection"
                  source={source}
                  campaignName={campaignName}
                  defaultInterest="Je veux une inspection de véhicule MotoPayee."
                />
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8">
              <span className="text-xs font-bold uppercase tracking-[0.22em] text-brand-green">Options d&apos;inspection</span>
              <h2 className="mt-3 text-3xl font-extrabold text-brand-navy">Une offre d&apos;inspection, plusieurs usages</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {INSPECTION_TYPES.map((item) => (
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
              <h2 className="text-xl font-bold text-brand-navy">Ce que MotoPayee contrôle</h2>
              <div className="mt-5 space-y-3">
                {CHECKS.map((item) => (
                  <div key={item} className="flex gap-3 rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
                    <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-brand-green" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
              <h2 className="text-xl font-bold text-amber-950">Limites claires</h2>
              <div className="mt-5 space-y-3">
                {LIMITS.map((item) => (
                  <div key={item} className="flex gap-3 rounded-xl bg-white p-3 text-sm text-amber-900">
                    <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-brand-amber" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl rounded-2xl border border-blue-100 bg-blue-50 p-8 text-center">
            <h2 className="text-2xl font-extrabold text-brand-navy">Vous consultez déjà une annonce MotoPayee ?</h2>
            <p className="mt-3 text-sm leading-7 text-blue-900">
              Ouvrez l&apos;annonce et utilisez le formulaire d&apos;inspection qui s&apos;y trouve afin que MotoPayee rattache la demande directement au véhicule.
            </p>
            <Link href="/listings" className="mt-6 inline-flex rounded-xl bg-brand-navy px-6 py-3 text-sm font-bold text-white hover:bg-brand-navy-dark">
              Trouver l&apos;annonce
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

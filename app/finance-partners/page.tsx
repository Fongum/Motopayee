import type { Metadata } from 'next';
import Navbar from '../(components)/Navbar';
import Footer from '../(components)/Footer';
import LeadCaptureForm from '../(components)/LeadCaptureForm';
import { campaignNameFromSearch, leadSourceFromSearch, type AcquisitionSearchParams } from '@/lib/campaigns';

export const metadata: Metadata = {
  title: 'Pilote partenaires financiers — MotoPayee',
  description: 'MotoPayee redirige des demandes de financement véhicule structurées vers des IMF, coopératives d\'épargne et partenaires de financement sélectionnés au Cameroun.',
};

const PARTNER_TYPES = [
  'Institutions de microfinance',
  'Coopératives d\'épargne et de crédit',
  'Partenaires de financement concessionnaire',
  'Équipes de crédit automobile',
];

const VALUE_PROPS = [
  {
    title: 'Demandes structurées',
    text: 'Recevez les informations de l\'acheteur, le contexte du véhicule, l\'apport initial et le statut des documents dans un seul flux.',
  },
  {
    title: 'Véhicules éligibles au financement',
    text: 'MotoPayee ne marque un véhicule finançable que lorsque la revue, la confiance, le prix et l\'état sont jugés acceptables.',
  },
  {
    title: 'Décision de crédit maîtrisée par le partenaire',
    text: 'Votre institution garde la décision finale d\'approbation, le taux, la durée, les garanties et les règles de caution.',
  },
  {
    title: 'Modèle de commission au succès',
    text: 'Le pilote de lancement peut démarrer sans frais mensuel partenaire ; la commission est discutée après décaissement réussi.',
  },
];

const CRITERIA = [
  'Documents requis pour l\'emprunteur',
  'Fourchette d\'apport initial',
  'Durée et structure des taux/frais',
  'Exigences de garantie ou de caution',
  'Limites d\'âge, d\'état et de prix du véhicule',
  'Délai de réponse attendu',
];

const CLARIFICATIONS = [
  'MotoPayee n\'est pas un prêteur.',
  'Le financement reste toujours soumis à la revue et à l\'approbation du partenaire.',
  'MotoPayee ne promet pas de financement garanti aux acheteurs.',
  'Le classement des partenaires doit tenir compte de l\'adéquation avec l\'acheteur, de la rapidité de réponse, du coût et de la fiabilité.',
];

export default function FinancePartnersPage({
  searchParams,
}: {
  searchParams?: AcquisitionSearchParams;
}) {
  const campaignName = campaignNameFromSearch(searchParams, 'Finance partner page');
  const source = leadSourceFromSearch(searchParams);

  return (
    <>
      <Navbar />
      <main className="bg-white">
        <section className="bg-brand-navy-dark px-4 py-16 text-white sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_420px] lg:items-center">
            <div>
              <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-blue-100">
                Pilote partenaires financiers
              </span>
              <h1 className="mt-5 text-4xl font-extrabold leading-tight sm:text-5xl">
                Recevez des demandes de financement véhicule structurées de MotoPayee.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-blue-100">
                MotoPayee travaille avec des IMF, coopératives d&apos;épargne et partenaires de financement concessionnaire sélectionnés pour rediriger des demandes organisées, rattachées à des véhicules revus et éligibles au financement.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {PARTNER_TYPES.map((item) => (
                  <span key={item} className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-blue-100">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white p-6 text-gray-900 shadow-2xl">
              <h2 className="text-xl font-bold text-brand-navy">Demander un échange pilote</h2>
              <p className="mt-2 text-sm text-gray-500">
                Laissez les coordonnées de votre institution. MotoPayee vous contactera pour discuter des critères, documents, délais de réponse et conditions commerciales.
              </p>
              <div className="mt-5">
                <LeadCaptureForm
                  leadType="mfi"
                  source={source}
                  campaignName={campaignName}
                  defaultInterest="Notre institution souhaite discuter d'un pilote de financement véhicule MotoPayee."
                />
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8">
              <span className="text-xs font-bold uppercase tracking-[0.22em] text-brand-green">Valeur partenaire</span>
              <h2 className="mt-3 text-3xl font-extrabold text-brand-navy">Ce que le pilote est conçu pour tester</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {VALUE_PROPS.map((item) => (
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
              <h2 className="text-xl font-bold text-brand-navy">Critères collectés par MotoPayee</h2>
              <div className="mt-5 space-y-3">
                {CRITERIA.map((item) => (
                  <div key={item} className="flex gap-3 rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
                    <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-brand-green" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
              <h2 className="text-xl font-bold text-amber-950">Précisions importantes</h2>
              <div className="mt-5 space-y-3">
                {CLARIFICATIONS.map((item) => (
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
            <h2 className="text-2xl font-extrabold text-brand-navy">Modèle commercial de lancement</h2>
            <p className="mt-3 text-sm leading-7 text-blue-900">
              Le pilote peut démarrer sans abonnement mensuel partenaire. MotoPayee et le partenaire peuvent convenir d&apos;une commission au succès après décaissement confirmé.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

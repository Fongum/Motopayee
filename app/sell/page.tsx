import Link from 'next/link';
import Navbar from '../(components)/Navbar';
import Footer from '../(components)/Footer';
import LeadCaptureForm from '../(components)/LeadCaptureForm';
import { campaignNameFromSearch, leadSourceFromSearch, type AcquisitionSearchParams } from '@/lib/campaigns';

const sellerBenefits = [
  'Annonce gratuite pendant le lancement',
  'Revue MotoPayee avant publication',
  'Visibilite aupres des acheteurs et dossiers finance',
  'Option inspection pour renforcer la confiance',
];

const trustLevels = [
  {
    label: 'MotoPayee Reviewed',
    text: 'Votre annonce contient les informations de base, des photos utilisables, un prix et un contact joignable.',
  },
  {
    label: 'Seller Verified',
    text: 'MotoPayee a verifie votre profil vendeur ou votre contact professionnel.',
  },
  {
    label: 'Documents Checked',
    text: 'Les documents disponibles ont ete revus pour confirmer que le vehicule correspond a l annonce.',
  },
  {
    label: 'Inspected by MotoPayee',
    text: 'Un agent MotoPayee a inspecte le vehicule et prepare un resume de condition.',
  },
];

const processSteps = [
  { step: '1', label: 'Envoyez les details', desc: 'Marque, modele, annee, ville, prix, photos et contact WhatsApp.' },
  { step: '2', label: 'MotoPayee revoit', desc: 'Nous verifions que l annonce est claire, complete et publiable.' },
  { step: '3', label: 'Choisissez le niveau confiance', desc: 'Ajoutez documents, verification vendeur ou inspection si necessaire.' },
  { step: '4', label: 'Recevez des demandes', desc: 'Les acheteurs passent par MotoPayee, surtout si le vehicule n est pas encore verifie.' },
];

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
      <main className="bg-white">
        <section className="bg-[#0d1f3c] px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div>
              <div className="mb-5 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-green-200">
                Offre lancement
              </div>
              <h1 className="max-w-3xl text-4xl font-extrabold leading-tight text-white sm:text-5xl">
                Vendez votre vehicule gratuitement sur MotoPayee.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-blue-100/80">
                MotoPayee aide les vendeurs au Cameroun a publier des annonces claires, organiser la confiance autour du vehicule et toucher des acheteurs serieux. Une annonce gratuite ne veut pas dire verifiee: chaque label est affiche seulement quand il est merite.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/register?role=seller_individual"
                  className="inline-flex items-center justify-center rounded-xl bg-[#3d9e3d] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#2d8a2d]"
                >
                  Creer un compte vendeur
                </Link>
                <a
                  href="#seller-lead"
                  className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/15"
                >
                  Demander un rappel
                </a>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white p-6 shadow-2xl shadow-black/20">
              <p className="text-sm font-bold uppercase tracking-wide text-[#3d9e3d]">Ce qui est gratuit</p>
              <h2 className="mt-2 text-2xl font-extrabold text-[#1a3a6b]">Publication de base</h2>
              <ul className="mt-6 space-y-3 text-sm text-gray-600">
                {sellerBenefits.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-green-50 text-xs font-bold text-[#3d9e3d]">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
                Les inspections restent un service separe. Le tarif de lancement commence autour de 15 000 XAF selon la ville, la distance et la profondeur de controle.
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 max-w-2xl">
              <span className="text-xs font-bold uppercase tracking-widest text-[#3d9e3d]">Confiance</span>
              <h2 className="mt-2 text-3xl font-extrabold text-[#1a3a6b]">Les labels doivent etre clairs pour les acheteurs.</h2>
              <p className="mt-3 text-sm leading-6 text-gray-500">
                MotoPayee peut publier une annonce revue sans pretendre que le vehicule est inspecte. Les vendeurs qui fournissent plus de preuves peuvent obtenir plus de signaux de confiance.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {trustLevels.map((level) => (
                <div key={level.label} className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                  <p className="text-sm font-bold text-[#1a3a6b]">{level.label}</p>
                  <p className="mt-3 text-sm leading-6 text-gray-500">{level.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-gray-50 px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-[#3d9e3d]">Processus</span>
              <h2 className="mt-2 text-3xl font-extrabold text-[#1a3a6b]">Simple pour le vendeur, structure pour l acheteur.</h2>
              <p className="mt-3 text-sm leading-6 text-gray-500">
                Le lancement vise a construire une offre solide: annonces de particuliers, concessions pilotes et vehicules eligibles au financement quand les informations sont suffisantes.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link href="/inspection" className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-[#1a3a6b] hover:bg-gray-100">
                  Voir l inspection
                </Link>
                <Link href="/trust" className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-[#1a3a6b] hover:bg-gray-100">
                  Comprendre les labels
                </Link>
                <Link href="/dealers" className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-[#1a3a6b] hover:bg-gray-100">
                  Programme concessionnaires
                </Link>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {processSteps.map((item) => (
                <div key={item.step} className="rounded-xl border border-gray-200 bg-white p-5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#3d9e3d] text-sm font-bold text-white">
                    {item.step}
                  </span>
                  <h3 className="mt-4 text-base font-bold text-[#1a3a6b]">{item.label}</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-500">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="seller-lead" className="px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-[#3d9e3d]">Contact vendeur</span>
              <h2 className="mt-2 text-3xl font-extrabold text-[#1a3a6b]">Vous preferez parler avant de creer un compte?</h2>
              <p className="mt-3 text-sm leading-6 text-gray-500">
                Laissez vos informations. L equipe MotoPayee peut vous rappeler, confirmer les details du vehicule et vous aider a choisir entre publication simple, verification ou inspection.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <LeadCaptureForm
                leadType="seller"
                source={source}
                campaignName={campaignName}
                defaultInterest="Je veux vendre mon vehicule sur MotoPayee."
              />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

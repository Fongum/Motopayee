import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '../(components)/Navbar';
import Footer from '../(components)/Footer';

export const metadata: Metadata = {
  title: 'Confiance et verification | MotoPayee',
  description:
    'Comprendre les labels MotoPayee: annonce revue, vendeur verifie, documents controles, inspection, financement eligible et location verifiee.',
};

const labels = [
  {
    name: 'MotoPayee Reviewed',
    means: 'MotoPayee a revu les informations de base avant publication: contact, prix, ville, photos et coherence generale.',
    limits: 'Cela ne veut pas dire que les documents, le vendeur ou l etat mecanique sont verifies.',
  },
  {
    name: 'Seller Verified',
    means: 'MotoPayee a confirme le profil vendeur, son contact ou son identite professionnelle quand disponible.',
    limits: 'Cela ne prouve pas automatiquement la propriete du vehicule ni son etat.',
  },
  {
    name: 'Documents Checked',
    means: 'MotoPayee a revu les documents disponibles et verifie que les details correspondent raisonnablement a l annonce.',
    limits: 'Cela ne remplace pas les procedures legales de transfert ou les controles administratifs officiels.',
  },
  {
    name: 'Inspected by MotoPayee',
    means: 'Un agent MotoPayee a inspecte le vehicule et prepare un resume de condition avec les points visibles.',
    limits: 'Cela reduit le risque, mais ne garantit pas l absence de probleme cache ou de panne future.',
  },
  {
    name: 'Finance Eligible',
    means: 'Le vehicule peut etre route vers des partenaires financiers parce que son dossier semble exploitable.',
    limits: 'MotoPayee n est pas le preteur et l approbation finale depend toujours du partenaire financier.',
  },
  {
    name: 'Verified Rental',
    means: 'MotoPayee a revu le proprietaire, le vehicule, le tarif, la caution, les photos et les conditions de location.',
    limits: 'Cela ne garantit pas le comportement du locataire ni ne signifie que MotoPayee conserve toujours la caution.',
  },
  {
    name: 'Trusted Dealer',
    means: 'Le concessionnaire participe au programme MotoPayee et accepte les standards de qualite, de suivi et de transparence.',
    limits: 'Cela ne veut pas dire que chaque vehicule du dealer est inspecte ou eligible au financement.',
  },
];

const avoidClaims = [
  'Tous les vehicules sont verifies.',
  'Tous les vehicules sont inspectes.',
  'Le financement est garanti.',
  'MotoPayee garantit la transaction.',
  'Aucun risque.',
];

export default function TrustPage() {
  return (
    <>
      <Navbar />
      <main className="bg-white">
        <section className="bg-[#0d1f3c] px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-5 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-green-200">
              Confiance MotoPayee
            </div>
            <h1 className="max-w-4xl text-4xl font-extrabold leading-tight text-white sm:text-5xl">
              Les labels de confiance doivent dire exactement ce qui a ete verifie.
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-blue-100/80">
              MotoPayee aide a reduire le risque en rendant les informations, les documents, les inspections et les statuts de financement plus clairs. Nous ne promettons pas que chaque annonce est verifiee ou inspectee.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/listings" className="inline-flex items-center justify-center rounded-xl bg-[#3d9e3d] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#2d8a2d]">
                Voir les annonces
              </Link>
              <Link href="/inspection" className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/15">
                Demander une inspection
              </Link>
            </div>
          </div>
        </section>

        <section className="px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 max-w-2xl">
              <span className="text-xs font-bold uppercase tracking-widest text-[#3d9e3d]">Labels</span>
              <h2 className="mt-2 text-3xl font-extrabold text-[#1a3a6b]">Ce que chaque label signifie.</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {labels.map((label) => (
                <article key={label.name} className="rounded-xl border border-gray-200 bg-gray-50 p-6">
                  <h3 className="text-lg font-bold text-[#1a3a6b]">{label.name}</h3>
                  <div className="mt-4 grid gap-4 text-sm leading-6 sm:grid-cols-2">
                    <div>
                      <p className="font-semibold text-gray-900">Ce que cela veut dire</p>
                      <p className="mt-1 text-gray-600">{label.means}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Ce que cela ne veut pas dire</p>
                      <p className="mt-1 text-gray-600">{label.limits}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-gray-50 px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="text-2xl font-extrabold text-[#1a3a6b]">Pour les acheteurs</h2>
              <p className="mt-3 text-sm leading-6 text-gray-600">
                Comparez les annonces selon leur niveau de confiance. Si un vehicule vous interesse mais n est pas inspecte, demandez une inspection MotoPayee avant de payer ou de vous engager.
              </p>
              <Link href="/inspection" className="mt-5 inline-flex rounded-xl bg-[#1a3a6b] px-5 py-3 text-sm font-semibold text-white hover:bg-[#102847]">
                Voir l offre inspection
              </Link>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="text-2xl font-extrabold text-[#1a3a6b]">Pour les vendeurs</h2>
              <p className="mt-3 text-sm leading-6 text-gray-600">
                Une annonce gratuite peut etre publiee apres revue de base. Les documents, la verification vendeur et l inspection peuvent ensuite renforcer la confiance et aider les acheteurs serieux a avancer.
              </p>
              <Link href="/sell" className="mt-5 inline-flex rounded-xl bg-[#3d9e3d] px-5 py-3 text-sm font-semibold text-white hover:bg-[#2d8a2d]">
                Vendre un vehicule
              </Link>
            </div>
          </div>
        </section>

        <section className="px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl rounded-2xl border border-amber-200 bg-amber-50 p-6">
            <h2 className="text-2xl font-extrabold text-amber-950">Ce que MotoPayee evite de promettre</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {avoidClaims.map((claim) => (
                <div key={claim} className="rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm font-semibold text-amber-900">
                  {claim}
                </div>
              ))}
            </div>
            <p className="mt-5 text-sm leading-6 text-amber-900">
              La confiance vient de labels honnetes, d un suivi clair et d une communication transparente entre MotoPayee, vendeurs, acheteurs, loueurs et partenaires financiers.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

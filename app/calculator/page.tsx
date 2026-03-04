import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '../(components)/Navbar';
import Footer from '../(components)/Footer';
import FinancingCalculator from '../(components)/FinancingCalculator';

export const metadata: Metadata = {
  title: 'Simulateur de financement automobile — MotoPayee',
  description:
    'Estimez vos mensualités et vérifiez votre éligibilité au financement véhicule au Cameroun. Apport initial, durée, taux — simulation instantanée et gratuite.',
  openGraph: {
    title: 'Simulateur de financement MotoPayee',
    description: 'Calculez vos mensualités de financement auto au Cameroun en quelques secondes.',
    type: 'website',
  },
};

const STEPS = [
  {
    n: '1',
    title: 'Choisissez votre véhicule',
    desc: 'Parcourez nos annonces vérifiées et sélectionnez le véhicule qui vous convient.',
  },
  {
    n: '2',
    title: 'Déposez votre dossier',
    desc: 'Remplissez votre demande en ligne et téléchargez vos justificatifs en quelques minutes.',
  },
  {
    n: '3',
    title: 'Vérification rapide',
    desc: 'Notre équipe examine votre dossier et vous répond sous 48 heures ouvrées.',
  },
  {
    n: '4',
    title: 'Décaissement & livraison',
    desc: "Votre financement est décaissé via nos IMF partenaires et vous repartez avec votre véhicule.",
  },
];

const FAQS = [
  {
    q: "Qui peut bénéficier du financement MotoPayee?",
    a: "Tout résident camerounais justifiant d'un revenu régulier peut déposer un dossier. Les salariés, travailleurs indépendants et chefs d'entreprise sont éligibles.",
  },
  {
    q: "Quels documents sont nécessaires?",
    a: "CNI en cours de validité, 3 derniers bulletins de salaire (ou déclarations CNPS), relevé de compte bancaire de 3 mois, et justificatif de domicile.",
  },
  {
    q: "Combien de temps prend l'approbation?",
    a: "Notre équipe traite les dossiers complets en moins de 48 heures ouvrées. Vous recevrez une notification SMS à chaque étape.",
  },
  {
    q: "Quel est le taux d'intérêt appliqué?",
    a: "Les taux varient entre 12% et 24% par an selon le partenaire IMF et votre profil. La simulation vous donne une estimation — le taux exact est confirmé à l'approbation.",
  },
];

export default function CalculatorPage() {
  return (
    <>
      <Navbar />
      <main className="bg-gray-50 min-h-screen">
        {/* Hero */}
        <div className="bg-[#1a3a6b] py-12 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 text-blue-200 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Simulation instantanée & gratuite
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-3">
              Simulateur de financement
            </h1>
            <p className="text-blue-300 text-base max-w-xl mx-auto">
              Entrez le prix du véhicule, votre revenu et ajustez les paramètres pour estimer vos mensualités et vérifier votre éligibilité.
            </p>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-10">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Calculator */}
            <div className="lg:col-span-3">
              <FinancingCalculator />
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-2 space-y-6">
              {/* How it works */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h2 className="text-base font-bold text-gray-900 mb-4">Comment ça marche?</h2>
                <div className="space-y-4">
                  {STEPS.map(({ n, title, desc }) => (
                    <div key={n} className="flex gap-3">
                      <div className="w-7 h-7 rounded-full bg-[#1a3a6b] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {n}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Link
                  href="/listings"
                  className="mt-5 block w-full text-center bg-[#3d9e3d] text-white text-sm font-semibold py-3 rounded-xl hover:bg-[#2d8a2d] transition"
                >
                  Parcourir les véhicules
                </Link>
              </div>

              {/* IMF partners note */}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <p className="text-amber-800 text-xs font-semibold uppercase tracking-wide mb-1">Partenaires IMF</p>
                <p className="text-amber-700 text-sm">
                  {"MotoPayee facilite le financement via un réseau d'institutions de microfinance agréées au Cameroun. Le décaissement se fait directement auprès du vendeur."}
                </p>
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div className="mt-12">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Questions fréquentes</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {FAQS.map(({ q, a }) => (
                <div key={q} className="bg-white rounded-2xl border border-gray-200 p-5">
                  <p className="font-semibold text-gray-900 text-sm mb-2">{q}</p>
                  <p className="text-sm text-gray-500 leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

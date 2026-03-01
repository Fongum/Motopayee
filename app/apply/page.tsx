import Link from 'next/link';
import Navbar from '../(components)/Navbar';
import Footer from '../(components)/Footer';

export default function ApplyPage() {
  return (
    <>
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Financez votre véhicule</h1>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            MotoPayee facilite votre accès au crédit véhicule via des institutions de microfinance partenaires.
          </p>
        </div>

        {/* Eligibility factors */}
        <div className="bg-white border border-gray-200 rounded-2xl p-8 mb-10">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Comment est calculée l&apos;éligibilité ?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              {
                icon: '📍',
                title: 'Votre zone géographique',
                desc: 'Zone A (Douala/Yaoundé), Zone B (villes secondaires) ou Zone C (zones rurales).',
              },
              {
                icon: '💰',
                title: 'Votre classe de revenus',
                desc: 'De A (revenus élevés) à D (revenus modestes). Évalué par notre équipe.',
              },
              {
                icon: '🚗',
                title: "L'état du véhicule",
                desc: 'Grade A (excellent) à D (à réparer). Déterminé par notre inspecteur certifié.',
              },
              {
                icon: '🏷️',
                title: 'La bande de prix',
                desc: 'Vert (prix juste), jaune (légèrement surévalué) ou rouge (trop cher).',
              },
            ].map((item) => (
              <div key={item.title} className="flex gap-4">
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <p className="font-semibold text-gray-900 text-sm mb-1">{item.title}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-4 mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Comment ça marche</h2>
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
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-sm">
                {item.num}
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{item.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/register?role=buyer"
            className="bg-blue-600 text-white font-semibold px-8 py-3 rounded-xl hover:bg-blue-700 text-center"
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
      </main>
      <Footer />
    </>
  );
}

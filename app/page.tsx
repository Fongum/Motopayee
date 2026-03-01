import Link from 'next/link';
import Navbar from './(components)/Navbar';
import Footer from './(components)/Footer';

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <section className="bg-gradient-to-br from-blue-700 via-blue-600 to-blue-500 text-white py-24 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
              Achetez, vendez et financez votre véhicule au Cameroun
            </h1>
            <p className="text-blue-100 text-lg mb-10 max-w-2xl mx-auto">
              MotoPayee connecte acheteurs, vendeurs et institutions de microfinance pour
              rendre l&apos;accès au véhicule simple, transparent et abordable.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/listings"
                className="bg-white text-blue-700 font-semibold px-8 py-3 rounded-xl hover:bg-blue-50 transition"
              >
                Parcourir les véhicules
              </Link>
              <Link
                href="/register"
                className="bg-blue-800 text-white font-semibold px-8 py-3 rounded-xl hover:bg-blue-900 transition border border-blue-400"
              >
                Commencer gratuitement
              </Link>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-20 px-4 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">Comment ça marche</h2>
            <p className="text-gray-500 text-center mb-12">Un processus simple et transparent en quelques étapes</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  step: '1',
                  title: 'Trouvez votre véhicule',
                  desc: 'Parcourez nos annonces vérifiées avec photos, inspection et prix évalués par des experts.',
                  icon: '🔍',
                },
                {
                  step: '2',
                  title: "Vérifiez l'éligibilité",
                  desc: 'Notre système calcule automatiquement votre éligibilité au financement selon votre zone et vos revenus.',
                  icon: '✅',
                },
                {
                  step: '3',
                  title: 'Obtenez votre financement',
                  desc: 'Déposez vos documents, notre équipe de vérificateurs les traite rapidement pour vous connecter à une IMF.',
                  icon: '💰',
                },
              ].map((item) => (
                <div key={item.step} className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm text-center">
                  <div className="text-4xl mb-4">{item.icon}</div>
                  <div className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-2">Étape {item.step}</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">{item.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-16 px-4 bg-white">
          <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { label: 'Véhicules listés', value: '500+' },
              { label: 'Demandes traitées', value: '1 200+' },
              { label: 'Zones couvertes', value: '3' },
              { label: "Taux d'approbation", value: '72%' },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-3xl font-bold text-blue-600">{stat.value}</p>
                <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA strip */}
        <section className="bg-blue-600 text-white py-16 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Prêt à commencer ?</h2>
            <p className="text-blue-100 mb-8">
              Créez un compte gratuit et accédez à toutes les fonctionnalités de MotoPayee.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/apply" className="bg-white text-blue-700 font-semibold px-6 py-3 rounded-xl hover:bg-blue-50">
                Je veux financer un véhicule
              </Link>
              <Link href="/sell" className="bg-blue-700 border border-blue-400 text-white font-semibold px-6 py-3 rounded-xl hover:bg-blue-800">
                Je veux vendre un véhicule
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

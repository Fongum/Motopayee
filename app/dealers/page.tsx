import Link from 'next/link';
import Navbar from '../(components)/Navbar';
import Footer from '../(components)/Footer';

export default function DealersPage() {
  return (
    <>
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Programme Concessionnaires</h1>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Rejoignez MotoPayee en tant que concessionnaire certifié et accédez à un réseau
            d&apos;acheteurs pré-qualifiés pour le financement.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
          {[
            { icon: '📊', title: 'Tableau de bord multi-annonces', desc: 'Gérez tous vos véhicules depuis une interface unifiée.' },
            { icon: '💳', title: 'Acheteurs pré-financés', desc: 'Vendez aux acheteurs dont le financement est déjà validé.' },
            { icon: '🏷️', title: 'Badge concessionnaire certifié', desc: 'Un badge visible sur toutes vos annonces pour plus de confiance.' },
            { icon: '📈', title: 'Statistiques avancées', desc: 'Suivez vos performances, vues et conversions en temps réel.' },
          ].map((item) => (
            <div key={item.title} className="bg-white border border-gray-200 rounded-2xl p-6">
              <div className="text-3xl mb-3">{item.icon}</div>
              <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
              <p className="text-sm text-gray-500">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-8 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Rejoindre le programme</h2>
          <p className="text-gray-600 text-sm mb-6">
            L&apos;inscription est gratuite. Notre équipe vous contactera pour valider votre dossier sous 48h.
          </p>
          <Link
            href="/register?role=seller_dealer"
            className="inline-block bg-blue-600 text-white font-semibold px-8 py-3 rounded-xl hover:bg-blue-700"
          >
            Soumettre une candidature
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}

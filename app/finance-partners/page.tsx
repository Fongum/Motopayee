import Navbar from '../(components)/Navbar';
import Footer from '../(components)/Footer';
import LeadCaptureForm from '../(components)/LeadCaptureForm';
import { campaignNameFromSearch, leadSourceFromSearch, type AcquisitionSearchParams } from '@/lib/campaigns';

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
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-[#1a3a6b] mb-4">Partenaires financement</h1>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            MotoPayee collabore avec les IMF, credit unions et partenaires de financement concessionnaire pour traiter des demandes structurees de credit vehicule.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-10">
          {[
            { title: 'Dossiers qualifies', desc: 'Recevez des demandes associees a des vehicules verifies et Finance Eligible.' },
            { title: 'Reponse competitive', desc: 'Plusieurs partenaires peuvent repondre avec leurs conditions pour laisser le client choisir.' },
            { title: 'Commission au succes', desc: 'Le pilote peut demarrer sans abonnement mensuel, avec commission apres decaissement.' },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="font-bold text-gray-900">{item.title}</h2>
              <p className="mt-2 text-sm text-gray-500">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="text-xl font-bold text-[#1a3a6b] mb-2">Demander une conversation pilote</h2>
          <p className="text-sm text-gray-500 mb-6">
            Laissez les informations de votre institution. MotoPayee vous contactera pour discuter criteres, documents requis, delais de reponse et conditions commerciales.
          </p>
          <LeadCaptureForm
            leadType="mfi"
            source={source}
            campaignName={campaignName}
            defaultInterest="Notre institution veut discuter un pilote financement avec MotoPayee."
          />
        </div>
      </main>
      <Footer />
    </>
  );
}

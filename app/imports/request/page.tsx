import Link from 'next/link';
import Navbar from '@/app/(components)/Navbar';
import Footer from '@/app/(components)/Footer';
import { getCurrentUser, supabaseAdmin } from '@/lib/auth/server';
import ImportRequestForm from './ImportRequestForm';

export default async function ImportRequestPage({
  searchParams,
}: {
  searchParams: {
    offer_id?: string;
    make?: string;
    model?: string;
    year_min?: string;
    year_max?: string;
    budget_max_xaf?: string;
  };
}) {
  const user = await getCurrentUser();
  const isBuyer = user?.role === 'buyer';
  const linkedOffer = searchParams.offer_id
    ? await supabaseAdmin
        .from('import_offers')
        .select('id, headline')
        .eq('id', searchParams.offer_id)
        .eq('status', 'active')
        .maybeSingle()
    : null;

  const initialValues = {
    offerId: linkedOffer?.data?.id ?? '',
    make: searchParams.make ?? '',
    model: searchParams.model ?? '',
    yearMin: searchParams.year_min ?? '',
    yearMax: searchParams.year_max ?? '',
    budgetMaxXaf: searchParams.budget_max_xaf ?? '',
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 py-12">
        <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 sm:px-6 lg:px-8">
          <section className="rounded-[2rem] bg-brand-navy-dark px-8 py-10 text-white shadow-xl">
            <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-blue-100">
              Import assisté
            </span>
            <h1 className="mt-5 max-w-3xl text-3xl font-bold leading-tight sm:text-4xl">
              Dites à MotoPayee ce que vous souhaitez importer des États-Unis.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-blue-100 sm:text-base">
              Indiquez le véhicule visé, votre budget et vos préférences. Nous examinerons la demande, travaillerons avec notre
              partenaire d&apos;approvisionnement américain de confiance, et vous envoyons un devis structuré avant tout achat.
            </p>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.6fr,1fr]">
            <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
              {isBuyer ? (
                <>
                  {linkedOffer?.data && (
                    <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-800">
                      Demande de devis pour <span className="font-semibold">{linkedOffer.data.headline}</span>. Vous pouvez ajuster les critères avant d&apos;envoyer.
                    </div>
                  )}
                  <ImportRequestForm initialValues={initialValues} />
                </>
              ) : !user ? (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-gray-900">Compte acheteur requis</h2>
                  <p className="text-sm leading-7 text-gray-600">
                    Ce parcours est réservé aux comptes acheteurs car les demandes font partie de votre historique d&apos;achat MotoPayee.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href="/login"
                      className="rounded-xl bg-brand-navy px-5 py-3 text-sm font-semibold text-white hover:bg-brand-navy-dark"
                    >
                      Connexion
                    </Link>
                    <Link
                      href="/register?role=buyer"
                      className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Créer un compte acheteur
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-gray-900">Passez sur un compte acheteur</h2>
                  <p className="text-sm leading-7 text-gray-600">
                    Votre compte actuel a le rôle <span className="font-semibold capitalize">{user.role.replace(/_/g, ' ')}</span>.
                    Les demandes d&apos;import ne peuvent être envoyées que depuis un compte acheteur.
                  </p>
                  <Link
                    href="/"
                    className="inline-flex rounded-xl bg-brand-navy px-5 py-3 text-sm font-semibold text-white hover:bg-brand-navy-dark"
                  >
                    Retour à l&apos;accueil
                  </Link>
                </div>
              )}
            </div>

            <aside className="space-y-5">
              <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">La suite</h2>
                <ol className="mt-4 space-y-3 text-sm leading-6 text-gray-600">
                  <li>1. MotoPayee examine votre demande.</li>
                  <li>2. Nous recherchons des options correspondantes avec notre partenaire américain.</li>
                  <li>3. Vous recevez un devis incluant le transport et une estimation des douanes.</li>
                  <li>4. Rien n&apos;est acheté avant que vous n&apos;approuviez le devis.</li>
                </ol>
              </div>

              <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-amber-900">Important</h2>
                <p className="mt-3 text-sm leading-6 text-amber-800">
                  Le dédouanement au Cameroun peut rester géré par l&apos;acheteur, mais les dates d&apos;expédition, frais portuaires et
                  estimations douanières dépendent toujours du traitement officiel et des documents requis.
                </p>
              </div>
            </aside>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}

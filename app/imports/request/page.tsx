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
          <section className="rounded-[2rem] bg-[#102544] px-8 py-10 text-white shadow-xl">
            <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-blue-100">
              Assisted Import
            </span>
            <h1 className="mt-5 max-w-3xl text-3xl font-bold leading-tight sm:text-4xl">
              Tell MotoPayee what you want to import from the United States.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-blue-100 sm:text-base">
              Submit your target vehicle, budget, and preferences. We will review the request, work with our trusted US
              sourcing partner, and send you a structured quote before any purchase is made.
            </p>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.6fr,1fr]">
            <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
              {isBuyer ? (
                <>
                  {linkedOffer?.data && (
                    <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-800">
                      Requesting a quote for <span className="font-semibold">{linkedOffer.data.headline}</span>. You can adjust the criteria before sending.
                    </div>
                  )}
                  <ImportRequestForm initialValues={initialValues} />
                </>
              ) : !user ? (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-gray-900">Buyer account required</h2>
                  <p className="text-sm leading-7 text-gray-600">
                    This flow is reserved for buyer accounts because requests become part of your MotoPayee purchase history.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href="/login"
                      className="rounded-xl bg-[#1a3a6b] px-5 py-3 text-sm font-semibold text-white hover:bg-[#132b50]"
                    >
                      Login
                    </Link>
                    <Link
                      href="/register?role=buyer"
                      className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Create buyer account
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-gray-900">Switch to a buyer account</h2>
                  <p className="text-sm leading-7 text-gray-600">
                    Your current account role is <span className="font-semibold capitalize">{user.role.replace(/_/g, ' ')}</span>.
                    Import requests can only be submitted from buyer accounts.
                  </p>
                  <Link
                    href="/"
                    className="inline-flex rounded-xl bg-[#1a3a6b] px-5 py-3 text-sm font-semibold text-white hover:bg-[#132b50]"
                  >
                    Back to home
                  </Link>
                </div>
              )}
            </div>

            <aside className="space-y-5">
              <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">What happens next</h2>
                <ol className="mt-4 space-y-3 text-sm leading-6 text-gray-600">
                  <li>1. MotoPayee reviews your request.</li>
                  <li>2. We source matching options with our US partner.</li>
                  <li>3. You receive a quote with shipping and estimated customs.</li>
                  <li>4. Nothing is purchased until you approve the quote.</li>
                </ol>
              </div>

              <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-amber-900">Important</h2>
                <p className="mt-3 text-sm leading-6 text-amber-800">
                  Clearing in Cameroon can remain buyer-managed, but shipping dates, port charges, and customs estimates still
                  depend on official processing and documents.
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

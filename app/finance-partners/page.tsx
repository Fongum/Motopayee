import type { Metadata } from 'next';
import Navbar from '../(components)/Navbar';
import Footer from '../(components)/Footer';
import LeadCaptureForm from '../(components)/LeadCaptureForm';
import { campaignNameFromSearch, leadSourceFromSearch, type AcquisitionSearchParams } from '@/lib/campaigns';

export const metadata: Metadata = {
  title: 'Finance partner pilot — MotoPayee',
  description: 'MotoPayee routes structured vehicle finance applications to selected MFIs, credit unions, and dealer-finance partners in Cameroon.',
};

const PARTNER_TYPES = [
  'Microfinance institutions',
  'Credit unions',
  'Dealer-finance partners',
  'Vehicle loan teams',
];

const VALUE_PROPS = [
  {
    title: 'Structured applications',
    text: 'Receive buyer details, vehicle context, down payment information, and document status in one workflow.',
  },
  {
    title: 'Finance-eligible vehicles',
    text: 'MotoPayee only marks vehicles finance eligible when review, trust, price, and condition signals are acceptable.',
  },
  {
    title: 'Partner underwriting control',
    text: 'Your institution keeps the final approval decision, pricing, tenor, collateral, and surety rules.',
  },
  {
    title: 'Success commission model',
    text: 'The launch pilot can start without a monthly partner fee; commission is discussed after successful disbursement.',
  },
];

const CRITERIA = [
  'Required borrower documents',
  'Down payment range',
  'Tenor and interest/fee structure',
  'Collateral or surety requirements',
  'Vehicle age, condition, and price limits',
  'Expected response timeline',
];

const CLARIFICATIONS = [
  'MotoPayee is not a lender.',
  'Financing is always subject to partner review and approval.',
  'MotoPayee does not promise guaranteed financing to buyers.',
  'Partner ranking should consider buyer fit, response speed, cost, and reliability.',
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
        <section className="bg-[#0d1f3c] px-4 py-16 text-white sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_420px] lg:items-center">
            <div>
              <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-blue-100">
                Finance partner pilot
              </span>
              <h1 className="mt-5 text-4xl font-extrabold leading-tight sm:text-5xl">
                Receive structured vehicle finance applications from MotoPayee.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-blue-100">
                MotoPayee works with selected MFIs, credit unions, and dealer-finance partners to route organized applications attached to reviewed and finance-eligible vehicles.
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
              <h2 className="text-xl font-bold text-[#1a3a6b]">Request a pilot conversation</h2>
              <p className="mt-2 text-sm text-gray-500">
                Leave your institution details. MotoPayee will contact you to discuss criteria, documents, response timelines, and commercial terms.
              </p>
              <div className="mt-5">
                <LeadCaptureForm
                  leadType="mfi"
                  source={source}
                  campaignName={campaignName}
                  defaultInterest="Our institution wants to discuss a MotoPayee vehicle finance pilot."
                />
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8">
              <span className="text-xs font-bold uppercase tracking-[0.22em] text-[#3d9e3d]">Partner value</span>
              <h2 className="mt-3 text-3xl font-extrabold text-[#1a3a6b]">What the pilot is designed to test</h2>
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
              <h2 className="text-xl font-bold text-[#1a3a6b]">Criteria MotoPayee collects</h2>
              <div className="mt-5 space-y-3">
                {CRITERIA.map((item) => (
                  <div key={item} className="flex gap-3 rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
                    <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-[#3d9e3d]" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
              <h2 className="text-xl font-bold text-amber-950">Important clarifications</h2>
              <div className="mt-5 space-y-3">
                {CLARIFICATIONS.map((item) => (
                  <div key={item} className="flex gap-3 rounded-xl bg-white p-3 text-sm text-amber-900">
                    <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-[#f5a623]" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl rounded-2xl border border-blue-100 bg-blue-50 p-8 text-center">
            <h2 className="text-2xl font-extrabold text-[#1a3a6b]">Launch commercial model</h2>
            <p className="mt-3 text-sm leading-7 text-blue-900">
              The pilot can begin without a monthly partner subscription. MotoPayee and the partner can agree a success commission after confirmed disbursement.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

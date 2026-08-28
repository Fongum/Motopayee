import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '../(components)/Navbar';
import Footer from '../(components)/Footer';
import LeadCaptureForm from '../(components)/LeadCaptureForm';
import { campaignNameFromSearch, leadSourceFromSearch, type AcquisitionSearchParams } from '@/lib/campaigns';

export const metadata: Metadata = {
  title: 'Dealer pilot program — MotoPayee',
  description: 'Join the MotoPayee free 6-month dealer pilot for reviewed inventory, buyer lead routing, and finance-ready customer opportunities across Cameroon.',
};

const DEALER_BENEFITS = [
  {
    title: 'Free 6-month pilot',
    text: 'Selected dealers can join without a monthly fee during the launch pilot.',
  },
  {
    title: 'Inventory packaging',
    text: 'MotoPayee helps structure vehicle details, photos, pricing, and listing readiness.',
  },
  {
    title: 'Buyer lead routing',
    text: 'MotoPayee-generated buyer inquiries are tracked so serious leads do not get lost.',
  },
  {
    title: 'Finance candidate review',
    text: 'Vehicles that fit partner criteria can be marked for finance application routing.',
  },
];

const DEALER_RULES = [
  'Provide accurate prices and current vehicle details.',
  'Send usable photos and update sold or unavailable vehicles quickly.',
  'Respond promptly to MotoPayee-generated leads.',
  'Avoid false financeable claims unless MotoPayee marks the vehicle eligible.',
  'Handle MotoPayee-generated leads through MotoPayee during the pilot.',
];

const PROCESS = [
  { step: '1', title: 'Apply for pilot', text: 'Send dealer name, contact person, city, inventory size, and vehicle categories.' },
  { step: '2', title: 'Agree pilot rules', text: 'MotoPayee confirms lead handling, trust labels, listing quality, and finance-eligible rules.' },
  { step: '3', title: 'Submit first batch', text: 'Start with 5-10 vehicles that have prices, photos, city, and availability confirmed.' },
  { step: '4', title: 'Track leads', text: 'MotoPayee routes inquiries, follows up, and reviews dealer lead quality during the pilot.' },
];

export default function DealersPage({
  searchParams,
}: {
  searchParams?: AcquisitionSearchParams;
}) {
  const campaignName = campaignNameFromSearch(searchParams, 'Dealer pilot page');
  const source = leadSourceFromSearch(searchParams);

  return (
    <>
      <Navbar />
      <main className="bg-white">
        <section className="bg-[#0d1f3c] px-4 py-16 text-white sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_420px] lg:items-center">
            <div>
              <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-blue-100">
                Free dealer pilot
              </span>
              <h1 className="mt-5 text-4xl font-extrabold leading-tight sm:text-5xl">
                Join MotoPayee as a launch dealer partner.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-blue-100">
                MotoPayee is onboarding selected dealers across Cameroon for a free 6-month pilot focused on trusted inventory, buyer leads, and finance-ready opportunities.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#dealer-form" className="rounded-xl bg-[#3d9e3d] px-6 py-3 text-sm font-bold text-white hover:bg-[#2d8a2d]">
                  Request pilot call
                </a>
                <Link href="/listings" className="rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10">
                  View marketplace
                </Link>
              </div>
            </div>

            <div id="dealer-form" className="rounded-2xl border border-white/10 bg-white p-6 text-gray-900 shadow-2xl">
              <h2 className="text-xl font-bold text-[#1a3a6b]">Request dealer onboarding</h2>
              <p className="mt-2 text-sm text-gray-500">
                Leave your details and MotoPayee will contact you to review inventory, pilot terms, and next steps.
              </p>
              <div className="mt-5">
                <LeadCaptureForm
                  leadType="dealer"
                  source={source}
                  campaignName={campaignName}
                  defaultInterest="I want to join the MotoPayee free dealer pilot."
                />
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8">
              <span className="text-xs font-bold uppercase tracking-[0.22em] text-[#3d9e3d]">Pilot value</span>
              <h2 className="mt-3 text-3xl font-extrabold text-[#1a3a6b]">What selected dealers receive</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {DEALER_BENEFITS.map((item) => (
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
              <h2 className="text-xl font-bold text-[#1a3a6b]">Dealer responsibilities</h2>
              <div className="mt-5 space-y-3">
                {DEALER_RULES.map((item) => (
                  <div key={item} className="flex gap-3 rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
                    <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-[#3d9e3d]" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-6">
              <h2 className="text-xl font-bold text-[#1a3a6b]">Pilot targets</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {[
                  ['3-5', 'Dealer pilots'],
                  ['5-10', 'Vehicles per first batch'],
                  ['5-10', 'Finance candidates'],
                  ['6 months', 'Free pilot period'],
                ].map(([value, label]) => (
                  <div key={label} className="rounded-xl bg-white p-4">
                    <p className="text-2xl font-extrabold text-[#1a3a6b]">{value}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8">
              <span className="text-xs font-bold uppercase tracking-[0.22em] text-[#3d9e3d]">Process</span>
              <h2 className="mt-3 text-3xl font-extrabold text-[#1a3a6b]">From first call to active pilot</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {PROCESS.map((item) => (
                <div key={item.step} className="rounded-2xl border border-gray-200 bg-white p-5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1a3a6b] text-sm font-bold text-white">
                    {item.step}
                  </span>
                  <h3 className="mt-4 font-bold text-gray-900">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-500">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

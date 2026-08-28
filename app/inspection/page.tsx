import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '../(components)/Navbar';
import Footer from '../(components)/Footer';
import LeadCaptureForm from '../(components)/LeadCaptureForm';
import { campaignNameFromSearch, leadSourceFromSearch, type AcquisitionSearchParams } from '@/lib/campaigns';

export const metadata: Metadata = {
  title: 'Inspection véhicule — MotoPayee',
  description: 'Request a MotoPayee vehicle inspection in Cameroon. Buyer-requested, seller package, finance check, and rental verification options.',
  openGraph: {
    title: 'MotoPayee vehicle inspection',
    description: 'Inspection requests start around 15,000 XAF and help buyers, sellers, finance partners, and rental owners reduce transaction risk.',
    type: 'website',
  },
};

const INSPECTION_TYPES = [
  {
    title: 'Buyer-requested inspection',
    text: 'For buyers who want a MotoPayee condition check before making a payment or travelling to view a vehicle.',
  },
  {
    title: 'Seller inspection package',
    text: 'For sellers who want stronger trust signals before publishing or promoting a vehicle.',
  },
  {
    title: 'Finance check',
    text: 'For vehicles being considered for partner financing and finance-eligible review.',
  },
  {
    title: 'Rental verification',
    text: 'For rental owners before a vehicle is published as a verified rental.',
  },
];

const CHECKS = [
  'Exterior and interior condition review',
  'Mileage/odometer observation where available',
  'Visible issue notes and condition summary',
  'Vehicle location and identity consistency check',
  'Inspection date and staff record',
  'Recommendation on public trust label where appropriate',
];

const LIMITS = [
  'Inspection reduces risk but does not eliminate all risk.',
  'It is not a full workshop mechanical diagnosis unless separately arranged.',
  'MotoPayee does not guarantee financing approval or future vehicle performance.',
];

export default function InspectionPage({
  searchParams,
}: {
  searchParams?: AcquisitionSearchParams;
}) {
  const campaignName = campaignNameFromSearch(searchParams, 'Inspection page');
  const source = leadSourceFromSearch(searchParams);

  return (
    <>
      <Navbar />
      <main className="bg-white">
        <section className="bg-[#0d1f3c] px-4 py-16 text-white sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_420px] lg:items-center">
            <div>
              <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-blue-100">
                MotoPayee inspection
              </span>
              <h1 className="mt-5 text-4xl font-extrabold leading-tight sm:text-5xl">
                Request a vehicle inspection before the next step.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-blue-100">
                MotoPayee inspections help buyers, sellers, rental owners, and finance partners make better decisions with a structured condition summary.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#inspection-form" className="rounded-xl bg-[#3d9e3d] px-6 py-3 text-sm font-bold text-white hover:bg-[#2d8a2d]">
                  Request inspection
                </a>
                <Link href="/listings" className="rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10">
                  Browse listings
                </Link>
              </div>
            </div>

            <div id="inspection-form" className="rounded-2xl border border-white/10 bg-white p-6 text-gray-900 shadow-2xl">
              <h2 className="text-xl font-bold text-[#1a3a6b]">Inspection follow-up</h2>
              <p className="mt-2 text-sm text-gray-500">
                Leave your details and MotoPayee will confirm the vehicle, location, fee, and schedule.
              </p>
              <div className="mt-5 rounded-xl border border-green-100 bg-green-50 p-4">
                <p className="text-sm font-bold text-green-800">Starting fee: 15,000 XAF</p>
                <p className="mt-1 text-xs leading-6 text-green-700">
                  Final price may vary by city, distance, inspection depth, and whether a workshop diagnosis is needed.
                </p>
              </div>
              <div className="mt-5">
                <LeadCaptureForm
                  leadType="inspection"
                  source={source}
                  campaignName={campaignName}
                  defaultInterest="I want a MotoPayee vehicle inspection."
                />
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8">
              <span className="text-xs font-bold uppercase tracking-[0.22em] text-[#3d9e3d]">Inspection options</span>
              <h2 className="mt-3 text-3xl font-extrabold text-[#1a3a6b]">One inspection offer, multiple launch uses</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {INSPECTION_TYPES.map((item) => (
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
              <h2 className="text-xl font-bold text-[#1a3a6b]">What MotoPayee checks</h2>
              <div className="mt-5 space-y-3">
                {CHECKS.map((item) => (
                  <div key={item} className="flex gap-3 rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
                    <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-[#3d9e3d]" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
              <h2 className="text-xl font-bold text-amber-950">Clear limits</h2>
              <div className="mt-5 space-y-3">
                {LIMITS.map((item) => (
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
            <h2 className="text-2xl font-extrabold text-[#1a3a6b]">Already looking at a MotoPayee listing?</h2>
            <p className="mt-3 text-sm leading-7 text-blue-900">
              Open the listing and use the inspection form there so MotoPayee can attach the request directly to the vehicle.
            </p>
            <Link href="/listings" className="mt-6 inline-flex rounded-xl bg-[#1a3a6b] px-6 py-3 text-sm font-bold text-white hover:bg-[#132a4d]">
              Find the listing
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

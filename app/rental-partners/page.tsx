import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '../(components)/Navbar';
import Footer from '../(components)/Footer';
import LeadCaptureForm from '../(components)/LeadCaptureForm';
import { campaignNameFromSearch, leadSourceFromSearch, type AcquisitionSearchParams } from '@/lib/campaigns';

export const metadata: Metadata = {
  title: 'Register a rental vehicle — MotoPayee',
  description: 'Register your car, SUV, van, bus, truck, chauffeur vehicle, or event vehicle for verified rentals through MotoPayee Cameroon.',
  openGraph: {
    title: 'Register a rental vehicle with MotoPayee',
    description: 'MotoPayee is onboarding verified rental vehicles across Cameroon.',
    type: 'website',
  },
};

const RENTAL_TYPES = [
  'Private cars and SUVs',
  'Chauffeur vehicles',
  'Vans, buses, and trucks',
  'Wedding and event vehicles',
  'Corporate and travel rentals',
];

const REQUIREMENTS = [
  'Owner or business contact confirmed',
  'Vehicle photos and location provided',
  'Daily rate and security deposit confirmed',
  'Insurance status and rental mode recorded',
  'Self-drive, chauffeur, or both clearly stated',
];

const PROCESS = [
  { step: '1', title: 'Submit details', text: 'Send owner details, vehicle type, city, rates, deposit, availability, and photos.' },
  { step: '2', title: 'MotoPayee review', text: 'Our team checks the owner, vehicle information, rates, deposit terms, and basic rental conditions.' },
  { step: '3', title: 'Publish verified rental', text: 'Approved vehicles can appear on MotoPayee with clear terms and rental inquiry handling.' },
  { step: '4', title: 'Receive bookings', text: 'Rental booking payments are tracked through MotoPayee, with launch commission starting at 10%.' },
];

export default function RentalPartnersPage({
  searchParams,
}: {
  searchParams?: AcquisitionSearchParams;
}) {
  const campaignName = campaignNameFromSearch(searchParams, 'Rental partner page');
  const source = leadSourceFromSearch(searchParams);

  return (
    <>
      <Navbar />
      <main className="bg-white">
        <section className="bg-[#0d1f3c] px-4 py-16 text-white sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_420px] lg:items-center">
            <div>
              <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-blue-100">
                Rental partner program
              </span>
              <h1 className="mt-5 text-4xl font-extrabold leading-tight sm:text-5xl">
                Earn from your vehicle with verified MotoPayee rentals.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-blue-100">
                MotoPayee is onboarding rental owners, rental companies, chauffeur vehicles, vans, buses, trucks, and event vehicles across Cameroon.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#rental-form" className="rounded-xl bg-[#3d9e3d] px-6 py-3 text-sm font-bold text-white hover:bg-[#2d8a2d]">
                  Register a vehicle
                </a>
                <Link href="/hire" className="rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10">
                  View rentals
                </Link>
              </div>
            </div>

            <div id="rental-form" className="rounded-2xl border border-white/10 bg-white p-6 text-gray-900 shadow-2xl">
              <h2 className="text-xl font-bold text-[#1a3a6b]">Request onboarding</h2>
              <p className="mt-2 text-sm text-gray-500">
                Leave your details and MotoPayee will contact you for vehicle photos, rates, deposit, availability, and verification.
              </p>
              <div className="mt-5">
                <LeadCaptureForm
                  leadType="rental_owner"
                  source={source}
                  campaignName={campaignName}
                  defaultInterest="I want to register a rental vehicle with MotoPayee."
                />
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-8 lg:grid-cols-2">
              <div>
                <span className="text-xs font-bold uppercase tracking-[0.22em] text-[#3d9e3d]">Accepted vehicles</span>
                <h2 className="mt-3 text-3xl font-extrabold text-[#1a3a6b]">Rental categories MotoPayee can onboard</h2>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {RENTAL_TYPES.map((item) => (
                    <div key={item} className="rounded-xl border border-gray-200 bg-white p-4 text-sm font-semibold text-gray-800">
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6">
                <h2 className="text-xl font-bold text-[#1a3a6b]">Before a rental goes live</h2>
                <div className="mt-5 space-y-3">
                  {REQUIREMENTS.map((item) => (
                    <div key={item} className="flex gap-3 rounded-xl bg-white p-3 text-sm text-gray-700">
                      <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-[#3d9e3d]" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-gray-50 px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8">
              <span className="text-xs font-bold uppercase tracking-[0.22em] text-[#3d9e3d]">How it works</span>
              <h2 className="mt-3 text-3xl font-extrabold text-[#1a3a6b]">Simple onboarding, clear rental terms</h2>
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

        <section className="px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl rounded-2xl border border-blue-100 bg-blue-50 p-8 text-center">
            <h2 className="text-2xl font-extrabold text-[#1a3a6b]">Launch commercial terms</h2>
            <p className="mt-3 text-sm leading-7 text-blue-900">
              Rental booking commission starts at 10% of booking value. The vehicle owner keeps the security deposit unless MotoPayee separately confirms another arrangement.
            </p>
            <a href="#rental-form" className="mt-6 inline-flex rounded-xl bg-[#3d9e3d] px-6 py-3 text-sm font-bold text-white hover:bg-[#2d8a2d]">
              Register now
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

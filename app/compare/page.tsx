import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Navbar from '../(components)/Navbar';
import Footer from '../(components)/Footer';
import { supabaseAdmin } from '@/lib/auth/server';
import type { Listing, HireListing } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Comparer les véhicules — MotoPayee',
};

function formatXAF(amount: number): string {
  return new Intl.NumberFormat('fr-CM', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(amount);
}

const FUEL_FR: Record<string, string> = {
  petrol: 'Essence', diesel: 'Diesel', electric: 'Électrique', hybrid: 'Hybride', other: 'Autre',
};

export default async function ComparePage({
  searchParams,
}: {
  searchParams: { ids?: string; type?: string };
}) {
  const ids = (searchParams.ids ?? '').split(',').filter(Boolean);
  if (ids.length < 2) notFound();

  const isHire = searchParams.type === 'hire';

  if (isHire) {
    const { data } = await supabaseAdmin
      .from('hire_listings')
      .select('*, owner:profiles!owner_id(full_name, is_verified), media:hire_listing_media(*)')
      .in('id', ids)
      .eq('status', 'published');
    const listings = (data ?? []) as unknown as HireListing[];
    if (listings.length < 2) notFound();

    return (
      <>
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Comparer les véhicules en location</h1>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left p-3 bg-gray-50 rounded-tl-xl w-40"></th>
                  {listings.map((l) => (
                    <th key={l.id} className="p-3 bg-gray-50 text-center min-w-[200px]">
                      <a href={`/hire/${l.id}`} className="text-[#1a3a6b] hover:text-[#3d9e3d] font-bold">
                        {l.year} {l.make} {l.model}
                      </a>
                      {l.media && l.media.length > 0 && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={`/api/files/signed-url?path=${encodeURIComponent(l.media[0].storage_path)}&bucket=${l.media[0].bucket}`}
                          alt={`${l.make} ${l.model}`}
                          className="w-full h-32 object-cover rounded-xl mt-2"
                        />
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {([
                  ['Tarif/jour', (l: HireListing) => formatXAF(l.daily_rate)],
                  ['Tarif/semaine', (l: HireListing) => l.weekly_rate ? formatXAF(l.weekly_rate) : '—'],
                  ['Tarif/mois', (l: HireListing) => l.monthly_rate ? formatXAF(l.monthly_rate) : '—'],
                  ['Caution', (l: HireListing) => formatXAF(l.deposit_amount)],
                  ['Carburant', (l: HireListing) => FUEL_FR[l.fuel_type] ?? l.fuel_type],
                  ['Boîte', (l: HireListing) => l.transmission === 'automatic' ? 'Automatique' : 'Manuelle'],
                  ['Places', (l: HireListing) => String(l.seats)],
                  ['Ville', (l: HireListing) => l.city],
                  ['Zone', (l: HireListing) => l.zone],
                  ['Type location', (l: HireListing) => l.hire_type === 'self_drive' ? 'Sans chauffeur' : l.hire_type === 'with_driver' ? 'Avec chauffeur' : 'Les deux'],
                  ['Assurance incluse', (l: HireListing) => l.insurance_included ? 'Oui' : 'Non'],
                  ['Propriétaire vérifié', (l: HireListing) => l.owner?.is_verified ? 'Oui' : 'Non'],
                ] as [string, (l: HireListing) => string][]).map(([label, fn]) => (
                  <tr key={label}>
                    <td className="p-3 font-semibold text-gray-600">{label}</td>
                    {listings.map((l) => (
                      <td key={l.id} className="p-3 text-center text-gray-800">{fn(l)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // Listing comparison
  const { data } = await supabaseAdmin
    .from('listings')
    .select('*, vehicle:vehicles(*), media:media_assets(*), seller:profiles!seller_id(full_name, is_verified)')
    .in('id', ids)
    .eq('status', 'published');
  const listings = (data ?? []) as unknown as Listing[];
  if (listings.length < 2) notFound();

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Comparer les véhicules</h1>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left p-3 bg-gray-50 rounded-tl-xl w-40"></th>
                {listings.map((l) => (
                  <th key={l.id} className="p-3 bg-gray-50 text-center min-w-[200px]">
                    <a href={`/listings/${l.id}`} className="text-[#1a3a6b] hover:text-[#3d9e3d] font-bold">
                      {l.vehicle ? `${l.vehicle.year} ${l.vehicle.make} ${l.vehicle.model}` : 'Véhicule'}
                    </a>
                    {l.media && l.media.length > 0 && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={`/api/files/thumb/${l.media[0].id}`}
                        alt="Véhicule"
                        className="w-full h-32 object-cover rounded-xl mt-2"
                      />
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {([
                ['Prix', (l: Listing) => formatXAF(l.asking_price)],
                ['Prix estimé', (l: Listing) => l.suggested_price ? formatXAF(l.suggested_price) : '—'],
                ['Band de prix', (l: Listing) => l.price_band === 'green' ? 'Bon prix' : l.price_band === 'yellow' ? 'Prix correct' : l.price_band === 'red' ? 'Prix élevé' : '—'],
                ['Année', (l: Listing) => l.vehicle ? String(l.vehicle.year) : '—'],
                ['Kilométrage', (l: Listing) => l.vehicle ? `${l.vehicle.mileage_km.toLocaleString('fr-FR')} km` : '—'],
                ['Carburant', (l: Listing) => l.vehicle ? (FUEL_FR[l.vehicle.fuel_type] ?? l.vehicle.fuel_type) : '—'],
                ['Boîte', (l: Listing) => l.vehicle ? (l.vehicle.transmission === 'automatic' ? 'Automatique' : 'Manuelle') : '—'],
                ['Moteur', (l: Listing) => l.vehicle?.engine_cc ? `${l.vehicle.engine_cc} cc` : '—'],
                ['Places', (l: Listing) => l.vehicle?.seats ? String(l.vehicle.seats) : '—'],
                ['Couleur', (l: Listing) => l.vehicle?.color ?? '—'],
                ['Grade', (l: Listing) => l.vehicle?.condition_grade ?? '—'],
                ['Zone', (l: Listing) => l.zone],
                ['Ville', (l: Listing) => l.city ?? '—'],
                ['Finançable', (l: Listing) => l.financeable ? 'Oui' : 'Non'],
                ['Vendeur vérifié', (l: Listing) => l.seller?.is_verified ? 'Oui' : 'Non'],
              ] as [string, (l: Listing) => string][]).map(([label, fn]) => (
                <tr key={label}>
                  <td className="p-3 font-semibold text-gray-600">{label}</td>
                  {listings.map((l) => (
                    <td key={l.id} className="p-3 text-center text-gray-800">{fn(l)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
      <Footer />
    </>
  );
}

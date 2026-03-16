import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser, supabaseAdmin } from '@/lib/auth/server';
import type { HireListing } from '@/lib/types';

function formatXAF(amount: number): string {
  return new Intl.NumberFormat('fr-CM', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(amount);
}

const STATUS_FR: Record<string, { label: string; cls: string }> = {
  draft:          { label: 'Brouillon',      cls: 'bg-gray-100 text-gray-600' },
  pending_review: { label: 'En attente',     cls: 'bg-amber-100 text-amber-700' },
  published:      { label: 'Publié',         cls: 'bg-green-100 text-green-700' },
  suspended:      { label: 'Suspendu',       cls: 'bg-red-100 text-red-600' },
  withdrawn:      { label: 'Retiré',         cls: 'bg-gray-100 text-gray-500' },
};

const AVAIL_FR: Record<string, string> = {
  available: 'Disponible',
  hired_out: 'En location',
  maintenance: 'Maintenance',
  unavailable: 'Indisponible',
};

export default async function MyHireListingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { data } = await supabaseAdmin
    .from('hire_listings')
    .select('*, media:hire_listing_media(id, storage_path, bucket, display_order)')
    .eq('owner_id', user.id)
    .neq('status', 'withdrawn')
    .order('created_at', { ascending: false });

  const listings = (data ?? []) as unknown as HireListing[];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Mes véhicules en location</h1>
        <Link
          href="/me/hire-listings/new"
          className="bg-[#3d9e3d] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#2d8a2d] transition"
        >
          + Nouveau
        </Link>
      </div>

      {listings.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
          <p className="text-gray-500 mb-2">Vous n&apos;avez pas encore de véhicule en location</p>
          <Link href="/me/hire-listings/new" className="text-[#3d9e3d] font-semibold hover:underline">
            Ajouter un véhicule
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {listings.map((l) => {
            const st = STATUS_FR[l.status] ?? STATUS_FR.draft;
            return (
              <div key={l.id} className="bg-white rounded-2xl border border-gray-200 p-4 flex gap-4">
                {/* Thumb */}
                <div className="w-28 h-20 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                  {l.media && l.media.length > 0 ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={`/api/files/signed-url?path=${encodeURIComponent(l.media[0].storage_path)}&bucket=${l.media[0].bucket}`}
                      alt={`${l.make} ${l.model}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">Pas de photo</div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-gray-800 text-sm">{l.year} {l.make} {l.model}</h3>
                      <p className="text-xs text-gray-400">{l.city} — {formatXAF(l.daily_rate)}/jour</p>
                    </div>
                    <div className="flex gap-2 items-center">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                      <span className="text-[10px] text-gray-400">{AVAIL_FR[l.availability]}</span>
                    </div>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Link
                      href={`/hire/${l.id}`}
                      className="text-xs text-[#1a3a6b] hover:underline"
                    >
                      Voir
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

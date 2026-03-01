import { getCurrentUser, supabaseAdmin } from '@/lib/auth/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { FinancingApplication } from '@/lib/types';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  submitted: 'Soumis',
  docs_pending: 'Documents requis',
  docs_received: 'Documents reçus',
  under_review: 'En cours d\'examen',
  approved: 'Approuvé',
  rejected: 'Refusé',
  disbursed: 'Financé',
  withdrawn: 'Annulé',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  submitted: 'bg-blue-100 text-blue-700',
  docs_pending: 'bg-yellow-100 text-yellow-700',
  docs_received: 'bg-blue-100 text-blue-700',
  under_review: 'bg-purple-100 text-purple-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  disbursed: 'bg-green-100 text-green-800',
  withdrawn: 'bg-gray-100 text-gray-500',
};

export default async function ApplicationsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'buyer') redirect('/login');

  const { data: apps } = await supabaseAdmin
    .from('financing_applications')
    .select('*, listing:listings(id, asking_price, zone, vehicle:vehicles(make, model, year))')
    .eq('buyer_id', user.id)
    .order('created_at', { ascending: false });

  const applications = (apps ?? []) as unknown as FinancingApplication[];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mes demandes de financement</h1>
          <p className="text-gray-500 text-sm mt-1">{applications.length} demande{applications.length !== 1 ? 's' : ''}</p>
        </div>
        <Link
          href="/listings"
          className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Trouver un véhicule
        </Link>
      </div>

      {applications.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
          <p className="text-gray-500 mb-4">Vous n&apos;avez pas encore de demande de financement.</p>
          <Link href="/listings" className="text-blue-600 hover:underline text-sm">
            Parcourir les véhicules financables →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => {
            const listing = app.listing as { id: string; asking_price: number; zone: string; vehicle?: { make: string; model: string; year: number } } | undefined;
            const vehicle = listing?.vehicle;
            return (
              <Link
                key={app.id}
                href={`/me/applications/${app.id}`}
                className="block bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-sm transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'Véhicule'}
                    </p>
                    {listing && (
                      <p className="text-sm text-gray-500 mt-0.5">
                        {new Intl.NumberFormat('fr-CM', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(listing.asking_price)}
                        {' · Zone '}{listing.zone}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      Créée le {new Date(app.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${STATUS_COLORS[app.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABELS[app.status] ?? app.status}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

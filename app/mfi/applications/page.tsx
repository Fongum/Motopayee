import { getCurrentUser, supabaseAdmin } from '@/lib/auth/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { FinancingApplication } from '@/lib/types';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon', submitted: 'Soumis', docs_pending: 'Docs requis',
  docs_received: 'Docs reçus', under_review: 'En examen',
  approved: 'Approuvé', rejected: 'Refusé', disbursed: 'Financé', withdrawn: 'Annulé',
};

const STATUS_COLORS: Record<string, string> = {
  submitted: 'bg-yellow-100 text-yellow-700',
  docs_pending: 'bg-orange-100 text-orange-700',
  docs_received: 'bg-blue-100 text-blue-700',
  under_review: 'bg-purple-100 text-purple-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  disbursed: 'bg-green-200 text-green-800',
  withdrawn: 'bg-gray-100 text-gray-500',
};

function formatXAF(n: number) {
  return new Intl.NumberFormat('fr-CM', {
    style: 'currency', currency: 'XAF', maximumFractionDigits: 0,
  }).format(n);
}

export default async function MFIApplicationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'mfi_partner' && user.role !== 'admin') redirect('/');

  let institutionId: string | null = null;
  let institutionName: string | null = null;

  if (user.role === 'mfi_partner') {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('mfi_institution_id')
      .eq('id', user.id)
      .single();
    institutionId = (profile as { mfi_institution_id: string | null } | null)
      ?.mfi_institution_id ?? null;

    if (!institutionId) {
      return (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
          <p className="text-gray-500">
            Votre compte n&apos;est pas lié à une IMF. Contactez l&apos;administrateur.
          </p>
        </div>
      );
    }

    const { data: inst } = await supabaseAdmin
      .from('mfi_institutions')
      .select('name')
      .eq('id', institutionId)
      .single();
    institutionName = (inst as { name: string } | null)?.name ?? null;
  }

  let query = supabaseAdmin
    .from('financing_applications')
    .select(`
      id, status, created_at, income_grade,
      listing:listings(asking_price, zone, vehicle:vehicles(make, model, year)),
      buyer:profiles!buyer_id(full_name, city)
    `)
    .order('created_at', { ascending: false });

  if (institutionId) {
    query = query.eq('mfi_institution_id', institutionId);
  } else {
    // Admin sees all applications that have an MFI assigned
    query = query.not('mfi_institution_id', 'is', null);
  }

  const { data } = await query;

  const items = (data ?? []) as unknown as Array<
    FinancingApplication & {
      listing?: {
        asking_price: number;
        zone: string;
        vehicle?: { make: string; model: string; year: number };
      };
      buyer?: { full_name?: string; city?: string };
    }
  >;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Demandes de financement</h1>
        {institutionName && (
          <p className="text-gray-500 text-sm mt-0.5">{institutionName}</p>
        )}
        <p className="text-gray-500 text-sm mt-1">
          {items.length} demande{items.length !== 1 ? 's' : ''}
        </p>
      </div>

      {items.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
          <p className="text-gray-500">Aucune demande assignée pour le moment.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(app => {
            const v = app.listing?.vehicle;
            const buyer = app.buyer;
            return (
              <Link
                key={app.id}
                href={`/mfi/applications/${app.id}`}
                className="block bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-sm transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {v ? `${v.year} ${v.make} ${v.model}` : 'Véhicule'}
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {buyer?.full_name ?? '—'} · {buyer?.city ?? '—'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Zone {app.listing?.zone ?? '—'}
                      {app.listing?.asking_price
                        ? ` · ${formatXAF(app.listing.asking_price)}`
                        : ''}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${STATUS_COLORS[app.status] ?? 'bg-gray-100 text-gray-600'}`}
                  >
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

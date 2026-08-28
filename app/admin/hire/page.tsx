import { supabaseAdmin } from '@/lib/auth/server';
import type { HireListing } from '@/lib/types';
import AdminHireActions from './AdminHireActions';
import Link from 'next/link';

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

export default async function AdminHirePage() {
  const { data: pendingData } = await supabaseAdmin
    .from('hire_listings')
    .select('*, owner:profiles!owner_id(full_name, email, phone)', { count: 'exact' })
    .eq('status', 'pending_review')
    .order('created_at', { ascending: true });

  const { data: publishedData } = await supabaseAdmin
    .from('hire_listings')
    .select('*, owner:profiles!owner_id(full_name, email, phone)', { count: 'exact' })
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  const pending = (pendingData ?? []) as unknown as HireListing[];
  const published = (publishedData ?? []) as unknown as HireListing[];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Gestion des locations</h1>
          <p className="mt-1 text-sm text-gray-500">Validation des vehicules proposes a la location.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/hire/new" className="rounded-lg bg-[#1a3a6b] px-4 py-2 text-sm font-medium text-white hover:bg-[#132a4d]">
            Nouvelle location
          </Link>
          <Link href="/admin/hire/bookings" className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Voir les reservations
          </Link>
        </div>
      </div>

      {/* Pending review */}
      <section className="mb-10">
        <h2 className="text-sm font-bold text-gray-500 uppercase mb-4">En attente d&apos;examen ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="text-gray-400 text-sm">Aucune annonce en attente.</p>
        ) : (
          <div className="space-y-3">
            {pending.map((l) => (
              <div key={l.id} className="bg-white rounded-2xl border border-gray-200 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-bold text-gray-800 text-sm">
                      {l.year} {l.make} {l.model}
                    </h3>
                    <p className="text-xs text-gray-400">
                      {l.city} — {formatXAF(l.daily_rate)}/jour — {l.hire_type}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Propriétaire: {l.owner?.full_name ?? l.owner?.email}
                      {l.owner?.phone ? ` (${l.owner.phone})` : ''}
                    </p>
                    {l.description && (
                      <p className="text-xs text-gray-500 mt-2 max-w-xl truncate">{l.description}</p>
                    )}
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_FR.pending_review.cls}`}>
                    {STATUS_FR.pending_review.label}
                  </span>
                </div>
                <AdminHireActions listingId={l.id} currentStatus={l.status} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Published */}
      <section>
        <h2 className="text-sm font-bold text-gray-500 uppercase mb-4">Publiés ({published.length})</h2>
        {published.length === 0 ? (
          <p className="text-gray-400 text-sm">Aucune annonce publiée.</p>
        ) : (
          <div className="space-y-3">
            {published.map((l) => {
              const st = STATUS_FR[l.status] ?? STATUS_FR.draft;
              return (
                <div key={l.id} className="bg-white rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <a href={`/hire/${l.id}`} className="font-bold text-[#1a3a6b] hover:text-[#3d9e3d] text-sm">
                        {l.year} {l.make} {l.model}
                      </a>
                      <p className="text-xs text-gray-400">
                        {l.city} — {formatXAF(l.daily_rate)}/jour — {l.availability}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Propriétaire: {l.owner?.full_name ?? l.owner?.email}
                      </p>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                  </div>
                  <AdminHireActions listingId={l.id} currentStatus={l.status} />
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

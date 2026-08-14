'use client';

import Link from 'next/link';
import { useState } from 'react';

interface Stats {
  total: number;
  published: number;
  sold: number;
  draft: number;
  totalRevenue: number;
}

interface ListingRow {
  id: string;
  status: string;
  asking_price: number;
  created_at: string;
  vehicle: { make: string; model: string; year: number } | null;
}

interface Lead {
  id: string;
  buyer_name: string;
  vehicle: string | null;
  last_message_at: string;
}

function formatXAF(amount: number): string {
  return new Intl.NumberFormat('fr-CM', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(amount);
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  ownership_submitted: 'Titre soumis',
  ownership_verified: 'Titre vérifié',
  media_done: 'Photos OK',
  inspection_scheduled: 'Inspection planifiée',
  inspected: 'Inspecté',
  pricing_review: 'Revue prix',
  published: 'Publié',
  sold: 'Vendu',
  withdrawn: 'Retiré',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  published: 'bg-green-100 text-green-700',
  sold: 'bg-blue-100 text-blue-700',
  withdrawn: 'bg-red-100 text-red-600',
};

export default function DealerDashboardClient({
  stats,
  listings,
  leads,
}: {
  stats: Stats;
  listings: ListingRow[];
  leads: Lead[];
}) {
  const [filter, setFilter] = useState<string>('all');

  const filtered = filter === 'all' ? listings : listings.filter((l) => l.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Tableau de bord concessionnaire</h1>
        <Link
          href="/me/listings/new"
          className="bg-[#3d9e3d] text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[#2d8a2d] transition"
        >
          + Nouvelle annonce
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total annonces', value: stats.total, color: 'text-gray-900' },
          { label: 'Publiées', value: stats.published, color: 'text-[#3d9e3d]' },
          { label: 'Vendues', value: stats.sold, color: 'text-[#1a3a6b]' },
          { label: 'Brouillons', value: stats.draft, color: 'text-gray-500' },
          { label: 'Chiffre d\'affaires', value: formatXAF(stats.totalRevenue), color: 'text-[#f5a623]' },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4 text-center">
            <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-gray-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Inventory */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">Inventaire</h2>
          <div className="flex gap-1">
            {['all', 'published', 'draft', 'sold'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs px-3 py-1.5 rounded-lg transition ${filter === f ? 'bg-[#1a3a6b] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {f === 'all' ? 'Tout' : STATUS_LABELS[f] ?? f}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-gray-400 p-6 text-center">Aucune annonce.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map((l) => (
              <Link key={l.id} href={`/me/listings`} className="flex items-center justify-between p-4 hover:bg-gray-50 transition">
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    {l.vehicle ? `${l.vehicle.year} ${l.vehicle.make} ${l.vehicle.model}` : 'Véhicule'}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {new Date(l.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-gray-900">{formatXAF(l.asking_price)}</span>
                  <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${STATUS_COLORS[l.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABELS[l.status] ?? l.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recent leads */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">Derniers prospects</h2>
        </div>
        {leads.length === 0 ? (
          <p className="text-sm text-gray-400 p-6 text-center">Aucun message reçu.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {leads.map((l) => (
              <Link key={l.id} href="/me/inbox" className="flex items-center justify-between p-4 hover:bg-gray-50 transition">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{l.buyer_name}</p>
                  {l.vehicle && <p className="text-[10px] text-gray-400">{l.vehicle}</p>}
                </div>
                <p className="text-[10px] text-gray-400">
                  {new Date(l.last_message_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

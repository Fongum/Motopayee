'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';

interface Props {
  searchType: 'listing' | 'hire';
}

export default function SaveSearchButton({ searchType }: Props) {
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [notifyVia, setNotifyVia] = useState('none');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    if (!label.trim()) {
      setError('Donnez un nom à cette recherche.');
      return;
    }
    setLoading(true);
    setError('');

    // Build filters from current search params
    const filters: Record<string, string> = {};
    searchParams.forEach((val, key) => {
      if (key !== 'page') filters[key] = val;
    });

    const res = await fetch('/api/saved-searches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ search_type: searchType, label, filters, notify_via: notifyVia }),
    });

    if (res.ok) {
      setSuccess(true);
      setTimeout(() => { setSuccess(false); setOpen(false); setLabel(''); }, 2000);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Erreur. Êtes-vous connecté ?');
    }
    setLoading(false);
  }

  // Only show if there are active filters
  const hasFilters = Array.from(searchParams.keys()).some((k) => k !== 'page');
  if (!hasFilters) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1a3a6b] hover:text-[#3d9e3d] transition"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
        Sauvegarder cette recherche
      </button>

      {open && (
        <div className="absolute top-full mt-2 right-0 w-72 bg-white rounded-xl border border-gray-200 shadow-xl p-4 z-50">
          {success ? (
            <p className="text-sm text-green-600 font-semibold text-center py-2">Recherche sauvegardée !</p>
          ) : (
            <>
              <div className="mb-3">
                <label className="block text-xs text-gray-500 mb-1">Nom de la recherche</label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Ex: Toyota Douala < 5M"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#3d9e3d]"
                />
              </div>
              <div className="mb-3">
                <label className="block text-xs text-gray-500 mb-1">Notifications</label>
                <select
                  value={notifyVia}
                  onChange={(e) => setNotifyVia(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#3d9e3d]"
                >
                  <option value="none">Aucune</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="sms">SMS</option>
                </select>
              </div>
              {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
              <button
                onClick={save}
                disabled={loading}
                className="w-full bg-[#1a3a6b] text-white font-semibold py-2 rounded-lg text-sm hover:bg-[#15305a] transition disabled:opacity-50"
              >
                {loading ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

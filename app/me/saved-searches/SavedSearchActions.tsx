'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  searchId: string;
  active: boolean;
}

export default function SavedSearchActions({ searchId, active }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggleActive() {
    setLoading(true);
    await fetch(`/api/saved-searches/${searchId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !active }),
    });
    setLoading(false);
    router.refresh();
  }

  async function remove() {
    if (!confirm('Supprimer cette recherche ?')) return;
    setLoading(true);
    await fetch(`/api/saved-searches/${searchId}`, { method: 'DELETE' });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex gap-3 mt-2">
      <button
        onClick={toggleActive}
        disabled={loading}
        className={`text-xs font-medium ${active ? 'text-amber-600' : 'text-green-600'} hover:underline disabled:opacity-50`}
      >
        {active ? 'Désactiver' : 'Activer'}
      </button>
      <button
        onClick={remove}
        disabled={loading}
        className="text-xs text-red-500 hover:underline disabled:opacity-50"
      >
        Supprimer
      </button>
    </div>
  );
}

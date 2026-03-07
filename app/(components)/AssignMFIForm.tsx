'use client';

import { useState } from 'react';

interface Institution {
  id: string;
  name: string;
  code: string;
}

interface Props {
  applicationId: string;
  currentMFIId?: string | null;
  institutions: Institution[];
}

export default function AssignMFIForm({ applicationId, currentMFIId, institutions }: Props) {
  const [selectedId, setSelectedId] = useState(currentMFIId ?? '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/applications/${applicationId}/assign-mfi`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mfi_institution_id: selectedId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error ?? 'Erreur.' });
      } else {
        setMessage({ type: 'success', text: 'IMF assignée avec succès.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Erreur réseau.' });
    } finally {
      setLoading(false);
    }
  }

  if (institutions.length === 0) {
    return (
      <p className="text-xs text-gray-400">
        Aucune IMF disponible. Ajoutez des institutions dans la base de données.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="flex-1 min-w-48">
        <label className="block text-xs text-gray-500 mb-1">Institution IMF</label>
        <select
          value={selectedId}
          onChange={e => setSelectedId(e.target.value)}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
          required
        >
          <option value="">Sélectionner une IMF</option>
          {institutions.map(inst => (
            <option key={inst.id} value={inst.id}>
              {inst.name} ({inst.code})
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={loading || !selectedId}
        className="text-sm font-semibold bg-[#1a3a6b] text-white px-4 py-2 rounded-lg hover:bg-[#142d54] disabled:opacity-50"
      >
        {loading ? '...' : 'Assigner'}
      </button>
      {message && (
        <p
          className={`text-xs w-full ${
            message.type === 'success' ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {message.text}
        </p>
      )}
    </form>
  );
}

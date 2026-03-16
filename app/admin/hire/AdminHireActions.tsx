'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminHireActions({ listingId, currentStatus }: { listingId: string; currentStatus: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function updateStatus(newStatus: string) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/hire/${listingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Erreur');
        return;
      }
      router.refresh();
    } catch {
      setError('Erreur réseau');
    } finally {
      setLoading(false);
    }
  }

  const actions: { label: string; status: string; cls: string }[] = [];

  if (currentStatus === 'pending_review') {
    actions.push({ label: 'Publier', status: 'published', cls: 'bg-[#3d9e3d] text-white hover:bg-[#2d8a2d]' });
    actions.push({ label: 'Rejeter', status: 'withdrawn', cls: 'bg-red-600 text-white hover:bg-red-700' });
  }
  if (currentStatus === 'published') {
    actions.push({ label: 'Suspendre', status: 'suspended', cls: 'border border-red-300 text-red-600 hover:bg-red-50' });
  }
  if (currentStatus === 'suspended') {
    actions.push({ label: 'Republier', status: 'published', cls: 'bg-[#3d9e3d] text-white hover:bg-[#2d8a2d]' });
  }

  if (actions.length === 0) return null;

  return (
    <div>
      <div className="flex gap-2 mt-2">
        {actions.map((a) => (
          <button
            key={a.status}
            onClick={() => updateStatus(a.status)}
            disabled={loading}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${a.cls} disabled:opacity-50`}
          >
            {a.label}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

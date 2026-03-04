'use client';

import { useState } from 'react';

interface Props {
  userId: string;
  initialVerified: boolean;
}

export default function VerifyToggle({ userId, initialVerified }: Props) {
  const [verified, setVerified] = useState(initialVerified);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/verify`, { method: 'PATCH' });
      if (res.ok) {
        const data = await res.json();
        setVerified(data.is_verified);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`text-xs px-2.5 py-1 rounded-full font-semibold transition border ${
        verified
          ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
          : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
      } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {verified ? '✓ Vérifié' : 'Vérifier'}
    </button>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  listingId: string;
  initialSaved: boolean;
  isAuthenticated: boolean;
}

export default function FavouriteButton({ listingId, initialSaved, isAuthenticated }: Props) {
  const [saved, setSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function toggle() {
    if (loading) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/favourites/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: listingId }),
      });
      if (res.ok) {
        const data = await res.json();
        setSaved(data.saved);
      } else if (res.status === 403) {
        // Not a buyer — redirect to login/register
        router.push('/login');
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
      title={saved ? 'Retirer des favoris' : 'Sauvegarder'}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition ${
        saved
          ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
          : 'bg-white border-gray-300 text-gray-500 hover:border-red-300 hover:text-red-500'
      } ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
    >
      <svg
        className="w-4 h-4"
        fill={saved ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
      {saved ? 'Sauvegardé' : 'Sauvegarder'}
    </button>
  );
}

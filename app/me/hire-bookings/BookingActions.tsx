'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { HireBooking } from '@/lib/types';

export default function BookingActions({ booking, isOwner }: { booking: HireBooking; isOwner: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function performAction(action: string) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/hire/my-bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: booking.id, action }),
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

  const buttons: { label: string; action: string; cls: string }[] = [];

  if (isOwner) {
    if (booking.status === 'pending') {
      buttons.push({ label: 'Confirmer', action: 'confirm', cls: 'bg-[#3d9e3d] text-white hover:bg-[#2d8a2d]' });
      buttons.push({ label: 'Refuser', action: 'cancel', cls: 'bg-red-600 text-white hover:bg-red-700' });
    }
    if (booking.status === 'confirmed') {
      buttons.push({ label: 'Démarrer', action: 'start', cls: 'bg-[#1a3a6b] text-white hover:bg-blue-800' });
      buttons.push({ label: 'Annuler', action: 'cancel', cls: 'bg-red-600 text-white hover:bg-red-700' });
    }
    if (booking.status === 'active') {
      buttons.push({ label: 'Terminer', action: 'complete', cls: 'bg-[#3d9e3d] text-white hover:bg-[#2d8a2d]' });
    }
  } else {
    if (['pending', 'confirmed'].includes(booking.status)) {
      buttons.push({ label: 'Annuler', action: 'cancel', cls: 'border border-red-300 text-red-600 hover:bg-red-50' });
    }
  }

  if (buttons.length === 0) return null;

  return (
    <div>
      <div className="flex gap-2 mt-2">
        {buttons.map((btn) => (
          <button
            key={btn.action}
            onClick={() => performAction(btn.action)}
            disabled={loading}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${btn.cls} disabled:opacity-50`}
          >
            {btn.label}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

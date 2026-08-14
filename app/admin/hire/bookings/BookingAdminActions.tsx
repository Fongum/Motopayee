'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Action = {
  label: string;
  action: string;
  className: string;
};

export default function BookingAdminActions({
  bookingId,
  status,
  paymentStatus,
}: {
  bookingId: string;
  status: string;
  paymentStatus: string;
}) {
  const router = useRouter();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [error, setError] = useState('');

  const actions: Action[] = [];

  if (status === 'pending') {
    actions.push({ label: 'Confirmer', action: 'confirm', className: 'bg-[#3d9e3d] text-white hover:bg-[#2d8a2d]' });
    actions.push({ label: 'Annuler', action: 'cancel', className: 'border border-red-300 text-red-600 hover:bg-red-50' });
  }
  if (status === 'confirmed') {
    actions.push({ label: 'Demarrer', action: 'start', className: 'bg-[#1a3a6b] text-white hover:bg-[#132a4d]' });
    actions.push({ label: 'Annuler', action: 'cancel', className: 'border border-red-300 text-red-600 hover:bg-red-50' });
  }
  if (status === 'active') {
    actions.push({ label: 'Terminer', action: 'complete', className: 'bg-[#3d9e3d] text-white hover:bg-[#2d8a2d]' });
    actions.push({ label: 'Litige', action: 'dispute', className: 'border border-red-300 text-red-600 hover:bg-red-50' });
  }
  if (status === 'completed') {
    actions.push({ label: 'Litige', action: 'dispute', className: 'border border-red-300 text-red-600 hover:bg-red-50' });
  }
  if (paymentStatus === 'unpaid') {
    actions.push({ label: 'Caution payee', action: 'mark_deposit_paid', className: 'border border-blue-300 text-blue-700 hover:bg-blue-50' });
  }
  if (paymentStatus !== 'fully_paid' && paymentStatus !== 'refunded') {
    actions.push({ label: 'Paiement complet', action: 'mark_fully_paid', className: 'border border-green-300 text-green-700 hover:bg-green-50' });
  }
  if (paymentStatus !== 'refunded' && ['cancelled', 'disputed'].includes(status)) {
    actions.push({ label: 'Rembourse', action: 'refund', className: 'border border-gray-300 text-gray-700 hover:bg-gray-50' });
  }

  async function runAction(action: string) {
    setLoadingAction(action);
    setError('');
    try {
      const response = await fetch(`/api/admin/hire/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error ?? 'Action impossible.');
        return;
      }
      router.refresh();
    } catch {
      setError('Erreur reseau.');
    } finally {
      setLoadingAction(null);
    }
  }

  if (actions.length === 0) return null;

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        {actions.map((item) => (
          <button
            key={item.action}
            type="button"
            onClick={() => runAction(item.action)}
            disabled={loadingAction !== null}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${item.className}`}
          >
            {loadingAction === item.action ? '...' : item.label}
          </button>
        ))}
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

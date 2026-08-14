'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { MFIOfferStatus } from '@/lib/types';

type Props = {
  offerId: string;
  currentStatus: MFIOfferStatus;
};

const ACTIONS: Array<{ status: MFIOfferStatus; label: string; className: string }> = [
  { status: 'shortlisted', label: 'Shortlist', className: 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100' },
  { status: 'accepted', label: 'Accept', className: 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100' },
  { status: 'declined', label: 'Decline', className: 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100' },
];

export default function MFIOfferActions({ offerId, currentStatus }: Props) {
  const router = useRouter();
  const [loadingStatus, setLoadingStatus] = useState<MFIOfferStatus | null>(null);
  const [error, setError] = useState('');

  async function updateStatus(status: MFIOfferStatus) {
    setLoadingStatus(status);
    setError('');

    const response = await fetch(`/api/admin/mfi-offers/${offerId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      setError(data?.error ?? 'Unable to update offer.');
      setLoadingStatus(null);
      return;
    }

    setLoadingStatus(null);
    router.refresh();
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        {ACTIONS.filter((action) => action.status !== currentStatus).map((action) => (
          <button
            key={action.status}
            type="button"
            onClick={() => updateStatus(action.status)}
            disabled={loadingStatus !== null}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${action.className}`}
          >
            {loadingStatus === action.status ? '...' : action.label}
          </button>
        ))}
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

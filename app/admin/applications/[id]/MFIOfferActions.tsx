'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { MFIOfferBuyerResponse, MFIOfferStatus } from '@/lib/types';

type Props = {
  applicationId: string;
  offerId: string;
  currentStatus: MFIOfferStatus;
  buyerResponse: MFIOfferBuyerResponse | null;
  institutionName: string;
};

const ACTIONS: Array<{ status: MFIOfferStatus; label: string; className: string }> = [
  { status: 'shortlisted', label: 'Shortlist', className: 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100' },
  { status: 'accepted', label: 'Accept', className: 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100' },
  { status: 'declined', label: 'Decline', className: 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100' },
];

export default function MFIOfferActions({ applicationId, offerId, currentStatus, buyerResponse, institutionName }: Props) {
  const router = useRouter();
  const [loadingStatus, setLoadingStatus] = useState<MFIOfferStatus | null>(null);
  const [loadingBuyerResponse, setLoadingBuyerResponse] = useState<MFIOfferBuyerResponse | null>(null);
  const [presenting, setPresenting] = useState(false);
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

  async function markPresented() {
    setPresenting(true);
    setError('');

    const response = await fetch(`/api/admin/applications/${applicationId}/follow-up`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        follow_up_status: 'waiting_buyer',
        follow_up_notes: `Offer from ${institutionName} was presented to the buyer. Awaiting buyer response.`,
        next_follow_up_at: new Date().toISOString(),
      }),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      setError(data?.error ?? 'Unable to mark offer as presented.');
      setPresenting(false);
      return;
    }

    setPresenting(false);
    router.refresh();
  }

  async function updateBuyerResponse(buyer_response: MFIOfferBuyerResponse) {
    setLoadingBuyerResponse(buyer_response);
    setError('');

    const response = await fetch(`/api/admin/mfi-offers/${offerId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ buyer_response }),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      setError(data?.error ?? 'Unable to record buyer response.');
      setLoadingBuyerResponse(null);
      return;
    }

    setLoadingBuyerResponse(null);
    router.refresh();
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2 border-t border-gray-200 pt-3">
        {buyerResponse == null && ['submitted', 'shortlisted', 'accepted'].includes(currentStatus) && (
          <button
            type="button"
            onClick={markPresented}
            disabled={loadingStatus !== null || loadingBuyerResponse !== null || presenting}
            className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 disabled:opacity-50"
          >
            {presenting ? '...' : 'Mark presented'}
          </button>
        )}
        {['submitted', 'shortlisted', 'accepted'].includes(currentStatus) && (
          <>
            <button
              type="button"
              onClick={() => updateBuyerResponse('interested')}
              disabled={loadingStatus !== null || loadingBuyerResponse !== null || buyerResponse === 'interested'}
              className="rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 transition hover:bg-green-100 disabled:opacity-50"
            >
              {loadingBuyerResponse === 'interested' ? '...' : 'Buyer interested'}
            </button>
            <button
              type="button"
              onClick={() => updateBuyerResponse('not_interested')}
              disabled={loadingStatus !== null || loadingBuyerResponse !== null || buyerResponse === 'not_interested'}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
            >
              {loadingBuyerResponse === 'not_interested' ? '...' : 'Buyer declined'}
            </button>
          </>
        )}
        {ACTIONS.filter((action) => action.status !== currentStatus).map((action) => (
          <button
            key={action.status}
            type="button"
            onClick={() => updateStatus(action.status)}
            disabled={loadingStatus !== null || loadingBuyerResponse !== null || presenting}
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

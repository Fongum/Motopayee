'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  applicationId: string;
  existingOffer?: {
    status: string;
    proposed_down_payment_percent: number | null;
    proposed_tenor_months: number | null;
    proposed_interest_rate_percent: number | null;
    notes: string | null;
  } | null;
};

export default function MFIOfferForm({ applicationId, existingOffer }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(existingOffer?.status ?? 'submitted');
  const [downPayment, setDownPayment] = useState(String(existingOffer?.proposed_down_payment_percent ?? ''));
  const [tenor, setTenor] = useState(String(existingOffer?.proposed_tenor_months ?? ''));
  const [rate, setRate] = useState(String(existingOffer?.proposed_interest_rate_percent ?? ''));
  const [notes, setNotes] = useState(existingOffer?.notes ?? '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    const response = await fetch(`/api/mfi/applications/${applicationId}/offer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status,
        proposed_down_payment_percent: downPayment ? Number(downPayment) : undefined,
        proposed_tenor_months: tenor ? Number(tenor) : undefined,
        proposed_interest_rate_percent: rate ? Number(rate) : undefined,
        notes: notes.trim() || undefined,
      }),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      setMessage({ type: 'error', text: data?.error ?? 'Unable to submit offer.' });
      setLoading(false);
      return;
    }

    setMessage({ type: 'success', text: 'Offer saved.' });
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Decision</label>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#1a3a6b] focus:outline-none"
          >
            <option value="submitted">Interested</option>
            <option value="declined">Declined</option>
            <option value="withdrawn">Withdrawn</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Down payment %</label>
          <input
            value={downPayment}
            onChange={(event) => setDownPayment(event.target.value)}
            type="number"
            min={0}
            max={100}
            step="0.01"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#1a3a6b] focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Tenor months</label>
          <input
            value={tenor}
            onChange={(event) => setTenor(event.target.value)}
            type="number"
            min={1}
            max={84}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#1a3a6b] focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Interest %</label>
          <input
            value={rate}
            onChange={(event) => setRate(event.target.value)}
            type="number"
            min={0}
            max={100}
            step="0.01"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#1a3a6b] focus:outline-none"
          />
        </div>
      </div>

      <textarea
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        rows={3}
        maxLength={1000}
        placeholder="Conditions, required documents, collateral, surety, or next steps"
        className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#1a3a6b] focus:outline-none"
      />

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-[#1a3a6b] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#132b50] disabled:opacity-50"
      >
        {loading ? 'Saving...' : existingOffer ? 'Update offer' : 'Submit offer'}
      </button>
      {message && (
        <p className={`text-xs ${message.type === 'error' ? 'text-red-600' : 'text-green-700'}`}>
          {message.text}
        </p>
      )}
    </form>
  );
}

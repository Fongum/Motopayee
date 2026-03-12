'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  quoteId: string;
  reservationDepositAmount: number;
};

function formatXAF(value: number) {
  return new Intl.NumberFormat('fr-CM', {
    style: 'currency',
    currency: 'XAF',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function AcceptQuoteForm({ quoteId, reservationDepositAmount }: Props) {
  const router = useRouter();
  const [clearingMode, setClearingMode] = useState<'self_clear' | 'broker_assist'>('self_clear');
  const [destinationPort, setDestinationPort] = useState('Douala');
  const [destinationCity, setDestinationCity] = useState('');
  const [acknowledgeTerms, setAcknowledgeTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    const response = await fetch('/api/imports/orders/accept-quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quote_id: quoteId,
        clearing_mode: clearingMode,
        destination_port: destinationPort.trim() || null,
        destination_city: destinationCity.trim() || null,
        acknowledge_terms: acknowledgeTerms,
      }),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      setError(data?.error ?? 'Unable to accept quote.');
      setSubmitting(false);
      return;
    }

    router.push(`/me/import-orders/${data.order.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Reservation deposit</p>
        <p className="mt-1 text-2xl font-bold text-[#1a3a6b]">{formatXAF(reservationDepositAmount)}</p>
      </div>

      <div>
        <label htmlFor="clearingMode" className="mb-2 block text-sm font-medium text-gray-700">
          Clearing mode
        </label>
        <select
          id="clearingMode"
          value={clearingMode}
          onChange={(event) => setClearingMode(event.target.value as 'self_clear' | 'broker_assist')}
          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-[#1a3a6b] focus:outline-none"
        >
          <option value="self_clear">Buyer handles clearing</option>
          <option value="broker_assist">Broker assist</option>
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="destinationPort" className="mb-2 block text-sm font-medium text-gray-700">
            Destination port
          </label>
          <input
            id="destinationPort"
            value={destinationPort}
            onChange={(event) => setDestinationPort(event.target.value)}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-[#1a3a6b] focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="destinationCity" className="mb-2 block text-sm font-medium text-gray-700">
            Destination city
          </label>
          <input
            id="destinationCity"
            value={destinationCity}
            onChange={(event) => setDestinationCity(event.target.value)}
            placeholder="Douala / Yaounde / Bafoussam"
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-[#1a3a6b] focus:outline-none"
          />
        </div>
      </div>

      <label className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
        <input
          type="checkbox"
          checked={acknowledgeTerms}
          onChange={(event) => setAcknowledgeTerms(event.target.checked)}
          className="mt-1"
        />
        <span className="text-sm leading-6 text-gray-600">
          I understand that MotoPayee will only proceed after the reservation deposit is confirmed and that customs and port charges remain estimates until final processing.
        </span>
      </label>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || !acknowledgeTerms}
        className="inline-flex rounded-xl bg-[#1a3a6b] px-5 py-3 text-sm font-semibold text-white hover:bg-[#132b50] disabled:opacity-60"
      >
        {submitting ? 'Accepting...' : 'Accept quote'}
      </button>
    </form>
  );
}

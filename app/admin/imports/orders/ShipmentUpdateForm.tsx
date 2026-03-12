'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ImportShipment, ImportShipmentStatus } from '@/lib/types';

type Props = {
  shipment: ImportShipment;
};

function toDateTimeLocal(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function ShipmentUpdateForm({ shipment }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<ImportShipmentStatus>(shipment.status);
  const [eta, setEta] = useState(toDateTimeLocal(shipment.eta));
  const [actualDepartureAt, setActualDepartureAt] = useState(toDateTimeLocal(shipment.actual_departure_at));
  const [actualArrivalAt, setActualArrivalAt] = useState(toDateTimeLocal(shipment.actual_arrival_at));
  const [notes, setNotes] = useState(shipment.notes ?? '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    const response = await fetch(`/api/admin/imports/shipments/${shipment.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status,
        eta: eta ? new Date(eta).toISOString() : null,
        actual_departure_at: actualDepartureAt ? new Date(actualDepartureAt).toISOString() : null,
        actual_arrival_at: actualArrivalAt ? new Date(actualArrivalAt).toISOString() : null,
        notes: notes.trim() || null,
      }),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      setMessage({ type: 'error', text: data?.error ?? 'Unable to update shipment.' });
      setLoading(false);
      return;
    }

    setMessage({ type: 'success', text: 'Shipment updated.' });
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <div className="grid gap-4 md:grid-cols-3">
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as ImportShipmentStatus)}
          className="rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-[#1a3a6b] focus:outline-none"
        >
          {['draft', 'booked', 'departed', 'arrived', 'released', 'closed'].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <input
          type="datetime-local"
          value={eta}
          onChange={(event) => setEta(event.target.value)}
          className="rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-[#1a3a6b] focus:outline-none"
        />
        <input
          type="datetime-local"
          value={actualDepartureAt}
          onChange={(event) => setActualDepartureAt(event.target.value)}
          className="rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-[#1a3a6b] focus:outline-none"
        />
      </div>
      <input
        type="datetime-local"
        value={actualArrivalAt}
        onChange={(event) => setActualArrivalAt(event.target.value)}
        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-[#1a3a6b] focus:outline-none"
      />
      <textarea
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        rows={3}
        className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:border-[#1a3a6b] focus:outline-none"
      />
      {message && (
        <div className={`rounded-xl px-4 py-3 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}
      <button
        type="submit"
        disabled={loading}
        className="inline-flex rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#1a3a6b] ring-1 ring-[#1a3a6b]/15 hover:bg-[#f7f9fc] disabled:opacity-60"
      >
        {loading ? 'Saving...' : 'Update shipment'}
      </button>
    </form>
  );
}

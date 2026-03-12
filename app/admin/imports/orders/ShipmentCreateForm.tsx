'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ImportShipmentStatus } from '@/lib/types';

type Props = {
  orderId: string;
};

type FormState = {
  carrierName: string;
  containerType: string;
  containerNo: string;
  bookingRef: string;
  billOfLadingNo: string;
  portOfLoading: string;
  portOfDischarge: string;
  etd: string;
  eta: string;
  actualDepartureAt: string;
  actualArrivalAt: string;
  status: ImportShipmentStatus;
  notes: string;
};

const INITIAL_STATE: FormState = {
  carrierName: '',
  containerType: '',
  containerNo: '',
  bookingRef: '',
  billOfLadingNo: '',
  portOfLoading: '',
  portOfDischarge: '',
  etd: '',
  eta: '',
  actualDepartureAt: '',
  actualArrivalAt: '',
  status: 'booked',
  notes: '',
};

export default function ShipmentCreateForm({ orderId }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    const response = await fetch(`/api/admin/imports/orders/${orderId}/shipments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        carrier_name: form.carrierName.trim(),
        container_type: form.containerType.trim() || null,
        container_no: form.containerNo.trim() || null,
        booking_ref: form.bookingRef.trim() || null,
        bill_of_lading_no: form.billOfLadingNo.trim() || null,
        port_of_loading: form.portOfLoading.trim() || null,
        port_of_discharge: form.portOfDischarge.trim() || null,
        etd: form.etd ? new Date(form.etd).toISOString() : null,
        eta: form.eta ? new Date(form.eta).toISOString() : null,
        actual_departure_at: form.actualDepartureAt ? new Date(form.actualDepartureAt).toISOString() : null,
        actual_arrival_at: form.actualArrivalAt ? new Date(form.actualArrivalAt).toISOString() : null,
        status: form.status,
        notes: form.notes.trim() || null,
      }),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      setMessage({ type: 'error', text: data?.error ?? 'Unable to create shipment.' });
      setLoading(false);
      return;
    }

    setForm(INITIAL_STATE);
    setMessage({ type: 'success', text: 'Shipment created.' });
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <input
          value={form.carrierName}
          onChange={(event) => update('carrierName', event.target.value)}
          placeholder="Carrier name"
          required
          className="rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-[#1a3a6b] focus:outline-none"
        />
        <select
          value={form.status}
          onChange={(event) => update('status', event.target.value as ImportShipmentStatus)}
          className="rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-[#1a3a6b] focus:outline-none"
        >
          {['draft', 'booked', 'departed', 'arrived', 'released', 'closed'].map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <input
          value={form.bookingRef}
          onChange={(event) => update('bookingRef', event.target.value)}
          placeholder="Booking reference"
          className="rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-[#1a3a6b] focus:outline-none"
        />
        <input
          value={form.billOfLadingNo}
          onChange={(event) => update('billOfLadingNo', event.target.value)}
          placeholder="Bill of lading no"
          className="rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-[#1a3a6b] focus:outline-none"
        />
        <input
          value={form.containerType}
          onChange={(event) => update('containerType', event.target.value)}
          placeholder="Container type"
          className="rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-[#1a3a6b] focus:outline-none"
        />
        <input
          value={form.containerNo}
          onChange={(event) => update('containerNo', event.target.value)}
          placeholder="Container no"
          className="rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-[#1a3a6b] focus:outline-none"
        />
        <input
          value={form.portOfLoading}
          onChange={(event) => update('portOfLoading', event.target.value)}
          placeholder="Port of loading"
          className="rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-[#1a3a6b] focus:outline-none"
        />
        <input
          value={form.portOfDischarge}
          onChange={(event) => update('portOfDischarge', event.target.value)}
          placeholder="Port of discharge"
          className="rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-[#1a3a6b] focus:outline-none"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-400">ETD</label>
          <input
            type="datetime-local"
            value={form.etd}
            onChange={(event) => update('etd', event.target.value)}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-[#1a3a6b] focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-400">ETA</label>
          <input
            type="datetime-local"
            value={form.eta}
            onChange={(event) => update('eta', event.target.value)}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-[#1a3a6b] focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-400">Actual departure</label>
          <input
            type="datetime-local"
            value={form.actualDepartureAt}
            onChange={(event) => update('actualDepartureAt', event.target.value)}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-[#1a3a6b] focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-400">Actual arrival</label>
          <input
            type="datetime-local"
            value={form.actualArrivalAt}
            onChange={(event) => update('actualArrivalAt', event.target.value)}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-[#1a3a6b] focus:outline-none"
          />
        </div>
      </div>

      <textarea
        value={form.notes}
        onChange={(event) => update('notes', event.target.value)}
        rows={4}
        placeholder="Shipment notes"
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
        className="inline-flex rounded-xl bg-[#1a3a6b] px-5 py-3 text-sm font-semibold text-white hover:bg-[#132b50] disabled:opacity-60"
      >
        {loading ? 'Creating...' : 'Create shipment'}
      </button>
    </form>
  );
}

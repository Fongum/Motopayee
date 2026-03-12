'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ImportOrderStatus } from '@/lib/types';

type Props = {
  orderId: string;
  currentStatus: ImportOrderStatus;
  destinationPort?: string | null;
  destinationCity?: string | null;
  cancellationReason?: string | null;
};

const STATUSES: ImportOrderStatus[] = [
  'quote_sent',
  'deposit_pending',
  'deposit_paid',
  'purchase_authorized',
  'purchased',
  'docs_pending',
  'shipping_booked',
  'in_transit',
  'arrived_cameroon',
  'ready_for_clearing',
  'clearing_in_progress',
  'completed',
  'cancelled',
  'refund_pending',
  'refunded',
  'disputed',
];

export default function OrderStatusForm({
  orderId,
  currentStatus,
  destinationPort,
  destinationCity,
  cancellationReason,
}: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<ImportOrderStatus>(currentStatus);
  const [port, setPort] = useState(destinationPort ?? '');
  const [city, setCity] = useState(destinationCity ?? '');
  const [reason, setReason] = useState(cancellationReason ?? '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    const response = await fetch(`/api/admin/imports/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status,
        destination_port: port.trim() || null,
        destination_city: city.trim() || null,
        cancellation_reason: status === 'cancelled' ? reason.trim() || null : null,
      }),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      setMessage({ type: 'error', text: data?.error ?? 'Unable to update order status.' });
      setLoading(false);
      return;
    }

    setMessage({ type: 'success', text: 'Order updated.' });
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="status" className="mb-2 block text-sm font-medium text-gray-700">
          Status
        </label>
        <select
          id="status"
          value={status}
          onChange={(event) => setStatus(event.target.value as ImportOrderStatus)}
          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-[#1a3a6b] focus:outline-none"
        >
          {STATUSES.map((value) => (
            <option key={value} value={value}>
              {value.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="port" className="mb-2 block text-sm font-medium text-gray-700">
            Destination port
          </label>
          <input
            id="port"
            value={port}
            onChange={(event) => setPort(event.target.value)}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-[#1a3a6b] focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="city" className="mb-2 block text-sm font-medium text-gray-700">
            Destination city
          </label>
          <input
            id="city"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-[#1a3a6b] focus:outline-none"
          />
        </div>
      </div>

      {status === 'cancelled' && (
        <div>
          <label htmlFor="reason" className="mb-2 block text-sm font-medium text-gray-700">
            Cancellation reason
          </label>
          <textarea
            id="reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={4}
            className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:border-[#1a3a6b] focus:outline-none"
          />
        </div>
      )}

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
        {loading ? 'Saving...' : 'Save order status'}
      </button>
    </form>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { InspectionRequestStatus } from '@/lib/types';

const STATUSES: { value: InspectionRequestStatus; label: string }[] = [
  { value: 'submitted', label: 'Nouveau' },
  { value: 'contacted', label: 'Contacte' },
  { value: 'quoted', label: 'Devis envoye' },
  { value: 'paid', label: 'Paye' },
  { value: 'scheduled', label: 'Programme' },
  { value: 'completed', label: 'Termine' },
  { value: 'cancelled', label: 'Annule' },
];

export default function InspectionRequestActions({
  requestId,
  currentStatus,
  currentInspectorId,
  feeXaf,
  requesterPhone,
  paymentStatus,
  inspectors,
}: {
  requestId: string;
  currentStatus: InspectionRequestStatus;
  currentInspectorId?: string | null;
  feeXaf: number;
  requesterPhone: string;
  paymentStatus?: string | null;
  inspectors: Array<{ id: string; label: string }>;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<InspectionRequestStatus>(currentStatus);
  const [inspectorId, setInspectorId] = useState(currentInspectorId ?? '');
  const [paymentProvider, setPaymentProvider] = useState<'mtn_momo' | 'orange_money' | 'cash' | 'bank_transfer'>('mtn_momo');
  const [paymentPhone, setPaymentPhone] = useState(requesterPhone);
  const [paymentAmount, setPaymentAmount] = useState(String(Math.round(feeXaf)));
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const paymentInProgress = paymentStatus === 'pending' || paymentStatus === 'processing';
  const paymentComplete = paymentStatus === 'successful' || currentStatus === 'paid' || currentStatus === 'scheduled' || currentStatus === 'completed';

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    const response = await fetch(`/api/admin/inspection-requests/${requestId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status,
        inspector_id: inspectorId || undefined,
        note: note.trim() || undefined,
      }),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      setMessage({ type: 'error', text: data?.error ?? 'Unable to update request.' });
      setLoading(false);
      return;
    }

    setMessage({ type: 'success', text: 'Request updated.' });
    setNote('');
    setLoading(false);
    router.refresh();
  }

  async function requestPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPaymentLoading(true);
    setMessage(null);

    const response = await fetch(`/api/admin/inspection-requests/${requestId}/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: paymentProvider,
        phone: paymentPhone,
        amount: Math.round(Number(paymentAmount)),
      }),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      setMessage({ type: 'error', text: data?.error ?? 'Unable to request payment.' });
      setPaymentLoading(false);
      return;
    }

    setMessage({ type: 'success', text: paymentProvider === 'cash' || paymentProvider === 'bank_transfer' ? 'Payment recorded.' : 'Payment request sent.' });
    setPaymentLoading(false);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <form onSubmit={requestPayment} className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <select
            value={paymentProvider}
            onChange={(event) => setPaymentProvider(event.target.value as typeof paymentProvider)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-[#1a3a6b] focus:outline-none"
          >
            <option value="mtn_momo">MTN MoMo</option>
            <option value="orange_money">Orange Money</option>
            <option value="cash">Cash</option>
            <option value="bank_transfer">Bank transfer</option>
          </select>
          <input
            value={paymentAmount}
            onChange={(event) => setPaymentAmount(event.target.value)}
            inputMode="numeric"
            className="rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-[#1a3a6b] focus:outline-none"
          />
          <input
            value={paymentPhone}
            onChange={(event) => setPaymentPhone(event.target.value)}
            placeholder="Payment phone"
            className="rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-[#1a3a6b] focus:outline-none"
          />
          <button
            type="submit"
            disabled={paymentLoading || paymentInProgress || paymentComplete || currentStatus === 'cancelled'}
            className="rounded-lg bg-[#3d9e3d] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#2d8a2d] disabled:opacity-50"
          >
            {paymentLoading ? '...' : paymentInProgress ? 'Paiement en cours' : paymentComplete ? 'Paiement recu' : 'Paiement inspection'}
          </button>
        </div>
      </form>

      <form onSubmit={submit} className="space-y-2">
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as InspectionRequestStatus)}
            className="min-w-36 rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-[#1a3a6b] focus:outline-none"
          >
            {STATUSES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={500}
            placeholder="Note interne optionnelle"
            className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-[#1a3a6b] focus:outline-none"
          />
          <select
            value={inspectorId}
            onChange={(event) => setInspectorId(event.target.value)}
            className="min-w-44 rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-[#1a3a6b] focus:outline-none"
          >
            <option value="">Inspecteur non assigne</option>
            {inspectors.map((inspector) => (
              <option key={inspector.id} value={inspector.id}>
                {inspector.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-[#1a3a6b] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#132b50] disabled:opacity-50"
          >
            {loading ? '...' : 'Mettre a jour'}
          </button>
        </div>
      </form>
      {message && (
        <p className={`text-xs ${message.type === 'error' ? 'text-red-600' : 'text-green-700'}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}

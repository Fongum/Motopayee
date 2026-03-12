'use client';

import { useState } from 'react';
import type { ImportPayment } from '@/lib/types';

type Props = {
  orderId: string;
  orderStatus: string;
  depositAmount: number;
  buyerPhone?: string | null;
  existingPayments?: ImportPayment[];
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  processing: 'bg-blue-100 text-blue-700',
  successful: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-600',
};

function formatXAF(value: number) {
  return new Intl.NumberFormat('fr-CM', {
    style: 'currency',
    currency: 'XAF',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function ImportPaymentRequestForm({
  orderId,
  orderStatus,
  depositAmount,
  buyerPhone,
  existingPayments = [],
}: Props) {
  const [provider, setProvider] = useState<'mtn_momo' | 'orange_money'>('mtn_momo');
  const [phone, setPhone] = useState(buyerPhone ?? '');
  const [payments, setPayments] = useState<ImportPayment[]>(existingPayments);
  const [loading, setLoading] = useState(false);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const canRequest = ['deposit_pending', 'quote_sent'].includes(orderStatus);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/imports/orders/${orderId}/payments/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, phone }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage({ type: 'error', text: data.error ?? 'Unable to request deposit payment.' });
      } else {
        const instructions = data.payment?.meta?.instructions as string | undefined;
        setMessage({
          type: 'success',
          text: instructions ?? `Payment request sent. Reference: ${data.payment?.id ?? ''}`,
        });
        if (data.payment) {
          setPayments((current) => [data.payment, ...current]);
        }
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error.' });
    } finally {
      setLoading(false);
    }
  }

  async function checkStatus(paymentId: string) {
    setCheckingId(paymentId);
    try {
      const response = await fetch(`/api/import-payments/${paymentId}/status`);
      const data = await response.json();
      if (response.ok) {
        setPayments((current) => current.map((payment) => (payment.id === paymentId ? data : payment)));
      }
    } finally {
      setCheckingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {payments.length > 0 && (
        <div className="space-y-3">
          {payments.map((payment) => (
            <div
              key={payment.id}
              className="flex flex-col gap-3 rounded-2xl border border-gray-200 px-4 py-4 text-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-gray-900">{formatXAF(payment.amount)} · {payment.provider}</p>
                <p className="mt-1 text-xs text-gray-500">{payment.payment_type.replace(/_/g, ' ')} · {payment.phone}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_COLORS[payment.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {payment.status}
                </span>
                {payment.status === 'pending' && (
                  <button
                    onClick={() => checkStatus(payment.id)}
                    disabled={checkingId === payment.id}
                    className="text-xs font-medium text-blue-600 hover:underline disabled:opacity-60"
                  >
                    {checkingId === payment.id ? 'Checking...' : 'Check'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {canRequest ? (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-[2rem] border border-gray-200 bg-white p-5 shadow-sm">
          <div className="rounded-2xl bg-gray-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Reservation deposit due</p>
            <p className="mt-1 text-2xl font-bold text-[#1a3a6b]">{formatXAF(depositAmount)}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="provider" className="mb-2 block text-sm font-medium text-gray-700">
                Provider
              </label>
              <select
                id="provider"
                value={provider}
                onChange={(event) => setProvider(event.target.value as 'mtn_momo' | 'orange_money')}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-[#1a3a6b] focus:outline-none"
              >
                <option value="mtn_momo">MTN MoMo</option>
                <option value="orange_money">Orange Money</option>
              </select>
            </div>

            <div>
              <label htmlFor="phone" className="mb-2 block text-sm font-medium text-gray-700">
                Phone
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                required
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-[#1a3a6b] focus:outline-none"
              />
            </div>
          </div>

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
            {loading ? 'Sending...' : 'Request deposit payment'}
          </button>
        </form>
      ) : (
        <p className="text-sm text-gray-500">Deposit payment is no longer available for this order status.</p>
      )}
    </div>
  );
}

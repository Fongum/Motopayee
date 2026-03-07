'use client';

import { useState } from 'react';
import type { Payment } from '@/lib/types';

interface Props {
  applicationId: string;
  applicationStatus: string;
  askingPrice: number;
  buyerPhone?: string | null;
  existingPayments?: Payment[];
}

const PROVIDER_LABELS: Record<string, string> = {
  mtn_momo: 'MTN MoMo',
  orange_money: 'Orange Money',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  processing: 'bg-blue-100 text-blue-700',
  successful: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-600',
};

function formatXAF(n: number) {
  return new Intl.NumberFormat('fr-CM', {
    style: 'currency', currency: 'XAF', maximumFractionDigits: 0,
  }).format(n);
}

export default function PaymentRequestForm({
  applicationId,
  applicationStatus,
  askingPrice,
  buyerPhone,
  existingPayments = [],
}: Props) {
  const [provider, setProvider] = useState<'mtn_momo' | 'orange_money'>('mtn_momo');
  const [phone, setPhone] = useState(buyerPhone ?? '');
  const [amount, setAmount] = useState(askingPrice);
  const [paymentType, setPaymentType] = useState<'down_payment' | 'full_payment' | 'installment'>('down_payment');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [payments, setPayments] = useState<Payment[]>(existingPayments);
  const [checkingId, setCheckingId] = useState<string | null>(null);

  const canRequest = applicationStatus === 'approved';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/payments/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application_id: applicationId,
          provider,
          phone,
          amount,
          payment_type: paymentType,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error ?? 'Erreur lors de la demande.' });
      } else {
        const instructions = data.payment?.meta?.instructions as string | undefined;
        setMessage({
          type: 'success',
          text: instructions ?? `Demande envoyée. ID: ${data.payment?.id ?? ''}`,
        });
        if (data.payment) setPayments(prev => [data.payment, ...prev]);
      }
    } catch {
      setMessage({ type: 'error', text: 'Erreur réseau.' });
    } finally {
      setLoading(false);
    }
  }

  async function checkStatus(paymentId: string) {
    setCheckingId(paymentId);
    try {
      const res = await fetch(`/api/payments/${paymentId}/status`);
      const data = await res.json();
      if (res.ok) {
        setPayments(prev =>
          prev.map(p => (p.id === paymentId ? { ...p, status: data.status } : p))
        );
      }
    } finally {
      setCheckingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {payments.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            Paiements ({payments.length})
          </h3>
          <div className="space-y-2">
            {payments.map(p => (
              <div
                key={p.id}
                className="flex items-center justify-between text-sm border border-gray-100 rounded-lg px-3 py-2"
              >
                <div>
                  <span className="font-medium text-gray-800">
                    {PROVIDER_LABELS[p.provider] ?? p.provider}
                  </span>
                  <span className="text-gray-500 ml-2">{formatXAF(p.amount)}</span>
                  <span className="text-gray-400 ml-2">
                    · {p.payment_type.replace(/_/g, ' ')}
                  </span>
                  <span className="text-gray-400 ml-2">· {p.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[p.status] ?? 'bg-gray-100 text-gray-600'}`}
                  >
                    {p.status}
                  </span>
                  {p.status === 'pending' && (
                    <button
                      onClick={() => checkStatus(p.id)}
                      disabled={checkingId === p.id}
                      className="text-xs text-blue-600 hover:underline disabled:opacity-50"
                    >
                      {checkingId === p.id ? '...' : 'Vérifier'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {canRequest ? (
        <form onSubmit={handleSubmit} className="space-y-3 border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-700">
            Nouvelle demande de paiement
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Opérateur</label>
              <select
                value={provider}
                onChange={e => setProvider(e.target.value as 'mtn_momo' | 'orange_money')}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
              >
                <option value="mtn_momo">MTN MoMo</option>
                <option value="orange_money">Orange Money</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Type</label>
              <select
                value={paymentType}
                onChange={e =>
                  setPaymentType(e.target.value as 'down_payment' | 'full_payment' | 'installment')
                }
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
              >
                <option value="down_payment">Apport initial</option>
                <option value="full_payment">Paiement complet</option>
                <option value="installment">Mensualité</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Téléphone</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="6XXXXXXXX"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Montant (XAF)</label>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(Number(e.target.value))}
                min={1}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
                required
              />
            </div>
          </div>
          {message && (
            <p
              className={`text-sm px-3 py-2 rounded-lg ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {message.text}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1a3a6b] text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-[#142d54] disabled:opacity-50"
          >
            {loading ? 'Envoi...' : 'Envoyer la demande de paiement'}
          </button>
        </form>
      ) : (
        <p className="text-xs text-gray-400">
          Les paiements ne peuvent être initiés que pour les demandes au statut &quot;Approuvé&quot;.
        </p>
      )}
    </div>
  );
}

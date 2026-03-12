'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  requestId: string;
};

type FormState = {
  partnerName: string;
  currency: string;
  fxRateToXaf: string;
  vehiclePrice: string;
  auctionFee: string;
  inlandTransportFee: string;
  shippingFee: string;
  insuranceFee: string;
  documentationFee: string;
  motopayeeFee: string;
  estimatedCustomsFee: string;
  estimatedPortFee: string;
  reservationDepositAmount: string;
  expiresAt: string;
  quoteTerms: string;
};

function formatDateTimeLocal(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  const hours = String(value.getHours()).padStart(2, '0');
  const minutes = String(value.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

const INITIAL_STATE: FormState = {
  partnerName: 'MotoPayee US Partner',
  currency: 'XAF',
  fxRateToXaf: '',
  vehiclePrice: '',
  auctionFee: '0',
  inlandTransportFee: '0',
  shippingFee: '0',
  insuranceFee: '0',
  documentationFee: '0',
  motopayeeFee: '0',
  estimatedCustomsFee: '0',
  estimatedPortFee: '0',
  reservationDepositAmount: '0',
  expiresAt: formatDateTimeLocal(new Date(Date.now() + 72 * 60 * 60 * 1000)),
  quoteTerms:
    'Quote is subject to source availability, document validation, and shipping conditions. Buyer-managed clearing does not cover buyer-caused delays or penalties.',
};

function asNumber(value: string) {
  return value.trim() ? Number(value) : 0;
}

function formatXAF(value: number) {
  return new Intl.NumberFormat('fr-CM', {
    style: 'currency',
    currency: 'XAF',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function QuoteComposer({ requestId }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  const totalEstimatedXaf = [
    form.vehiclePrice,
    form.auctionFee,
    form.inlandTransportFee,
    form.shippingFee,
    form.insuranceFee,
    form.documentationFee,
    form.motopayeeFee,
    form.estimatedCustomsFee,
    form.estimatedPortFee,
  ].reduce((sum, value) => sum + asNumber(value), 0);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    const expiresAt = new Date(form.expiresAt);
    if (Number.isNaN(expiresAt.getTime())) {
      setError('Please provide a valid quote expiry date.');
      setSubmitting(false);
      return;
    }

    const payload = {
      request_id: requestId,
      partner_name: form.partnerName.trim(),
      currency: form.currency.trim() || 'XAF',
      fx_rate_to_xaf: form.fxRateToXaf.trim() ? Number(form.fxRateToXaf) : null,
      vehicle_price: asNumber(form.vehiclePrice),
      auction_fee: asNumber(form.auctionFee),
      inland_transport_fee: asNumber(form.inlandTransportFee),
      shipping_fee: asNumber(form.shippingFee),
      insurance_fee: asNumber(form.insuranceFee),
      documentation_fee: asNumber(form.documentationFee),
      motopayee_fee: asNumber(form.motopayeeFee),
      estimated_customs_fee: asNumber(form.estimatedCustomsFee),
      estimated_port_fee: asNumber(form.estimatedPortFee),
      reservation_deposit_amount: asNumber(form.reservationDepositAmount),
      quote_terms: form.quoteTerms.trim() || null,
      expires_at: expiresAt.toISOString(),
    };

    const response = await fetch('/api/admin/imports/quotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      setError(data?.error ?? 'Unable to create quote.');
      setSubmitting(false);
      return;
    }

    setSuccess(`Quote v${data?.quote?.quote_version ?? ''} created successfully.`);
    setSubmitting(false);
    setForm((current) => ({
      ...current,
      auctionFee: '0',
      inlandTransportFee: '0',
      shippingFee: '0',
      insuranceFee: '0',
      documentationFee: '0',
      motopayeeFee: '0',
      estimatedCustomsFee: '0',
      estimatedPortFee: '0',
      expiresAt: formatDateTimeLocal(new Date(Date.now() + 72 * 60 * 60 * 1000)),
    }));
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="partnerName" className="mb-2 block text-sm font-medium text-gray-700">
            Partner name
          </label>
          <input
            id="partnerName"
            value={form.partnerName}
            onChange={(event) => update('partnerName', event.target.value)}
            required
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-[#1a3a6b] focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="expiresAt" className="mb-2 block text-sm font-medium text-gray-700">
            Quote expires
          </label>
          <input
            id="expiresAt"
            type="datetime-local"
            value={form.expiresAt}
            onChange={(event) => update('expiresAt', event.target.value)}
            required
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-[#1a3a6b] focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="currency" className="mb-2 block text-sm font-medium text-gray-700">
            Display currency
          </label>
          <select
            id="currency"
            value={form.currency}
            onChange={(event) => update('currency', event.target.value)}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-[#1a3a6b] focus:outline-none"
          >
            <option value="XAF">XAF</option>
            <option value="USD">USD</option>
          </select>
        </div>

        <div>
          <label htmlFor="fxRateToXaf" className="mb-2 block text-sm font-medium text-gray-700">
            FX rate to XAF
          </label>
          <input
            id="fxRateToXaf"
            type="number"
            min="0"
            step="0.0001"
            value={form.fxRateToXaf}
            onChange={(event) => update('fxRateToXaf', event.target.value)}
            placeholder="Optional snapshot"
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-[#1a3a6b] focus:outline-none"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          ['vehiclePrice', 'Vehicle price'],
          ['auctionFee', 'Auction fee'],
          ['inlandTransportFee', 'Inland transport'],
          ['shippingFee', 'Shipping'],
          ['insuranceFee', 'Insurance'],
          ['documentationFee', 'Documentation'],
          ['motopayeeFee', 'MotoPayee fee'],
          ['estimatedCustomsFee', 'Estimated customs'],
          ['estimatedPortFee', 'Estimated port fee'],
          ['reservationDepositAmount', 'Reservation deposit'],
        ].map(([key, label]) => (
          <div key={key}>
            <label htmlFor={key} className="mb-2 block text-sm font-medium text-gray-700">
              {label} (XAF)
            </label>
            <input
              id={key}
              type="number"
              min="0"
              step="1000"
              value={form[key as keyof FormState] as string}
              onChange={(event) => update(key as keyof FormState, event.target.value)}
              required={key === 'vehiclePrice'}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-[#1a3a6b] focus:outline-none"
            />
          </div>
        ))}
      </div>

      <div>
        <label htmlFor="quoteTerms" className="mb-2 block text-sm font-medium text-gray-700">
          Quote terms
        </label>
        <textarea
          id="quoteTerms"
          value={form.quoteTerms}
          onChange={(event) => update('quoteTerms', event.target.value)}
          rows={5}
          className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:border-[#1a3a6b] focus:outline-none"
        />
      </div>

      <div className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Estimated total</p>
        <p className="mt-1 text-2xl font-bold text-[#1a3a6b]">{formatXAF(totalEstimatedXaf)}</p>
        <p className="mt-1 text-xs text-gray-600">All line items are stored as customer-facing values for this MVP.</p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex rounded-xl bg-[#1a3a6b] px-5 py-3 text-sm font-semibold text-white hover:bg-[#132b50] disabled:opacity-60"
      >
        {submitting ? 'Creating quote...' : 'Create quote'}
      </button>
    </form>
  );
}

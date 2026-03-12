'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { FuelType, TransmissionType } from '@/lib/types';

type FormState = {
  partnerName: string;
  sourceCountry: string;
  sourceType: 'auction' | 'dealer' | 'private';
  status: 'draft' | 'active';
  headline: string;
  make: string;
  model: string;
  year: string;
  mileageKm: string;
  fuelType: '' | FuelType;
  transmission: '' | TransmissionType;
  color: string;
  titleStatus: string;
  conditionSummary: string;
  damageSummary: string;
  externalUrl: string;
  externalRef: string;
  lotNumber: string;
  coverImageUrl: string;
  mediaUrls: string;
  vehiclePrice: string;
  auctionFee: string;
  inlandTransportFee: string;
  shippingFee: string;
  insuranceFee: string;
  documentationFee: string;
  motopayeeFee: string;
  estimatedCustomsFee: string;
  estimatedPortFee: string;
  auctionEndAt: string;
};

const INITIAL_STATE: FormState = {
  partnerName: 'MotoPayee US Partner',
  sourceCountry: 'US',
  sourceType: 'auction',
  status: 'active',
  headline: '',
  make: '',
  model: '',
  year: '',
  mileageKm: '',
  fuelType: '',
  transmission: '',
  color: '',
  titleStatus: '',
  conditionSummary: '',
  damageSummary: '',
  externalUrl: '',
  externalRef: '',
  lotNumber: '',
  coverImageUrl: '',
  mediaUrls: '',
  vehiclePrice: '',
  auctionFee: '0',
  inlandTransportFee: '0',
  shippingFee: '0',
  insuranceFee: '0',
  documentationFee: '0',
  motopayeeFee: '0',
  estimatedCustomsFee: '0',
  estimatedPortFee: '0',
  auctionEndAt: '',
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

export default function AdminOfferForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

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

    const mediaUrls = form.mediaUrls
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);

    const response = await fetch('/api/admin/imports/offers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        partner_name: form.partnerName.trim(),
        source_country: form.sourceCountry.trim(),
        source_type: form.sourceType,
        status: form.status,
        headline: form.headline.trim(),
        make: form.make.trim(),
        model: form.model.trim(),
        year: Number(form.year),
        mileage_km: form.mileageKm ? Number(form.mileageKm) : null,
        fuel_type: form.fuelType || null,
        transmission: form.transmission || null,
        color: form.color.trim() || null,
        title_status: form.titleStatus.trim() || null,
        condition_summary: form.conditionSummary.trim() || null,
        damage_summary: form.damageSummary.trim() || null,
        external_url: form.externalUrl.trim() || null,
        external_ref: form.externalRef.trim() || null,
        lot_number: form.lotNumber.trim() || null,
        cover_image_url: form.coverImageUrl.trim() || null,
        media_urls: mediaUrls,
        vehicle_price: asNumber(form.vehiclePrice),
        auction_fee: asNumber(form.auctionFee),
        inland_transport_fee: asNumber(form.inlandTransportFee),
        shipping_fee: asNumber(form.shippingFee),
        insurance_fee: asNumber(form.insuranceFee),
        documentation_fee: asNumber(form.documentationFee),
        motopayee_fee: asNumber(form.motopayeeFee),
        estimated_customs_fee: asNumber(form.estimatedCustomsFee),
        estimated_port_fee: asNumber(form.estimatedPortFee),
        auction_end_at: form.auctionEndAt ? new Date(form.auctionEndAt).toISOString() : null,
      }),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      setError(data?.error ?? 'Unable to create offer.');
      setSubmitting(false);
      return;
    }

    setForm(INITIAL_STATE);
    setSubmitting(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="headline" className="mb-2 block text-sm font-medium text-gray-700">
            Headline
          </label>
          <input
            id="headline"
            value={form.headline}
            onChange={(event) => update('headline', event.target.value)}
            required
            placeholder="2019 Toyota RAV4 XLE - clean title"
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-[#1a3a6b] focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="partnerName" className="mb-2 block text-sm font-medium text-gray-700">
            Partner
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
          <label htmlFor="make" className="mb-2 block text-sm font-medium text-gray-700">
            Make
          </label>
          <input
            id="make"
            value={form.make}
            onChange={(event) => update('make', event.target.value)}
            required
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-[#1a3a6b] focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="model" className="mb-2 block text-sm font-medium text-gray-700">
            Model
          </label>
          <input
            id="model"
            value={form.model}
            onChange={(event) => update('model', event.target.value)}
            required
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-[#1a3a6b] focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="year" className="mb-2 block text-sm font-medium text-gray-700">
            Year
          </label>
          <input
            id="year"
            type="number"
            min="1960"
            max="2030"
            value={form.year}
            onChange={(event) => update('year', event.target.value)}
            required
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-[#1a3a6b] focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="mileageKm" className="mb-2 block text-sm font-medium text-gray-700">
            Mileage (km)
          </label>
          <input
            id="mileageKm"
            type="number"
            min="0"
            value={form.mileageKm}
            onChange={(event) => update('mileageKm', event.target.value)}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-[#1a3a6b] focus:outline-none"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label htmlFor="sourceType" className="mb-2 block text-sm font-medium text-gray-700">
            Source type
          </label>
          <select
            id="sourceType"
            value={form.sourceType}
            onChange={(event) => update('sourceType', event.target.value as FormState['sourceType'])}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-[#1a3a6b] focus:outline-none"
          >
            <option value="auction">Auction</option>
            <option value="dealer">Dealer</option>
            <option value="private">Private</option>
          </select>
        </div>
        <div>
          <label htmlFor="status" className="mb-2 block text-sm font-medium text-gray-700">
            Status
          </label>
          <select
            id="status"
            value={form.status}
            onChange={(event) => update('status', event.target.value as FormState['status'])}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-[#1a3a6b] focus:outline-none"
          >
            <option value="active">Active</option>
            <option value="draft">Draft</option>
          </select>
        </div>
        <div>
          <label htmlFor="sourceCountry" className="mb-2 block text-sm font-medium text-gray-700">
            Source country
          </label>
          <input
            id="sourceCountry"
            value={form.sourceCountry}
            onChange={(event) => update('sourceCountry', event.target.value)}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-[#1a3a6b] focus:outline-none"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label htmlFor="fuelType" className="mb-2 block text-sm font-medium text-gray-700">
            Fuel
          </label>
          <select
            id="fuelType"
            value={form.fuelType}
            onChange={(event) => update('fuelType', event.target.value as FormState['fuelType'])}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-[#1a3a6b] focus:outline-none"
          >
            <option value="">Unknown</option>
            <option value="petrol">Petrol</option>
            <option value="diesel">Diesel</option>
            <option value="hybrid">Hybrid</option>
            <option value="electric">Electric</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label htmlFor="transmission" className="mb-2 block text-sm font-medium text-gray-700">
            Transmission
          </label>
          <select
            id="transmission"
            value={form.transmission}
            onChange={(event) => update('transmission', event.target.value as FormState['transmission'])}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-[#1a3a6b] focus:outline-none"
          >
            <option value="">Unknown</option>
            <option value="automatic">Automatic</option>
            <option value="manual">Manual</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label htmlFor="color" className="mb-2 block text-sm font-medium text-gray-700">
            Color
          </label>
          <input
            id="color"
            value={form.color}
            onChange={(event) => update('color', event.target.value)}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-[#1a3a6b] focus:outline-none"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <input
          value={form.titleStatus}
          onChange={(event) => update('titleStatus', event.target.value)}
          placeholder="Title status"
          className="rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-[#1a3a6b] focus:outline-none"
        />
        <input
          value={form.externalRef}
          onChange={(event) => update('externalRef', event.target.value)}
          placeholder="External reference"
          className="rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-[#1a3a6b] focus:outline-none"
        />
        <input
          value={form.lotNumber}
          onChange={(event) => update('lotNumber', event.target.value)}
          placeholder="Lot number"
          className="rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-[#1a3a6b] focus:outline-none"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <textarea
          value={form.conditionSummary}
          onChange={(event) => update('conditionSummary', event.target.value)}
          rows={4}
          placeholder="Condition summary"
          className="rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:border-[#1a3a6b] focus:outline-none"
        />
        <textarea
          value={form.damageSummary}
          onChange={(event) => update('damageSummary', event.target.value)}
          rows={4}
          placeholder="Damage summary"
          className="rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:border-[#1a3a6b] focus:outline-none"
        />
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
              required={key === 'vehiclePrice'}
              value={form[key as keyof FormState] as string}
              onChange={(event) => update(key as keyof FormState, event.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-[#1a3a6b] focus:outline-none"
            />
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <input
          value={form.externalUrl}
          onChange={(event) => update('externalUrl', event.target.value)}
          placeholder="Source URL"
          className="rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-[#1a3a6b] focus:outline-none"
        />
        <input
          value={form.coverImageUrl}
          onChange={(event) => update('coverImageUrl', event.target.value)}
          placeholder="Cover image URL"
          className="rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-[#1a3a6b] focus:outline-none"
        />
      </div>

      <textarea
        value={form.mediaUrls}
        onChange={(event) => update('mediaUrls', event.target.value)}
        rows={3}
        placeholder="Additional image URLs, one per line"
        className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:border-[#1a3a6b] focus:outline-none"
      />

      <input
        type="datetime-local"
        value={form.auctionEndAt}
        onChange={(event) => update('auctionEndAt', event.target.value)}
        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-[#1a3a6b] focus:outline-none"
      />

      <div className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Estimated total</p>
        <p className="mt-1 text-2xl font-bold text-[#1a3a6b]">{formatXAF(totalEstimatedXaf)}</p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex rounded-xl bg-[#1a3a6b] px-5 py-3 text-sm font-semibold text-white hover:bg-[#132b50] disabled:opacity-60"
      >
        {submitting ? 'Publishing...' : 'Create offer'}
      </button>
    </form>
  );
}

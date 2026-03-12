'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ImportBodyType, FuelType, TransmissionType } from '@/lib/types';

type FormState = {
  offerId: string;
  make: string;
  model: string;
  yearMin: string;
  yearMax: string;
  budgetMaxXaf: string;
  bodyType: '' | ImportBodyType;
  fuelType: '' | FuelType;
  transmission: '' | TransmissionType;
  colorPreferences: string;
  notes: string;
};

type InitialValues = Partial<FormState>;

type Props = {
  initialValues?: InitialValues;
};

const BODY_TYPES: Array<{ value: '' | ImportBodyType; label: string }> = [
  { value: '', label: 'Any body type' },
  { value: 'sedan', label: 'Sedan' },
  { value: 'suv', label: 'SUV' },
  { value: 'pickup', label: 'Pickup' },
  { value: 'hatchback', label: 'Hatchback' },
  { value: 'van', label: 'Van' },
  { value: 'coupe', label: 'Coupe' },
  { value: 'wagon', label: 'Wagon' },
  { value: 'other', label: 'Other' },
];

const FUEL_TYPES: Array<{ value: '' | FuelType; label: string }> = [
  { value: '', label: 'Any fuel' },
  { value: 'petrol', label: 'Petrol' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'electric', label: 'Electric' },
  { value: 'other', label: 'Other' },
];

const TRANSMISSIONS: Array<{ value: '' | TransmissionType; label: string }> = [
  { value: '', label: 'Any transmission' },
  { value: 'automatic', label: 'Automatic' },
  { value: 'manual', label: 'Manual' },
  { value: 'other', label: 'Other' },
];

const INITIAL_STATE: FormState = {
  offerId: '',
  make: '',
  model: '',
  yearMin: '',
  yearMax: '',
  budgetMaxXaf: '',
  bodyType: '',
  fuelType: '',
  transmission: '',
  colorPreferences: '',
  notes: '',
};

export default function ImportRequestForm({ initialValues }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({ ...INITIAL_STATE, ...initialValues });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    const payload = {
      mode: form.offerId ? 'offer' : 'custom',
      source_country: 'US',
      offer_id: form.offerId || null,
      make: form.make.trim(),
      model: form.model.trim() || null,
      year_min: form.yearMin ? Number(form.yearMin) : null,
      year_max: form.yearMax ? Number(form.yearMax) : null,
      budget_max_xaf: Number(form.budgetMaxXaf),
      body_type: form.bodyType || null,
      fuel_type: form.fuelType || null,
      transmission: form.transmission || null,
      color_preferences: form.colorPreferences.trim() || null,
      notes: form.notes.trim() || null,
    };

    const response = await fetch('/api/imports/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      setError(data?.error ?? 'Unable to submit your import request.');
      setSubmitting(false);
      return;
    }

    router.push('/me/import-requests?submitted=1');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2">
        {form.offerId && (
          <input type="hidden" value={form.offerId} readOnly />
        )}
        <div>
          <label htmlFor="make" className="block text-sm font-medium text-gray-700 mb-2">
            Make
          </label>
          <input
            id="make"
            value={form.make}
            onChange={(event) => update('make', event.target.value)}
            required
            placeholder="Toyota"
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-[#1a3a6b] focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-2">
            Model
          </label>
          <input
            id="model"
            value={form.model}
            onChange={(event) => update('model', event.target.value)}
            placeholder="RAV4"
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-[#1a3a6b] focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="yearMin" className="block text-sm font-medium text-gray-700 mb-2">
            Minimum year
          </label>
          <input
            id="yearMin"
            type="number"
            min="1960"
            max="2030"
            value={form.yearMin}
            onChange={(event) => update('yearMin', event.target.value)}
            placeholder="2016"
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-[#1a3a6b] focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="yearMax" className="block text-sm font-medium text-gray-700 mb-2">
            Maximum year
          </label>
          <input
            id="yearMax"
            type="number"
            min="1960"
            max="2030"
            value={form.yearMax}
            onChange={(event) => update('yearMax', event.target.value)}
            placeholder="2021"
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-[#1a3a6b] focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="budgetMaxXaf" className="block text-sm font-medium text-gray-700 mb-2">
            Budget max (XAF)
          </label>
          <input
            id="budgetMaxXaf"
            type="number"
            min="500000"
            step="1000"
            value={form.budgetMaxXaf}
            onChange={(event) => update('budgetMaxXaf', event.target.value)}
            required
            placeholder="12000000"
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-[#1a3a6b] focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="bodyType" className="block text-sm font-medium text-gray-700 mb-2">
            Body type
          </label>
          <select
            id="bodyType"
            value={form.bodyType}
            onChange={(event) => update('bodyType', event.target.value as FormState['bodyType'])}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-[#1a3a6b] focus:outline-none"
          >
            {BODY_TYPES.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="fuelType" className="block text-sm font-medium text-gray-700 mb-2">
            Fuel
          </label>
          <select
            id="fuelType"
            value={form.fuelType}
            onChange={(event) => update('fuelType', event.target.value as FormState['fuelType'])}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-[#1a3a6b] focus:outline-none"
          >
            {FUEL_TYPES.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="transmission" className="block text-sm font-medium text-gray-700 mb-2">
            Transmission
          </label>
          <select
            id="transmission"
            value={form.transmission}
            onChange={(event) => update('transmission', event.target.value as FormState['transmission'])}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-[#1a3a6b] focus:outline-none"
          >
            {TRANSMISSIONS.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="colorPreferences" className="block text-sm font-medium text-gray-700 mb-2">
            Color preferences
          </label>
          <input
            id="colorPreferences"
            value={form.colorPreferences}
            onChange={(event) => update('colorPreferences', event.target.value)}
            placeholder="White, black, silver"
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-[#1a3a6b] focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
          Additional notes
        </label>
        <textarea
          id="notes"
          value={form.notes}
          onChange={(event) => update('notes', event.target.value)}
          rows={5}
          placeholder="Preferred mileage, title preference, auction-only, arrival deadline, etc."
          className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:border-[#1a3a6b] focus:outline-none"
        />
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-4 rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-[#1a3a6b]">US import request</p>
          <p className="text-xs text-gray-600">
            MotoPayee will review your criteria and prepare a quote from our trusted US sourcing partner.
          </p>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-[#1a3a6b] px-5 py-3 text-sm font-semibold text-white hover:bg-[#132b50] disabled:opacity-60"
        >
          {submitting ? 'Submitting...' : 'Send request'}
        </button>
      </div>
    </form>
  );
}

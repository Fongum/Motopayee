'use client';

import { useState } from 'react';

type LeadType = 'seller' | 'dealer' | 'rental_owner' | 'buyer' | 'renter' | 'mfi' | 'inspection' | 'other';

export default function LeadCaptureForm({
  leadType,
  source = 'website',
  defaultInterest,
  campaignName,
  compact = false,
}: {
  leadType: LeadType;
  source?: string;
  defaultInterest?: string;
  campaignName?: string;
  compact?: boolean;
}) {
  const [state, setState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState('submitting');
    setError('');

    const form = new FormData(event.currentTarget);
    const payload = {
      lead_type: leadType,
      source,
      name: String(form.get('name') ?? ''),
      business_name: String(form.get('business_name') ?? ''),
      phone: String(form.get('phone') ?? ''),
      email: String(form.get('email') ?? ''),
      city: String(form.get('city') ?? ''),
      interest: String(form.get('interest') ?? defaultInterest ?? ''),
      notes: String(form.get('notes') ?? ''),
      campaign_name: campaignName,
    };

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error ?? 'Submission failed.');
        setState('error');
        return;
      }
      event.currentTarget.reset();
      setState('success');
    } catch {
      setError('Network error.');
      setState('error');
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 text-left">
      {state === 'success' && (
        <div className="rounded-lg border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">
          Demande recue. MotoPayee vous contactera pour la suite.
        </div>
      )}
      {state === 'error' && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className={`grid gap-4 ${compact ? '' : 'md:grid-cols-2'}`}>
        <label className="block">
          <span className="text-xs font-medium text-gray-600">Nom</span>
          <input name="name" required className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </label>
        {!compact && (
          <label className="block">
            <span className="text-xs font-medium text-gray-600">Entreprise</span>
            <input name="business_name" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </label>
        )}
      </div>

      <div className={`grid gap-4 ${compact ? '' : 'md:grid-cols-3'}`}>
        <label className="block">
          <span className="text-xs font-medium text-gray-600">Telephone</span>
          <input name="phone" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-gray-600">Email</span>
          <input name="email" type="email" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-gray-600">Ville</span>
          <input name="city" placeholder="Ex: Yaounde" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </label>
      </div>

      <label className="block">
        <span className="text-xs font-medium text-gray-600">Objectif</span>
        <input
          name="interest"
          defaultValue={defaultInterest}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </label>

      <label className="block">
        <span className="text-xs font-medium text-gray-600">Notes</span>
        <textarea name="notes" rows={3} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </label>

      <button
        type="submit"
        disabled={state === 'submitting'}
        className="w-full rounded-xl bg-[#3d9e3d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2d8a2d] disabled:opacity-60"
      >
        {state === 'submitting' ? 'Envoi...' : 'Envoyer'}
      </button>
    </form>
  );
}

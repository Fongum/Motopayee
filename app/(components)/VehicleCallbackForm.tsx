'use client';

import { useState } from 'react';
import { trackContact } from '@/lib/track-contact';

/**
 * Callback request on a vehicle page. Most buyers tap WhatsApp and never send
 * the message, which leaves nothing to follow up on — this captures a name and
 * a number so staff can call back, and records the same contact intent as the
 * WhatsApp and call buttons.
 */
export default function VehicleCallbackForm({
  vehicleLabel,
  listingId,
  hireListingId,
  defaultName = '',
}: {
  vehicleLabel: string;
  listingId?: string;
  hireListingId?: string;
  defaultName?: string;
}) {
  const [state, setState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  const isRental = !!hireListingId;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setState('submitting');
    setError('');

    const data = new FormData(form);
    const phone = String(data.get('phone') ?? '').trim();
    const name = String(data.get('name') ?? '').trim();

    if (name.length < 2 || phone.length < 6) {
      setError('Entrez votre nom et un numéro de téléphone valide.');
      setState('error');
      return;
    }

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_type: isRental ? 'renter' : 'buyer',
          source: 'website',
          name,
          phone,
          interest: vehicleLabel,
          notes: String(data.get('message') ?? '').trim() || undefined,
          listing_id: listingId,
          hire_listing_id: hireListingId,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body?.error ?? 'Envoi impossible. Réessayez.');
        setState('error');
        return;
      }

      trackContact({
        surface: isRental ? 'hire' : 'listing',
        channel: 'form',
        listingId,
        hireListingId,
      });
      form.reset();
      setState('success');
    } catch {
      setError('Erreur réseau. Réessayez.');
      setState('error');
    }
  }

  if (state === 'success') {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
        <p className="font-semibold">Demande envoyée.</p>
        <p className="mt-1 text-green-700">
          {isRental
            ? 'MotoPayee vous rappelle pour confirmer les dates et les conditions.'
            : 'MotoPayee vous rappelle au sujet de ce véhicule.'}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-gray-800">Être rappelé</p>
        <p className="text-[11px] text-gray-500 mt-0.5">
          Laissez votre numéro, MotoPayee vous rappelle au sujet de ce véhicule.
        </p>
      </div>

      <input
        name="name"
        defaultValue={defaultName}
        placeholder="Votre nom"
        autoComplete="name"
        required
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3d9e3d]"
      />
      <input
        name="phone"
        type="tel"
        placeholder="Téléphone / WhatsApp"
        autoComplete="tel"
        required
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3d9e3d]"
      />
      <textarea
        name="message"
        rows={2}
        placeholder="Message (optionnel)"
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3d9e3d]"
      />

      {state === 'error' && <p className="text-xs text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={state === 'submitting'}
        className="w-full rounded-xl bg-[#1a3a6b] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#142d54] disabled:opacity-60"
      >
        {state === 'submitting' ? 'Envoi…' : 'Demander un rappel'}
      </button>
    </form>
  );
}

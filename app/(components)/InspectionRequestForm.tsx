'use client';

import { useState } from 'react';

interface InspectionRequestFormProps {
  listingId: string;
  vehicleLabel: string;
  defaultName?: string;
}

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

export default function InspectionRequestForm({
  listingId,
  vehicleLabel,
  defaultName = '',
}: InspectionRequestFormProps) {
  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [preferredWindow, setPreferredWindow] = useState('');
  const [notes, setNotes] = useState('');
  const [state, setState] = useState<SubmitState>('idle');
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setState('submitting');
    setError('');

    const response = await fetch('/api/inspection-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        listing_id: listingId,
        requester_name: name,
        requester_phone: phone,
        requester_email: email,
        preferred_window: preferredWindow,
        notes,
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setError(payload?.error ?? 'Impossible de soumettre la demande.');
      setState('error');
      return;
    }

    setState('success');
    setPhone('');
    setEmail('');
    setPreferredWindow('');
    setNotes('');
  };

  if (state === 'success') {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-4">
        <p className="text-sm font-semibold text-green-900">Demande d&apos;inspection recue</p>
        <p className="mt-1 text-xs leading-relaxed text-green-700">
          MotoPayee vous contactera pour confirmer le vehicule, le lieu et le paiement de l&apos;inspection.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3">
        <p className="text-sm font-semibold text-gray-900">Demander une inspection MotoPayee</p>
        <p className="mt-1 text-xs leading-relaxed text-gray-500">
          Un membre de l&apos;equipe vous rappelle pour organiser une verification independante de {vehicleLabel}. Frais indicatif:
          {' '}15 000 XAF.
        </p>
      </div>

      <div className="space-y-3">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          minLength={2}
          maxLength={120}
          placeholder="Votre nom"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#1a3a6b] focus:ring-2 focus:ring-[#1a3a6b]/10"
        />
        <input
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          required
          minLength={6}
          maxLength={40}
          placeholder="Telephone / WhatsApp"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#1a3a6b] focus:ring-2 focus:ring-[#1a3a6b]/10"
        />
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          maxLength={160}
          placeholder="Email optionnel"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#1a3a6b] focus:ring-2 focus:ring-[#1a3a6b]/10"
        />
        <input
          value={preferredWindow}
          onChange={(event) => setPreferredWindow(event.target.value)}
          maxLength={160}
          placeholder="Moment prefere optionnel"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#1a3a6b] focus:ring-2 focus:ring-[#1a3a6b]/10"
        />
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          maxLength={1000}
          placeholder="Question ou detail utile optionnel"
          rows={3}
          className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#1a3a6b] focus:ring-2 focus:ring-[#1a3a6b]/10"
        />
      </div>

      {error && <p className="mt-3 text-xs font-medium text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={state === 'submitting'}
        className="mt-4 w-full rounded-xl bg-[#1a3a6b] py-3 text-sm font-semibold text-white transition hover:bg-[#132b50] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {state === 'submitting' ? 'Envoi...' : 'Demander inspection'}
      </button>
    </form>
  );
}

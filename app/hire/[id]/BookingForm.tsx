'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { HireListing } from '@/lib/types';
import { bookingTotal } from '@/lib/hire-pricing';

function formatXAF(amount: number): string {
  return new Intl.NumberFormat('fr-CM', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(amount);
}

// 'mois' is invariant in French — it does not take a plural s.
const UNIT_LABEL: Record<'month' | 'week' | 'day', { one: string; many: string }> = {
  month: { one: 'mois', many: 'mois' },
  week: { one: 'semaine', many: 'semaines' },
  day: { one: 'jour', many: 'jours' },
};

export default function BookingForm({ listing }: { listing: HireListing }) {
  const router = useRouter();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hireType, setHireType] = useState<'self_drive' | 'with_driver'>(
    listing.hire_type === 'with_driver' ? 'with_driver' : 'self_drive'
  );
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Priced by the same module the booking route uses, so the quote below is
  // exactly what gets charged.
  let totalDays = 0;
  if (startDate && endDate) {
    const diff = new Date(endDate).getTime() - new Date(startDate).getTime();
    totalDays = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }
  const driverRate = hireType === 'with_driver' ? listing.driver_daily_rate : null;
  const quote = bookingTotal(listing, totalDays, driverRate);
  const estimate = quote.total;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`/api/hire/${listing.id}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_date: startDate,
          end_date: endDate,
          hire_type: hireType,
          renter_notes: notes || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Erreur lors de la réservation');
        return;
      }

      router.push('/me/hire-bookings');
    } catch {
      setError('Erreur réseau');
    } finally {
      setLoading(false);
    }
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Début</label>
          <input
            type="date"
            required
            min={today}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#3d9e3d]"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Fin</label>
          <input
            type="date"
            required
            min={startDate || today}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#3d9e3d]"
          />
        </div>
      </div>

      {(listing.hire_type === 'both') && (
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Mode</label>
          <select
            value={hireType}
            onChange={(e) => setHireType(e.target.value as 'self_drive' | 'with_driver')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#3d9e3d]"
          >
            <option value="self_drive">Sans chauffeur</option>
            <option value="with_driver">Avec chauffeur</option>
          </select>
        </div>
      )}

      <div>
        <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Notes (optionnel)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Heure de prise en charge, lieu spécifique..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#3d9e3d] resize-none"
        />
      </div>

      {/* Estimate */}
      {totalDays > 0 && (
        <div className="bg-gray-50 rounded-xl p-3 space-y-1">
          {quote.lines.map((line) => (
            <div key={line.unit} className="flex justify-between text-sm">
              <span className="text-gray-500">
                {line.quantity} {line.quantity > 1 ? UNIT_LABEL[line.unit].many : UNIT_LABEL[line.unit].one} x {formatXAF(line.unitPrice)}
              </span>
              <span className="font-medium">{formatXAF(line.amount)}</span>
            </div>
          ))}
          {quote.driver && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Chauffeur x {quote.driver.quantity}</span>
              <span className="font-medium">{formatXAF(quote.driver.amount)}</span>
            </div>
          )}
          {listing.deposit_amount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Caution</span>
              <span className="font-medium">{formatXAF(listing.deposit_amount)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-bold border-t border-gray-200 pt-1 mt-1">
            <span>Total estimé</span>
            <span className="text-[#1a3a6b]">{formatXAF(estimate)}</span>
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading || totalDays < 1}
        className="w-full bg-[#3d9e3d] text-white font-semibold py-3 rounded-xl hover:bg-[#2d8a2d] transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Réservation en cours...' : 'Réserver ce véhicule'}
      </button>
    </form>
  );
}

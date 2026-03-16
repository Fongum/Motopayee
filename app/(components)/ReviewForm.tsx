'use client';

import { useState } from 'react';
import StarInput from './StarInput';

interface Props {
  entityType: 'listing' | 'hire_listing' | 'hire_booking';
  entityId: string;
  reviewedId: string;
}

export default function ReviewForm({ entityType, entityId, reviewedId }: Props) {
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) {
      setError('Veuillez sélectionner une note.');
      return;
    }
    setLoading(true);
    setError('');

    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity_type: entityType, entity_id: entityId, reviewed_id: reviewedId, rating, title: title || null, comment: comment || null }),
    });

    if (res.ok) {
      setSuccess(true);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Une erreur est survenue.');
    }
    setLoading(false);
  }

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
        <p className="text-green-700 font-semibold text-sm">Merci pour votre avis !</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-4">
      <h3 className="font-bold text-sm text-gray-800">Laisser un avis</h3>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Note</label>
        <StarInput value={rating} onChange={setRating} />
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Titre (optionnel)</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#3d9e3d]"
          placeholder="En un mot..."
        />
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Commentaire</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          maxLength={1000}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#3d9e3d] resize-none"
          placeholder="Partagez votre expérience..."
        />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#1a3a6b] text-white font-semibold py-2.5 rounded-xl hover:bg-[#15305a] transition disabled:opacity-50 text-sm"
      >
        {loading ? 'Envoi...' : 'Publier mon avis'}
      </button>
    </form>
  );
}

'use client';

import { useState } from 'react';

export default function ReplyFormClient({ reviewId }: { reviewId: string }) {
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    if (!comment.trim()) return;
    setLoading(true);
    const res = await fetch(`/api/reviews/${reviewId}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment }),
    });
    if (res.ok) setDone(true);
    setLoading(false);
  }

  if (done) {
    return <p className="text-xs text-green-600 mt-2 ml-4">Réponse publiée.</p>;
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-[#1a3a6b] hover:underline mt-2 ml-4"
      >
        Répondre à cet avis
      </button>
    );
  }

  return (
    <div className="mt-2 ml-4 flex gap-2">
      <input
        type="text"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Votre réponse..."
        className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#3d9e3d]"
      />
      <button
        onClick={submit}
        disabled={loading}
        className="bg-[#1a3a6b] text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-[#15305a] transition disabled:opacity-50"
      >
        {loading ? '...' : 'Envoyer'}
      </button>
    </div>
  );
}

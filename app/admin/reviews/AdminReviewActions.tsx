'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  reviewId: string;
  currentStatus: string;
}

export default function AdminReviewActions({ reviewId, currentStatus }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function updateStatus(status: string) {
    setLoading(true);
    await fetch('/api/admin/reviews', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ review_id: reviewId, status }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex gap-2 mt-2">
      {currentStatus !== 'published' && (
        <button
          onClick={() => updateStatus('published')}
          disabled={loading}
          className="text-xs text-green-600 hover:underline disabled:opacity-50"
        >
          Publier
        </button>
      )}
      {currentStatus !== 'hidden' && (
        <button
          onClick={() => updateStatus('hidden')}
          disabled={loading}
          className="text-xs text-gray-500 hover:underline disabled:opacity-50"
        >
          Masquer
        </button>
      )}
      {currentStatus !== 'flagged' && (
        <button
          onClick={() => updateStatus('flagged')}
          disabled={loading}
          className="text-xs text-red-500 hover:underline disabled:opacity-50"
        >
          Signaler
        </button>
      )}
    </div>
  );
}

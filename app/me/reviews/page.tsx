import { redirect } from 'next/navigation';
import { getCurrentUser, supabaseAdmin } from '@/lib/auth/server';
import type { Metadata } from 'next';
import ReviewCard from '../../(components)/ReviewCard';

export const metadata: Metadata = { title: 'Mes avis — MotoPayee' };

export default async function MyReviewsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  // Reviews I wrote
  const { data: given } = await supabaseAdmin
    .from('reviews')
    .select('*, reviewer:profiles!reviewer_id(full_name), reviewed:profiles!reviewed_id(full_name), response:review_responses(comment, created_at, responder:profiles!responder_id(full_name))')
    .eq('reviewer_id', user.id)
    .order('created_at', { ascending: false });

  // Reviews about me
  const { data: received } = await supabaseAdmin
    .from('reviews')
    .select('*, reviewer:profiles!reviewer_id(full_name), response:review_responses(comment, created_at, responder:profiles!responder_id(full_name))')
    .eq('reviewed_id', user.id)
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  const givenReviews = (given ?? []).map((r: Record<string, unknown>) => ({
    ...r,
    response: Array.isArray(r.response) && r.response.length > 0 ? r.response[0] : null,
  }));

  const receivedReviews = (received ?? []).map((r: Record<string, unknown>) => ({
    ...r,
    response: Array.isArray(r.response) && r.response.length > 0 ? r.response[0] : null,
  }));

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Mes avis</h1>

      {/* Reviews received */}
      <section className="mb-10">
        <h2 className="text-sm font-bold text-gray-500 uppercase mb-4">
          Avis reçus ({receivedReviews.length})
        </h2>
        {receivedReviews.length === 0 ? (
          <p className="text-sm text-gray-400">Aucun avis reçu.</p>
        ) : (
          <div className="space-y-3">
            {receivedReviews.map((r: Record<string, unknown>) => (
              <div key={String(r.id)}>
                <ReviewCard review={r as unknown as Parameters<typeof ReviewCard>[0]['review']} />
                {!r.response && (
                  <ReplyForm reviewId={String(r.id)} />
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Reviews given */}
      <section>
        <h2 className="text-sm font-bold text-gray-500 uppercase mb-4">
          Avis donnés ({givenReviews.length})
        </h2>
        {givenReviews.length === 0 ? (
          <p className="text-sm text-gray-400">Vous n&apos;avez pas encore laissé d&apos;avis.</p>
        ) : (
          <div className="space-y-3">
            {givenReviews.map((r: Record<string, unknown>) => (
              <ReviewCard key={String(r.id)} review={r as unknown as Parameters<typeof ReviewCard>[0]['review']} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// Small inline reply form for responding to reviews
function ReplyForm({ reviewId }: { reviewId: string }) {
  return <ReplyFormClient reviewId={reviewId} />;
}

import ReplyFormClient from './ReplyFormClient';

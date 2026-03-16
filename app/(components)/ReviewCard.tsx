import StarRating from './StarRating';

interface ReviewData {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  created_at: string;
  reviewer?: { full_name: string | null };
  response?: { comment: string; created_at: string; responder?: { full_name: string | null } } | null;
}

export default function ReviewCard({ review }: { review: ReviewData }) {
  const date = new Date(review.created_at).toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-sm font-semibold text-gray-800">{review.reviewer?.full_name ?? 'Utilisateur'}</p>
          <p className="text-[11px] text-gray-400">{date}</p>
        </div>
        <StarRating rating={review.rating} />
      </div>
      {review.title && (
        <p className="font-semibold text-sm text-gray-800 mb-1">{review.title}</p>
      )}
      {review.comment && (
        <p className="text-sm text-gray-600 leading-relaxed">{review.comment}</p>
      )}
      {review.response && (
        <div className="mt-3 ml-4 pl-3 border-l-2 border-gray-200">
          <p className="text-xs font-semibold text-gray-600 mb-0.5">
            Réponse de {review.response.responder?.full_name ?? 'le vendeur'}
          </p>
          <p className="text-xs text-gray-500">{review.response.comment}</p>
        </div>
      )}
    </div>
  );
}

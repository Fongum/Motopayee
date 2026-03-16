import StarRating from './StarRating';

interface Props {
  isVerified: boolean;
  avgRating: number | null;
  totalReviews: number;
}

export default function SellerTrustBadge({ isVerified, avgRating, totalReviews }: Props) {
  const isTrusted = isVerified && (avgRating ?? 0) >= 4.0 && totalReviews >= 5;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {isVerified && (
        <div className="flex items-center gap-1 text-blue-600">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="text-xs font-semibold">Vérifié</span>
        </div>
      )}
      {(avgRating ?? 0) > 0 && (
        <StarRating rating={avgRating ?? 0} count={totalReviews} />
      )}
      {isTrusted && (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
          Vendeur de confiance
        </span>
      )}
    </div>
  );
}

'use client';

export default function RetryButton() {
  return (
    <button
      onClick={() => window.location.reload()}
      className="bg-brand-navy text-white font-semibold px-6 py-3 rounded-xl hover:bg-brand-navy-dark transition"
    >
      Reessayer
    </button>
  );
}

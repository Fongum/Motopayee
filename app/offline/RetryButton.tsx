'use client';

export default function RetryButton() {
  return (
    <button
      onClick={() => window.location.reload()}
      className="bg-[#1a3a6b] text-white font-semibold px-6 py-3 rounded-xl hover:bg-[#15305a] transition"
    >
      Reessayer
    </button>
  );
}

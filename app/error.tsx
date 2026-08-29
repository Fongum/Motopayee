'use client';

import { useEffect, useState } from 'react';

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [reference, setReference] = useState<string | null>(error.digest ?? null);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message || 'Client render error',
        digest: error.digest,
        route: window.location.pathname,
        stack: error.stack,
      }),
      keepalive: true,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => {
        if (!cancelled && body?.eventId) setReference(body.eventId);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Une erreur est survenue</h1>
        {/* The raw message used to be printed here. It is written for
            developers, not customers, and can name internals — the reference
            below is what support actually needs. */}
        <p className="text-sm text-gray-500 mb-6">
          Quelque chose ne s&apos;est pas passé comme prévu. Réessayez, ou contactez-nous si le problème persiste.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="bg-[#1a3a6b] text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-[#15305a] transition text-sm"
          >
            Réessayer
          </button>
          <a
            href="/"
            className="border border-gray-300 text-gray-700 font-medium px-5 py-2.5 rounded-xl hover:bg-gray-50 transition text-sm"
          >
            Accueil
          </a>
        </div>
        {reference && (
          <p className="text-xs text-gray-400 mt-6">Référence: {reference}</p>
        )}
      </div>
    </div>
  );
}

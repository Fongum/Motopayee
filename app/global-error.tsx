'use client';

import { useEffect } from 'react';

/**
 * Last-resort boundary: catches failures in the root layout itself, which
 * app/error.tsx cannot. It replaces the whole document, so it ships its own
 * <html> and inline styles — Tailwind may be exactly what failed to load.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void fetch('/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message || 'Root layout error',
        digest: error.digest,
        route: typeof window === 'undefined' ? undefined : window.location.pathname,
      }),
      keepalive: true,
    }).catch(() => {});
  }, [error]);

  return (
    <html lang="fr">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0, padding: '3rem 1rem', textAlign: 'center', color: '#1f2937' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          MotoPayee est momentanément indisponible
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1.5rem' }}>
          Réessayez dans un instant. Nos équipes ont été prévenues.
        </p>
        <button
          onClick={reset}
          style={{ background: '#1a3a6b', color: 'white', border: 0, borderRadius: '0.75rem', padding: '0.625rem 1.25rem', fontWeight: 600, cursor: 'pointer' }}
        >
          Réessayer
        </button>
        {error.digest && (
          <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '1.5rem' }}>Référence: {error.digest}</p>
        )}
      </body>
    </html>
  );
}

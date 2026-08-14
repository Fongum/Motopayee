'use client';

import { useState, useCallback, useEffect } from 'react';

interface Props {
  photos: { id: string; src: string; alt?: string }[];
}

export default function PhotoGallery({ photos }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const close = useCallback(() => setLightboxIndex(null), []);
  const prev = useCallback(() => setLightboxIndex((i) => (i !== null && i > 0 ? i - 1 : photos.length - 1)), [photos.length]);
  const next = useCallback(() => setLightboxIndex((i) => (i !== null && i < photos.length - 1 ? i + 1 : 0)), [photos.length]);

  useEffect(() => {
    if (lightboxIndex === null) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    }
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [lightboxIndex, close, prev, next]);

  if (photos.length === 0) {
    return (
      <div className="bg-gray-100 rounded-2xl h-64 md:h-96 flex items-center justify-center text-gray-400">
        <span>Pas de photo disponible</span>
      </div>
    );
  }

  return (
    <>
      {/* Main photo */}
      <div
        className="bg-gray-100 rounded-2xl h-64 md:h-96 overflow-hidden cursor-pointer relative group"
        onClick={() => setLightboxIndex(0)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photos[0].src}
          alt={photos[0].alt ?? 'Vehicle'}
          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
          <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
            </svg>
            Voir les photos ({photos.length})
          </span>
        </div>
      </div>

      {/* Thumbnails */}
      {photos.length > 1 && (
        <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
          {photos.slice(1, 6).map((p, i) => (
            <button
              key={p.id}
              onClick={() => setLightboxIndex(i + 1)}
              className="w-20 h-16 bg-gray-200 rounded-lg flex-shrink-0 overflow-hidden hover:ring-2 hover:ring-[#3d9e3d] transition"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.src}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </button>
          ))}
          {photos.length > 6 && (
            <button
              onClick={() => setLightboxIndex(6)}
              className="w-20 h-16 bg-gray-800 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
            >
              +{photos.length - 6}
            </button>
          )}
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
          onClick={close}
        >
          {/* Close button */}
          <button
            onClick={close}
            className="absolute top-4 right-4 text-white/70 hover:text-white z-10 p-2"
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Counter */}
          <div className="absolute top-4 left-4 text-white/60 text-sm font-medium">
            {lightboxIndex + 1} / {photos.length}
          </div>

          {/* Previous */}
          {photos.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); prev(); }}
              className="absolute left-2 md:left-6 text-white/60 hover:text-white p-2 z-10"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* Image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photos[lightboxIndex].src}
            alt={photos[lightboxIndex].alt ?? ''}
            className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Next */}
          {photos.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); next(); }}
              className="absolute right-2 md:right-6 text-white/60 hover:text-white p-2 z-10"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {/* Thumbnail strip */}
          {photos.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 overflow-x-auto max-w-[90vw] px-2 pb-1">
              {photos.map((p, i) => (
                <button
                  key={p.id}
                  onClick={(e) => { e.stopPropagation(); setLightboxIndex(i); }}
                  className={`w-14 h-10 rounded-md overflow-hidden flex-shrink-0 border-2 transition ${i === lightboxIndex ? 'border-white' : 'border-transparent opacity-50 hover:opacity-80'}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.src} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

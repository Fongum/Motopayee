'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/app/(components)/Navbar';

export default function FieldMediaPage({ params }: { params: { id: string } }) {
  const [listing, setListing] = useState<Record<string, unknown> | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [order, setOrder] = useState(0);

  useEffect(() => {
    fetch(`/api/admin/listings-basic/${params.id}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => setListing(d?.listing ?? null))
      .catch(() => {});
  }, [params.id]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>, last: boolean) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    setError('');

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isVideo = file.type.startsWith('video/');

      // 1. Get upload URL
      const urlRes = await fetch('/api/files/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bucket: 'listing-media',
          filename: file.name,
          contentType: file.type,
        }),
      });

      if (!urlRes.ok) {
        setError('Erreur lors de la préparation du téléversement.');
        break;
      }

      const { signedUrl, path } = await urlRes.json();

      // 2. Upload
      const uploadRes = await fetch(signedUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      if (!uploadRes.ok) {
        setError('Erreur lors du téléversement.');
        break;
      }

      // 3. Save metadata
      await fetch(`/api/field/listings/${params.id}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storage_path: path,
          bucket: 'listing-media',
          asset_type: isVideo ? 'video' : 'photo',
          display_order: order + i,
          mark_done: last && i === files.length - 1,
        }),
      });
    }

    setOrder((o) => o + files.length);
    setUploading(false);
    setSuccess(true);
  }

  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Téléversement de médias</h1>
        {listing && (
          <p className="text-gray-500 text-sm mb-8">
            Annonce: {(listing.vehicle as Record<string, unknown>)?.make as string ?? ''} · Zone {listing.zone as string}
          </p>
        )}

        <div className="space-y-4">
          <div className="bg-white border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center">
            <p className="text-gray-500 mb-4">Téléversez les photos du véhicule</p>
            <label className="cursor-pointer bg-blue-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-blue-700">
              Choisir des photos
              <input
                type="file"
                className="hidden"
                accept="image/*"
                multiple
                onChange={(e) => handleUpload(e, false)}
                disabled={uploading}
              />
            </label>
          </div>

          <div className="bg-white border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center">
            <p className="text-gray-500 mb-4">Dernière photo — marque les médias comme terminés</p>
            <label className="cursor-pointer bg-green-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-green-700">
              Téléverser et terminer
              <input
                type="file"
                className="hidden"
                accept="image/*,video/*"
                multiple
                onChange={(e) => handleUpload(e, true)}
                disabled={uploading}
              />
            </label>
          </div>

          {uploading && <p className="text-center text-blue-600 text-sm">Téléversement en cours...</p>}
          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>}
          {success && <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 text-sm">Médias téléversés avec succès !</div>}
        </div>
      </main>
    </>
  );
}

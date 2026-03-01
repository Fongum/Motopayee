'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { FinancingApplication } from '@/lib/types';

const STEPS = [
  { key: 'draft', label: 'Brouillon' },
  { key: 'submitted', label: 'Soumis' },
  { key: 'docs_pending', label: 'Documents requis' },
  { key: 'docs_received', label: 'Documents reçus' },
  { key: 'under_review', label: 'En examen' },
  { key: 'approved', label: 'Approuvé' },
  { key: 'disbursed', label: 'Financé' },
];

function formatXAF(amount: number): string {
  return new Intl.NumberFormat('fr-CM', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(amount);
}

interface Props {
  application: FinancingApplication;
}

export default function ApplicationDetail({ application: initial }: Props) {
  const router = useRouter();
  const [app, setApp] = useState(initial);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const listing = app.listing as { asking_price: number; zone: string; vehicle?: { make: string; model: string; year: number } } | undefined;
  const vehicle = listing?.vehicle;

  const currentStepIdx = STEPS.findIndex((s) => s.key === app.status);
  const isFinal = ['approved', 'rejected', 'disbursed', 'withdrawn'].includes(app.status);
  const canSubmit = app.status === 'draft';

  async function handleSubmit() {
    setSubmitting(true);
    setError('');
    const res = await fetch(`/api/applications/${app.id}/submit`, { method: 'POST' });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? 'Erreur lors de la soumission.');
      setSubmitting(false);
      return;
    }
    const d = await res.json();
    setApp(d.application);
    setSubmitting(false);
    router.refresh();
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>, docType: string) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');

    // 1. Get signed upload URL
    const urlRes = await fetch('/api/files/upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bucket: 'documents-private', filename: file.name, contentType: file.type }),
    });

    if (!urlRes.ok) {
      setError('Impossible de préparer le téléversement.');
      setUploading(false);
      return;
    }

    const { signedUrl, path } = await urlRes.json();

    // 2. Upload file
    const uploadRes = await fetch(signedUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type },
    });

    if (!uploadRes.ok) {
      setError('Erreur lors du téléversement.');
      setUploading(false);
      return;
    }

    // 3. Save metadata
    const metaRes = await fetch(`/api/applications/${app.id}/docs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        doc_type: docType,
        storage_path: path,
        bucket: 'documents-private',
        filename: file.name,
        content_type: file.type,
        file_size_bytes: file.size,
      }),
    });

    if (!metaRes.ok) {
      setError('Document téléversé mais métadonnées non enregistrées.');
    }

    setUploading(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <h1 className="text-xl font-bold text-gray-900 mb-1">
          {vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'Demande de financement'}
        </h1>
        {listing && (
          <p className="text-gray-500 text-sm">{formatXAF(listing.asking_price)} · Zone {listing.zone}</p>
        )}
      </div>

      {/* Status stepper */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Statut de la demande</h2>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {STEPS.filter((s) => !['docs_pending', 'docs_received'].includes(s.key) || currentStepIdx >= STEPS.findIndex((x) => x.key === s.key)).map((step, idx) => {
            const stepIdx = STEPS.findIndex((s) => s.key === step.key);
            const done = stepIdx < currentStepIdx;
            const current = stepIdx === currentStepIdx;
            return (
              <div key={step.key} className="flex items-center gap-1 flex-shrink-0">
                {idx > 0 && <div className={`w-8 h-0.5 ${done || current ? 'bg-blue-500' : 'bg-gray-200'}`} />}
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  done ? 'bg-blue-500 text-white' :
                  current ? 'bg-blue-600 text-white ring-2 ring-blue-200' :
                  'bg-gray-100 text-gray-400'
                }`}>
                  {done ? '✓' : idx + 1}
                </div>
                <span className={`text-xs whitespace-nowrap ${current ? 'text-blue-700 font-semibold' : 'text-gray-500'}`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {app.status === 'rejected' && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
            Demande refusée. {app.notes && <span>{app.notes}</span>}
          </div>
        )}
        {app.status === 'approved' && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 text-sm">
            Félicitations ! Votre financement est approuvé. Notre équipe vous contactera pour les prochaines étapes.
          </div>
        )}
      </div>

      {/* Documents */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Documents requis</h2>
        <div className="space-y-3">
          {[
            { type: 'id_national', label: 'CNI ou Passeport' },
            { type: 'income_proof', label: "Justificatif de revenus" },
            { type: 'bank_statement', label: 'Relevé bancaire (3 mois)' },
            { type: 'utility_bill', label: "Justificatif de domicile" },
          ].map((doc) => {
            const uploaded = app.documents?.find((d) => d.doc_type === doc.type);
            return (
              <div key={doc.type} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-800">{doc.label}</p>
                  {uploaded && <p className="text-xs text-green-600 mt-0.5">✓ {uploaded.filename}</p>}
                </div>
                {!isFinal && (
                  <label className="cursor-pointer">
                    <span className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition">
                      {uploaded ? 'Remplacer' : 'Téléverser'}
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleUpload(e, doc.type)}
                      disabled={uploading}
                    />
                  </label>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>
      )}

      {canSubmit && (
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? 'Soumission...' : 'Soumettre la demande'}
        </button>
      )}
    </div>
  );
}

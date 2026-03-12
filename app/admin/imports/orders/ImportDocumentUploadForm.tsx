'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ImportDocumentType, ImportShipment } from '@/lib/types';

type Props = {
  orderId: string;
  shipments: ImportShipment[];
};

const DOC_TYPES: Array<{ value: ImportDocumentType; label: string }> = [
  { value: 'auction_invoice', label: 'Auction invoice' },
  { value: 'bill_of_sale', label: 'Bill of sale' },
  { value: 'title', label: 'Title' },
  { value: 'partner_condition_report', label: 'Condition report' },
  { value: 'export_certificate', label: 'Export certificate' },
  { value: 'insurance_certificate', label: 'Insurance certificate' },
  { value: 'bill_of_lading', label: 'Bill of lading' },
  { value: 'ectn', label: 'ECTN' },
  { value: 'fimex_record', label: 'FIMEX record' },
  { value: 'customs_notice', label: 'Customs notice' },
  { value: 'delivery_note', label: 'Delivery note' },
  { value: 'other', label: 'Other' },
];

export default function ImportDocumentUploadForm({ orderId, shipments }: Props) {
  const router = useRouter();
  const [docType, setDocType] = useState<ImportDocumentType>('bill_of_lading');
  const [shipmentId, setShipmentId] = useState('');
  const [verified, setVerified] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage(null);

    try {
      const urlRes = await fetch('/api/files/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bucket: 'documents-private',
          filename: file.name,
          contentType: file.type,
        }),
      });

      if (!urlRes.ok) {
        setMessage({ type: 'error', text: 'Unable to prepare upload.' });
        setUploading(false);
        return;
      }

      const { signedUrl, path } = await urlRes.json();

      const uploadRes = await fetch(signedUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      if (!uploadRes.ok) {
        setMessage({ type: 'error', text: 'File upload failed.' });
        setUploading(false);
        return;
      }

      const metaRes = await fetch(`/api/admin/imports/orders/${orderId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipment_id: shipmentId || null,
          doc_type: docType,
          storage_path: path,
          bucket: 'documents-private',
          filename: file.name,
          content_type: file.type,
          file_size_bytes: file.size,
          verified,
        }),
      });

      const data = await metaRes.json().catch(() => null);
      if (!metaRes.ok) {
        setMessage({ type: 'error', text: data?.error ?? 'Document uploaded but metadata was not saved.' });
        setUploading(false);
        return;
      }

      setMessage({ type: 'success', text: 'Document uploaded.' });
      setUploading(false);
      router.refresh();
    } catch {
      setMessage({ type: 'error', text: 'Upload failed.' });
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <select
          value={docType}
          onChange={(event) => setDocType(event.target.value as ImportDocumentType)}
          className="rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-[#1a3a6b] focus:outline-none"
        >
          {DOC_TYPES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          value={shipmentId}
          onChange={(event) => setShipmentId(event.target.value)}
          className="rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-[#1a3a6b] focus:outline-none"
        >
          <option value="">Order-level document</option>
          {shipments.map((shipment) => (
            <option key={shipment.id} value={shipment.id}>
              {shipment.carrier_name} · {shipment.status}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
        <input type="checkbox" checked={verified} onChange={(event) => setVerified(event.target.checked)} className="mt-1" />
        <span className="text-sm leading-6 text-gray-600">Mark this document as verified when saved.</span>
      </label>

      <label className="inline-flex cursor-pointer rounded-xl bg-[#1a3a6b] px-5 py-3 text-sm font-semibold text-white hover:bg-[#132b50]">
        {uploading ? 'Uploading...' : 'Choose file'}
        <input
          type="file"
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleUpload}
          disabled={uploading}
        />
      </label>

      {message && (
        <div className={`rounded-xl px-4 py-3 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}
    </div>
  );
}

import { getCurrentUser, supabaseAdmin } from '@/lib/auth/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import type { Listing } from '@/lib/types';
import { isAdminRole } from '@/lib/auth/roles';

function formatXAF(amount: number) {
  return new Intl.NumberFormat('fr-CM', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(amount);
}

export default async function AdminListingDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { data, error } = await supabaseAdmin
    .from('listings')
    .select(`
      *,
      vehicle:vehicles(*),
      seller:profiles!seller_id(id, email, full_name, phone),
      documents(*),
      field_agent:profiles!field_agent_id(id, email, full_name),
      inspector:profiles!inspector_id(id, email, full_name),
      verifier:profiles!verifier_id(id, email, full_name),
      inspections(*)
    `)
    .eq('id', params.id)
    .single();

  if (error || !data) notFound();

  const listing = data as unknown as Listing & {
    seller?: { id: string; email: string; full_name?: string; phone?: string };
    field_agent?: { id: string; email: string; full_name?: string } | null;
    inspector?: { id: string; email: string; full_name?: string } | null;
    verifier?: { id: string; email: string; full_name?: string } | null;
    inspections?: Array<Record<string, unknown>>;
    documents?: Array<{ id: string; filename: string; doc_type: string }>;
  };
  const v = listing.vehicle;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/listings" className="text-sm text-blue-600 hover:underline">← Annonces</Link>
        <h1 className="text-2xl font-bold text-gray-900">
          {v ? `${v.year} ${v.make} ${v.model}` : 'Annonce'}
        </h1>
        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
          {listing.status.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Vehicle details */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-3">
          <h2 className="font-semibold text-gray-900">Véhicule</h2>
          {v && (
            <dl className="text-sm space-y-1">
              {[
                ['Marque/Modèle', `${v.make} ${v.model}`],
                ['Année', v.year],
                ['Kilométrage', `${v.mileage_km.toLocaleString()} km`],
                ['Carburant', v.fuel_type],
                ['Transmission', v.transmission],
                ['Couleur', v.color ?? '—'],
                ['Cylindrée', v.engine_cc ? `${v.engine_cc} cc` : '—'],
                ['Grade', v.condition_grade ?? 'Non inspecté'],
              ].map(([label, value]) => (
                <div key={label as string} className="flex justify-between border-b border-gray-50 py-1">
                  <dt className="text-gray-500">{label}</dt>
                  <dd className="font-medium text-gray-800">{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        {/* Pricing + Assignment */}
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-3">
            <h2 className="font-semibold text-gray-900">Prix</h2>
            <div className="text-sm space-y-1">
              <div className="flex justify-between"><span className="text-gray-500">Demandé</span><span className="font-semibold">{formatXAF(listing.asking_price)}</span></div>
              {listing.suggested_price && <div className="flex justify-between"><span className="text-gray-500">Suggéré</span><span>{formatXAF(listing.suggested_price)}</span></div>}
              {listing.price_band && <div className="flex justify-between"><span className="text-gray-500">Bande</span><span className="capitalize">{listing.price_band}</span></div>}
              <div className="flex justify-between"><span className="text-gray-500">Finançable</span><span>{listing.financeable ? 'Oui' : 'Non'}</span></div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-2">
            <h2 className="font-semibold text-gray-900 mb-3">Équipe assignée</h2>
            {[
              { role: 'Agent terrain', data: listing.field_agent },
              { role: 'Inspecteur', data: listing.inspector },
              { role: 'Vérificateur', data: listing.verifier },
            ].map(({ role, data: agent }) => (
              <div key={role} className="flex justify-between text-sm border-b border-gray-50 py-1">
                <span className="text-gray-500">{role}</span>
                <span className="text-gray-800">{agent ? (agent.full_name ?? agent.email) : <span className="text-gray-400">Non assigné</span>}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Documents */}
      {listing.documents && listing.documents.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Documents ({listing.documents.length})</h2>
          <div className="space-y-2">
            {listing.documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between text-sm py-2 border-b border-gray-50">
                <div>
                  <span className="font-medium text-gray-800">{doc.filename}</span>
                  <span className="ml-2 text-gray-400 text-xs">{doc.doc_type.replace(/_/g, ' ')}</span>
                </div>
                <SignedUrlButton docId={doc.id} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Actions</h2>
        <div className="flex flex-wrap gap-3">
          {listing.status === 'ownership_submitted' && (
            <StatusActionButton
              listingId={listing.id}
              targetStatus="ownership_verified"
              label="Valider la propriété"
              className="bg-blue-600 text-white hover:bg-blue-700"
            />
          )}
          {listing.status === 'ownership_verified' && (
            <StatusActionButton
              listingId={listing.id}
              targetStatus="inspection_scheduled"
              label="Programmer l'inspection"
              className="bg-purple-600 text-white hover:bg-purple-700"
            />
          )}
          {listing.status === 'inspected' && isAdminRole(user.role) && (
            <PublishButton listingId={listing.id} />
          )}
          {listing.status === 'pricing_review' && isAdminRole(user.role) && (
            <PublishButton listingId={listing.id} />
          )}
        </div>
      </div>
    </div>
  );
}

// Small client components for actions
function SignedUrlButton({ docId }: { docId: string }) {
  return (
    <a
      href={`/api/files/signed-url?doc=${docId}`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs text-blue-600 hover:underline"
    >
      Télécharger
    </a>
  );
}

function StatusActionButton({
  listingId,
  targetStatus,
  label,
  className,
}: {
  listingId: string;
  targetStatus: string;
  label: string;
  className: string;
}) {
  return (
    <form method="POST" action={`/api/admin/listings/${listingId}/publish`}>
      <input type="hidden" name="status" value={targetStatus} />
      <button type="submit" className={`text-sm font-semibold px-4 py-2 rounded-lg ${className}`}>
        {label}
      </button>
    </form>
  );
}

function PublishButton({ listingId }: { listingId: string }) {
  return (
    <form method="POST" action={`/api/admin/listings/${listingId}/publish`}>
      <button type="submit" className="text-sm font-semibold px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700">
        Publier l&apos;annonce
      </button>
    </form>
  );
}

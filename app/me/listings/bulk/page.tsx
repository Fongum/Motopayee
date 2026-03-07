import { getCurrentUser } from '@/lib/auth/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import BulkUploadForm from '@/app/(components)/BulkUploadForm';

export default async function BulkUploadPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'seller_dealer') redirect('/me/listings');

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link href="/me/listings" className="text-sm text-blue-600 hover:underline">
          ← Mes annonces
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Import en lot</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <BulkUploadForm />
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
            <h3 className="font-semibold text-blue-900 mb-3 text-sm">Colonnes requises</h3>
            <ul className="text-xs text-blue-800 space-y-1">
              {[
                'make',
                'model',
                'year',
                'mileage_km',
                'fuel_type',
                'transmission',
                'asking_price',
                'zone',
              ].map(col => (
                <li key={col} className="font-mono">
                  · {col}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
            <h3 className="font-semibold text-gray-700 mb-3 text-sm">
              Colonnes optionnelles
            </h3>
            <ul className="text-xs text-gray-600 space-y-1">
              {['color', 'engine_cc', 'seats', 'city', 'description'].map(col => (
                <li key={col} className="font-mono">
                  · {col}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
            <h3 className="font-semibold text-gray-700 mb-2 text-sm">Valeurs acceptées</h3>
            <ul className="text-xs text-gray-600 space-y-1.5">
              <li>
                <span className="font-mono">fuel_type</span>: petrol, diesel, electric,
                hybrid, other
              </li>
              <li>
                <span className="font-mono">transmission</span>: manual, automatic, other
              </li>
              <li>
                <span className="font-mono">zone</span>: A, B, C
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

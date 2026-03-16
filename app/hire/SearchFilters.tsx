'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import SaveSearchButton from '../(components)/SaveSearchButton';

export default function HireSearchFilters({ total }: { total: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const update = useCallback((key: string, value: string) => {
    const sp = new URLSearchParams(searchParams.toString());
    if (value) sp.set(key, value);
    else sp.delete(key);
    sp.delete('page');
    router.push(`/hire?${sp.toString()}`);
  }, [router, searchParams]);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Ville</label>
          <input
            type="text"
            placeholder="Ex: Douala"
            defaultValue={searchParams.get('city') ?? ''}
            onBlur={(e) => update('city', e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && update('city', (e.target as HTMLInputElement).value)}
            className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#3d9e3d]"
          />
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Marque</label>
          <input
            type="text"
            placeholder="Ex: Toyota"
            defaultValue={searchParams.get('make') ?? ''}
            onBlur={(e) => update('make', e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && update('make', (e.target as HTMLInputElement).value)}
            className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#3d9e3d]"
          />
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Zone</label>
          <select
            defaultValue={searchParams.get('zone') ?? ''}
            onChange={(e) => update('zone', e.target.value)}
            className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#3d9e3d]"
          >
            <option value="">Toutes</option>
            <option value="A">Zone A</option>
            <option value="B">Zone B</option>
            <option value="C">Zone C</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Type</label>
          <select
            defaultValue={searchParams.get('hire_type') ?? ''}
            onChange={(e) => update('hire_type', e.target.value)}
            className="w-36 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#3d9e3d]"
          >
            <option value="">Tous</option>
            <option value="self_drive">Sans chauffeur</option>
            <option value="with_driver">Avec chauffeur</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Prix max/jour</label>
          <input
            type="number"
            placeholder="XAF"
            defaultValue={searchParams.get('max_price') ?? ''}
            onBlur={(e) => update('max_price', e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && update('max_price', (e.target as HTMLInputElement).value)}
            className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#3d9e3d]"
          />
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Carburant</label>
          <select
            defaultValue={searchParams.get('fuel_type') ?? ''}
            onChange={(e) => update('fuel_type', e.target.value)}
            className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#3d9e3d]"
          >
            <option value="">Tous</option>
            <option value="petrol">Essence</option>
            <option value="diesel">Diesel</option>
            <option value="electric">Électrique</option>
            <option value="hybrid">Hybride</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Tri</label>
          <select
            defaultValue={searchParams.get('sort') ?? ''}
            onChange={(e) => update('sort', e.target.value)}
            className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#3d9e3d]"
          >
            <option value="">Plus récent</option>
            <option value="price_asc">Prix croissant</option>
            <option value="price_desc">Prix décroissant</option>
          </select>
        </div>

        <SaveSearchButton searchType="hire" />
        <div className="ml-auto text-sm text-gray-500 font-medium">
          {total} véhicule{total !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
}

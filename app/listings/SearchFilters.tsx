'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const MAKES = ['Toyota', 'Honda', 'Nissan', 'Hyundai', 'Mercedes', 'BMW', 'Peugeot', 'Renault', 'Mitsubishi', 'Kia', 'Volkswagen', 'Ford', 'Suzuki', 'Mazda'];
const FUEL_TYPES = [
  { value: 'petrol',   label: 'Essence' },
  { value: 'diesel',   label: 'Diesel' },
  { value: 'hybrid',   label: 'Hybride' },
  { value: 'electric', label: 'Électrique' },
];
const SORTS = [
  { value: 'newest',     label: 'Plus récents' },
  { value: 'price_asc',  label: 'Prix croissant' },
  { value: 'price_desc', label: 'Prix décroissant' },
  { value: 'mileage',    label: 'Kilométrage le plus bas' },
];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1994 }, (_, i) => CURRENT_YEAR - i);

export default function SearchFilters({ total }: { total: number }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [open, setOpen] = useState(false);

  // Count active advanced filters
  const advancedKeys = ['min_year', 'max_year', 'max_mileage', 'fuel_type', 'condition_grade', 'financeable', 'sort'];
  const activeAdvanced = advancedKeys.filter((k) => sp.get(k)).length;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const params = new URLSearchParams();
    fd.forEach((val, key) => {
      if (val && String(val).trim()) params.set(key, String(val));
    });
    params.delete('page');
    router.push(`/listings?${params.toString()}`);
  }

  function clearAll() {
    router.push('/listings');
  }

  const hasAnyFilter = Array.from(sp.keys()).some((k) => k !== 'page');

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <form onSubmit={handleSubmit}>
        {/* ── Primary filters ── */}
        <div className="p-4 flex flex-wrap gap-3 items-end">
          {/* Make */}
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Marque</label>
            <select
              name="make"
              defaultValue={sp.get('make') ?? ''}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#3d9e3d] focus:ring-1 focus:ring-[#3d9e3d]"
            >
              <option value="">Toutes les marques</option>
              {MAKES.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {/* Zone */}
          <div className="flex-1 min-w-[130px]">
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Zone</label>
            <select
              name="zone"
              defaultValue={sp.get('zone') ?? ''}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#3d9e3d] focus:ring-1 focus:ring-[#3d9e3d]"
            >
              <option value="">Toutes les zones</option>
              <option value="A">Zone A — Grandes villes</option>
              <option value="B">Zone B — Secondaires</option>
              <option value="C">Zone C — Rural</option>
            </select>
          </div>

          {/* Price range */}
          <div className="flex-1 min-w-[120px]">
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Prix min (XAF)</label>
            <input
              type="number"
              name="min_price"
              defaultValue={sp.get('min_price') ?? ''}
              placeholder="0"
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#3d9e3d] focus:ring-1 focus:ring-[#3d9e3d]"
            />
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Prix max (XAF)</label>
            <input
              type="number"
              name="max_price"
              defaultValue={sp.get('max_price') ?? ''}
              placeholder="Illimité"
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#3d9e3d] focus:ring-1 focus:ring-[#3d9e3d]"
            />
          </div>

          {/* Sort */}
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Trier par</label>
            <select
              name="sort"
              defaultValue={sp.get('sort') ?? 'newest'}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#3d9e3d] focus:ring-1 focus:ring-[#3d9e3d]"
            >
              {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="bg-[#3d9e3d] text-white font-bold px-6 py-2.5 rounded-xl hover:bg-[#2d8a2d] transition flex items-center gap-2 whitespace-nowrap"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Rechercher
          </button>
        </div>

        {/* ── Advanced toggle ── */}
        <div className="border-t border-gray-100 px-4 py-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2 text-sm font-semibold text-[#1a3a6b] hover:text-[#3d9e3d] transition"
          >
            <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            Filtres avancés
            {activeAdvanced > 0 && (
              <span className="bg-[#3d9e3d] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {activeAdvanced}
              </span>
            )}
          </button>
          <div className="flex items-center gap-4">
            <p className="text-sm text-gray-500">
              <span className="font-bold text-[#1a3a6b]">{total}</span> véhicule{total !== 1 ? 's' : ''}
            </p>
            {hasAnyFilter && (
              <button
                type="button"
                onClick={clearAll}
                className="text-xs text-gray-400 hover:text-red-500 transition flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Effacer tout
              </button>
            )}
          </div>
        </div>

        {/* ── Advanced filters (collapsible) ── */}
        {open && (
          <div className="border-t border-gray-100 p-4 bg-gray-50 flex flex-wrap gap-3">
            {/* Year range */}
            <div className="flex-1 min-w-[110px]">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Année min</label>
              <select
                name="min_year"
                defaultValue={sp.get('min_year') ?? ''}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#3d9e3d] focus:ring-1 focus:ring-[#3d9e3d]"
              >
                <option value="">Toute</option>
                {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-[110px]">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Année max</label>
              <select
                name="max_year"
                defaultValue={sp.get('max_year') ?? ''}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#3d9e3d] focus:ring-1 focus:ring-[#3d9e3d]"
              >
                <option value="">Toute</option>
                {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            {/* Max mileage */}
            <div className="flex-1 min-w-[130px]">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Km max</label>
              <select
                name="max_mileage"
                defaultValue={sp.get('max_mileage') ?? ''}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#3d9e3d] focus:ring-1 focus:ring-[#3d9e3d]"
              >
                <option value="">Illimité</option>
                <option value="30000">Moins de 30 000 km</option>
                <option value="60000">Moins de 60 000 km</option>
                <option value="100000">Moins de 100 000 km</option>
                <option value="150000">Moins de 150 000 km</option>
                <option value="200000">Moins de 200 000 km</option>
              </select>
            </div>

            {/* Fuel type */}
            <div className="flex-1 min-w-[130px]">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Carburant</label>
              <select
                name="fuel_type"
                defaultValue={sp.get('fuel_type') ?? ''}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#3d9e3d] focus:ring-1 focus:ring-[#3d9e3d]"
              >
                <option value="">Tous</option>
                {FUEL_TYPES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>

            {/* Condition grade */}
            <div className="flex-1 min-w-[130px]">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Grade condition</label>
              <select
                name="condition_grade"
                defaultValue={sp.get('condition_grade') ?? ''}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#3d9e3d] focus:ring-1 focus:ring-[#3d9e3d]"
              >
                <option value="">Tous</option>
                <option value="A">A — Excellent</option>
                <option value="B">B — Bon</option>
                <option value="C">C — Correct</option>
                <option value="D">D — Passable</option>
              </select>
            </div>

            {/* Financeable */}
            <div className="flex-1 min-w-[150px] flex items-end">
              <label className="flex items-center gap-3 cursor-pointer select-none py-2.5 px-3 bg-white border border-gray-300 rounded-xl w-full hover:border-[#3d9e3d] transition">
                <input
                  type="checkbox"
                  name="financeable"
                  value="true"
                  defaultChecked={sp.get('financeable') === 'true'}
                  className="w-4 h-4 rounded text-[#3d9e3d] focus:ring-[#3d9e3d]"
                />
                <span className="text-sm font-medium text-gray-700">Finançable uniquement</span>
              </label>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

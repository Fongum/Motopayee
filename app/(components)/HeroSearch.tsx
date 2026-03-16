'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const TABS = [
  { key: 'buy', label: 'Acheter', action: '/listings' },
  { key: 'hire', label: 'Louer', action: '/hire' },
  { key: 'sell', label: 'Vendre', action: '/sell' },
] as const;

type Tab = typeof TABS[number]['key'];

export default function HeroSearch({ makes }: { makes: string[] }) {
  const [tab, setTab] = useState<Tab>('buy');
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const active = TABS.find((t) => t.key === tab)!;
    const sp = new URLSearchParams();

    if (tab === 'buy') {
      const make = form.get('make') as string;
      const zone = form.get('zone') as string;
      const maxPrice = form.get('max_price') as string;
      if (make) sp.set('make', make);
      if (zone) sp.set('zone', zone);
      if (maxPrice) sp.set('max_price', maxPrice);
    } else if (tab === 'hire') {
      const city = form.get('city') as string;
      const hireType = form.get('hire_type') as string;
      const maxPrice = form.get('max_price') as string;
      if (city) sp.set('city', city);
      if (hireType) sp.set('hire_type', hireType);
      if (maxPrice) sp.set('max_price', maxPrice);
    } else {
      router.push(active.action);
      return;
    }

    const qs = sp.toString();
    router.push(qs ? `${active.action}?${qs}` : active.action);
  }

  const inputCls = 'flex-1 min-w-0 bg-white/15 border border-white/25 text-white placeholder-white/50 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-[#3d9e3d] focus:bg-white/20 transition';
  const selectCls = inputCls + ' appearance-none';

  return (
    <div className="max-w-2xl mx-auto">
      {/* Tabs */}
      <div className="flex justify-center gap-1 mb-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
              tab === t.key
                ? 'bg-white text-[#1a3a6b] shadow-md'
                : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4"
      >
        {tab === 'buy' && (
          <div className="flex flex-col sm:flex-row gap-3">
            <select name="make" className={selectCls}>
              <option value="" className="text-gray-900">Toutes les marques</option>
              {makes.map((m) => (
                <option key={m} value={m} className="text-gray-900">{m}</option>
              ))}
            </select>
            <select name="zone" className={selectCls}>
              <option value="" className="text-gray-900">Toutes les zones</option>
              <option value="A" className="text-gray-900">Zone A — Grandes villes</option>
              <option value="B" className="text-gray-900">Zone B — Secondaires</option>
              <option value="C" className="text-gray-900">Zone C — Rural</option>
            </select>
            <select name="max_price" className={selectCls}>
              <option value="" className="text-gray-900">Budget max</option>
              <option value="2000000" className="text-gray-900">Moins de 2M XAF</option>
              <option value="5000000" className="text-gray-900">Moins de 5M XAF</option>
              <option value="8000000" className="text-gray-900">Moins de 8M XAF</option>
              <option value="12000000" className="text-gray-900">Moins de 12M XAF</option>
            </select>
            <button type="submit" className="bg-[#3d9e3d] text-white font-bold px-6 py-3 rounded-xl hover:bg-[#2d8a2d] transition flex items-center justify-center gap-2 whitespace-nowrap flex-shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Rechercher
            </button>
          </div>
        )}

        {tab === 'hire' && (
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              name="city"
              type="text"
              placeholder="Ville (ex: Douala)"
              className={inputCls}
            />
            <select name="hire_type" className={selectCls}>
              <option value="" className="text-gray-900">Tous les modes</option>
              <option value="self_drive" className="text-gray-900">Sans chauffeur</option>
              <option value="with_driver" className="text-gray-900">Avec chauffeur</option>
            </select>
            <select name="max_price" className={selectCls}>
              <option value="" className="text-gray-900">Budget/jour max</option>
              <option value="15000" className="text-gray-900">Moins de 15K/jour</option>
              <option value="25000" className="text-gray-900">Moins de 25K/jour</option>
              <option value="50000" className="text-gray-900">Moins de 50K/jour</option>
              <option value="100000" className="text-gray-900">Moins de 100K/jour</option>
            </select>
            <button type="submit" className="bg-[#f5a623] text-[#1a3a6b] font-bold px-6 py-3 rounded-xl hover:bg-[#e6951c] transition flex items-center justify-center gap-2 whitespace-nowrap flex-shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Rechercher
            </button>
          </div>
        )}

        {tab === 'sell' && (
          <div className="text-center py-4">
            <p className="text-white/70 text-sm mb-4">Vendez ou mettez en location votre véhicule en quelques minutes</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={() => router.push('/sell')}
                className="bg-[#1a3a6b] text-white font-bold px-6 py-3 rounded-xl hover:bg-blue-800 transition text-sm"
              >
                Vendre mon véhicule
              </button>
              <button
                type="button"
                onClick={() => router.push('/me/hire-listings/new')}
                className="bg-[#f5a623] text-[#1a3a6b] font-bold px-6 py-3 rounded-xl hover:bg-[#e6951c] transition text-sm"
              >
                Mettre en location
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

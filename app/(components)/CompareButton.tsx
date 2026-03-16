'use client';

import { useState, useEffect } from 'react';
import { addItem, removeItem, isInComparison, type CompareItem } from '@/lib/comparison';

interface Props {
  item: CompareItem;
  compact?: boolean;
}

export default function CompareButton({ item, compact }: Props) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(isInComparison(item.id));
    const handler = () => setActive(isInComparison(item.id));
    window.addEventListener('comparison-changed', handler);
    return () => window.removeEventListener('comparison-changed', handler);
  }, [item.id]);

  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (active) {
      removeItem(item.id);
    } else {
      addItem(item);
    }
  }

  if (compact) {
    return (
      <button
        onClick={toggle}
        className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
          active
            ? 'bg-[#1a3a6b] text-white'
            : 'bg-black/40 text-white hover:bg-[#1a3a6b]'
        }`}
        title={active ? 'Retirer de la comparaison' : 'Ajouter à la comparaison'}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      className={`inline-flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-xl border transition ${
        active
          ? 'bg-[#1a3a6b] text-white border-[#1a3a6b]'
          : 'border-gray-300 text-gray-600 hover:border-[#1a3a6b] hover:text-[#1a3a6b]'
      }`}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
      {active ? 'Dans la comparaison' : 'Comparer'}
    </button>
  );
}

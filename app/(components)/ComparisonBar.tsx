'use client';

import { useState, useEffect } from 'react';
import { getItems, removeItem, clearAll } from '@/lib/comparison';
import type { CompareItem } from '@/lib/comparison';

export default function ComparisonBar() {
  const [items, setItems] = useState<CompareItem[]>([]);

  useEffect(() => {
    setItems(getItems());
    const handler = () => setItems(getItems());
    window.addEventListener('comparison-changed', handler);
    return () => window.removeEventListener('comparison-changed', handler);
  }, []);

  if (items.length === 0) return null;

  const ids = items.map((i) => i.id).join(',');
  const types = Array.from(new Set(items.map((i) => i.type)));
  const compareUrl = types.length === 1 && types[0] === 'hire'
    ? `/compare?type=hire&ids=${ids}`
    : `/compare?ids=${ids}`;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg safe-area-pb">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0 overflow-x-auto">
          {items.map((item) => (
            <div key={item.id} className="flex-shrink-0 flex items-center gap-1.5 bg-gray-100 rounded-lg px-2.5 py-1.5">
              <span className="text-xs font-medium text-gray-700 max-w-[120px] truncate">{item.label}</span>
              <button
                onClick={() => removeItem(item.id)}
                className="text-gray-400 hover:text-red-500 transition"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={clearAll}
            className="text-xs text-gray-400 hover:text-red-500 transition"
          >
            Vider
          </button>
          <a
            href={compareUrl}
            className="bg-[#1a3a6b] text-white font-bold text-sm px-4 py-2 rounded-xl hover:bg-[#15305a] transition"
          >
            Comparer ({items.length})
          </a>
        </div>
      </div>
    </div>
  );
}

import Link from 'next/link';

type RawParams = Record<string, string | string[] | undefined>;
type ChipLabel = string | ((value: string) => string);

interface Props {
  basePath: string;
  searchParams: RawParams;
  labels: Record<string, ChipLabel>;
  /** Params that should never render as a chip (pagination, etc). */
  hiddenKeys?: string[];
}

export default function FilterChips({ basePath, searchParams, labels, hiddenKeys = ['page'] }: Props) {
  const entries = Object.entries(searchParams).filter(([k, v]) => !hiddenKeys.includes(k) && v);
  if (entries.length === 0) return null;

  function hrefWithout(keyToRemove: string) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) {
      if (k === keyToRemove || k === 'page' || !v) continue;
      sp.set(k, Array.isArray(v) ? v[0] : v);
    }
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  return (
    <div className="flex flex-wrap gap-2 mb-5">
      {entries.map(([k, v]) => {
        const value = Array.isArray(v) ? v[0] : (v as string);
        const label = labels[k];
        const text = typeof label === 'function' ? label(value) : label ? `${label} : ${value}` : `${k.replace(/_/g, ' ')} : ${value}`;
        return (
          <Link
            key={k}
            href={hrefWithout(k)}
            className="inline-flex items-center gap-1.5 bg-brand-navy/10 text-brand-navy text-xs font-semibold px-3 py-1 rounded-full hover:bg-brand-navy/20 transition-colors"
          >
            {text}
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Link>
        );
      })}
    </div>
  );
}

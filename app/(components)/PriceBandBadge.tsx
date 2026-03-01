import type { PriceBand } from '@/lib/types';

interface Props {
  band: PriceBand;
}

const BAND_STYLES: Record<PriceBand, string> = {
  green: 'bg-green-50 text-green-700 border-green-200',
  yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  red: 'bg-red-50 text-red-700 border-red-200',
};

const BAND_LABELS: Record<PriceBand, string> = {
  green: 'Prix juste',
  yellow: 'Prix élevé',
  red: 'Trop cher',
};

export default function PriceBandBadge({ band }: Props) {
  return (
    <span className={`text-xs border px-2 py-0.5 rounded-full font-medium ${BAND_STYLES[band]}`}>
      {BAND_LABELS[band]}
    </span>
  );
}

interface Props {
  zone: string;
}

const ZONE_STYLES: Record<string, string> = {
  A: 'bg-blue-50 text-blue-700 border-blue-200',
  B: 'bg-purple-50 text-purple-700 border-purple-200',
  C: 'bg-orange-50 text-orange-700 border-orange-200',
};

const ZONE_LABELS: Record<string, string> = {
  A: 'Zone A',
  B: 'Zone B',
  C: 'Zone C',
};

export default function ZoneBadge({ zone }: Props) {
  const style = ZONE_STYLES[zone] ?? 'bg-gray-50 text-gray-700 border-gray-200';
  const label = ZONE_LABELS[zone] ?? `Zone ${zone}`;

  return (
    <span className={`text-xs border px-2 py-0.5 rounded-full whitespace-nowrap ${style}`}>
      {label}
    </span>
  );
}

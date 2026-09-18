// Mirrors the `brand` palette in tailwind.config.ts. Use Tailwind classes
// (e.g. `text-brand-navy`) wherever possible; import this only where a literal
// color value is required (inline styles, SVG presentation attributes, values
// passed through a component prop).
export const BRAND = {
  navy: '#1a3a6b',
  navyDark: '#0d1f3c',
  green: '#3d9e3d',
  greenDark: '#2d8a2d',
  amber: '#f5a623',
  amberDark: '#e6951c',
} as const;

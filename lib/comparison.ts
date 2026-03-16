// Vehicle Comparison — client-side localStorage helpers

const STORAGE_KEY = 'mp_compare';
const MAX_ITEMS = 4;

export type CompareItemType = 'listing' | 'hire';

export interface CompareItem {
  id: string;
  type: CompareItemType;
  label: string;
  image?: string;
}

function emit() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('comparison-changed'));
  }
}

export function getItems(): CompareItem[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function addItem(item: CompareItem): boolean {
  const items = getItems();
  if (items.length >= MAX_ITEMS) return false;
  if (items.some((i) => i.id === item.id)) return false;
  items.push(item);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  emit();
  return true;
}

export function removeItem(id: string): void {
  const items = getItems().filter((i) => i.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  emit();
}

export function clearAll(): void {
  localStorage.removeItem(STORAGE_KEY);
  emit();
}

export function isInComparison(id: string): boolean {
  return getItems().some((i) => i.id === id);
}

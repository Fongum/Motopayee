import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { CompareItem } from './comparison';

/**
 * comparison.ts is a browser-only module. The suite runs in the node
 * environment, so rather than pulling in jsdom we stub the two globals it
 * touches: `window` (for the SSR guard and the change event) and
 * `localStorage`.
 */
function makeLocalStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  };
}

const STORAGE_KEY = 'mp_compare';

let storage: ReturnType<typeof makeLocalStorage>;
let dispatchEvent: ReturnType<typeof vi.fn>;

async function loadModule() {
  vi.resetModules();
  return import('./comparison');
}

function item(id: string, overrides: Partial<CompareItem> = {}): CompareItem {
  return { id, type: 'listing', label: `Vehicle ${id}`, ...overrides };
}

beforeEach(() => {
  storage = makeLocalStorage();
  dispatchEvent = vi.fn();
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal('window', { dispatchEvent, localStorage: storage });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('getItems', () => {
  it('returns an empty list when nothing is stored', async () => {
    const { getItems } = await loadModule();
    expect(getItems()).toEqual([]);
  });

  it('returns an empty list for unparseable JSON', async () => {
    storage.setItem(STORAGE_KEY, '{not json');
    const { getItems } = await loadModule();
    expect(getItems()).toEqual([]);
  });

  it('returns an empty list for valid JSON that is not an array', async () => {
    storage.setItem(STORAGE_KEY, '{"a":1}');
    const { getItems } = await loadModule();
    expect(getItems()).toEqual([]);
  });

  it('returns an empty list when window is undefined (SSR)', async () => {
    vi.stubGlobal('window', undefined);
    const { getItems } = await loadModule();
    expect(getItems()).toEqual([]);
  });
});

describe('addItem', () => {
  it('adds an item and persists it', async () => {
    const { addItem, getItems } = await loadModule();

    expect(addItem(item('a'))).toBe(true);
    expect(getItems()).toHaveLength(1);
    expect(getItems()[0].id).toBe('a');
  });

  it('notifies listeners that the comparison changed', async () => {
    const { addItem } = await loadModule();
    addItem(item('a'));
    expect(dispatchEvent).toHaveBeenCalledTimes(1);
  });

  it('rejects a duplicate id without touching storage', async () => {
    const { addItem, getItems } = await loadModule();

    expect(addItem(item('a'))).toBe(true);
    expect(addItem(item('a', { label: 'Renamed' }))).toBe(false);
    expect(getItems()).toHaveLength(1);
    expect(getItems()[0].label).toBe('Vehicle a');
  });

  it('caps the comparison at 4 items', async () => {
    const { addItem, getItems } = await loadModule();

    for (const id of ['a', 'b', 'c', 'd']) {
      expect(addItem(item(id))).toBe(true);
    }
    expect(addItem(item('e'))).toBe(false);
    expect(getItems()).toHaveLength(4);
    expect(getItems().map((i) => i.id)).not.toContain('e');
  });

  it('recovers from a corrupted store rather than throwing', async () => {
    storage.setItem(STORAGE_KEY, '{"a":1}');
    const { addItem, getItems } = await loadModule();

    expect(() => addItem(item('a'))).not.toThrow();
    expect(getItems()).toHaveLength(1);
  });

  it('keeps listing and hire items side by side', async () => {
    const { addItem, getItems } = await loadModule();

    addItem(item('a', { type: 'listing' }));
    addItem(item('b', { type: 'hire' }));

    expect(getItems().map((i) => i.type)).toEqual(['listing', 'hire']);
  });
});

describe('removeItem', () => {
  it('removes only the matching id', async () => {
    const { addItem, removeItem, getItems } = await loadModule();

    addItem(item('a'));
    addItem(item('b'));
    removeItem('a');

    expect(getItems().map((i) => i.id)).toEqual(['b']);
  });

  it('is a no-op for an unknown id', async () => {
    const { addItem, removeItem, getItems } = await loadModule();

    addItem(item('a'));
    removeItem('missing');

    expect(getItems()).toHaveLength(1);
  });
});

describe('clearAll', () => {
  it('empties the comparison', async () => {
    const { addItem, clearAll, getItems } = await loadModule();

    addItem(item('a'));
    addItem(item('b'));
    clearAll();

    expect(getItems()).toEqual([]);
  });
});

describe('isInComparison', () => {
  it('reports membership', async () => {
    const { addItem, isInComparison } = await loadModule();

    addItem(item('a'));

    expect(isInComparison('a')).toBe(true);
    expect(isInComparison('b')).toBe(false);
  });
});

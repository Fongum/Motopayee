import { describe, it, expect } from 'vitest';
import { fetchAllRows } from './fetch-all-rows';

/** A fake table that, like PostgREST, never returns more than `maxRows`. */
function fakeTable(total: number, maxRows = 1000) {
  const rows = Array.from({ length: total }, (_, i) => ({ id: i }));
  const calls: Array<[number, number]> = [];
  const page = async (from: number, to: number) => {
    calls.push([from, to]);
    const end = Math.min(to + 1, from + maxRows);
    return { data: rows.slice(from, end), error: null };
  };
  return { page, calls };
}

describe('fetchAllRows', () => {
  it('reads past the 1000-row cap that a single select stops at', async () => {
    const { page } = fakeTable(2500);
    const { data, error } = await fetchAllRows(page);
    expect(error).toBeNull();
    expect(data).toHaveLength(2500);
    expect(data[2499]).toEqual({ id: 2499 });
  });

  it('returns each row exactly once across page boundaries', async () => {
    const { page } = fakeTable(2001);
    const { data } = await fetchAllRows(page);
    expect(new Set(data.map((r) => r.id)).size).toBe(2001);
  });

  it('makes one request when everything fits in the first page', async () => {
    const { page, calls } = fakeTable(12);
    const { data } = await fetchAllRows(page);
    expect(data).toHaveLength(12);
    expect(calls).toEqual([[0, 999]]);
  });

  it('asks for one more page when the total lands exactly on a boundary', async () => {
    // A full page is indistinguishable from "there may be more".
    const { page, calls } = fakeTable(2000);
    const { data } = await fetchAllRows(page);
    expect(data).toHaveLength(2000);
    expect(calls).toHaveLength(3);
  });

  it('handles an empty result', async () => {
    const { page } = fakeTable(0);
    expect((await fetchAllRows(page)).data).toEqual([]);
  });

  it('treats null data as an empty page', async () => {
    const { data, error } = await fetchAllRows(async () => ({ data: null, error: null }));
    expect(data).toEqual([]);
    expect(error).toBeNull();
  });

  it('stops and surfaces the error when a later page fails', async () => {
    let n = 0;
    const { data, error } = await fetchAllRows(async (from, to) => {
      n += 1;
      if (n === 2) return { data: null, error: { message: 'boom' } };
      return { data: Array.from({ length: to - from + 1 }, (_, i) => ({ id: from + i })), error: null };
    });
    expect(error).toEqual({ message: 'boom' });
    expect(data).toHaveLength(1000);
  });

  it('honours a custom page size', async () => {
    const { page, calls } = fakeTable(25);
    const { data } = await fetchAllRows(page, 10);
    expect(data).toHaveLength(25);
    expect(calls).toEqual([[0, 9], [10, 19], [20, 29]]);
  });
});

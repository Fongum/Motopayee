import { describe, it, expect } from 'vitest';
import { buildDailySeries, dayKey } from './daily-series';

const NOW = new Date('2026-08-28T09:00:00.000Z');
const day = (offset: number) => dayKey(new Date(NOW.getTime() - offset * 86_400_000));

describe('dayKey', () => {
  it('formats a date as YYYY-MM-DD in UTC', () => {
    expect(dayKey(new Date('2026-08-28T23:30:00.000Z'))).toBe('2026-08-28');
  });
});

describe('buildDailySeries', () => {
  it('returns one zero-filled point per day, oldest first', () => {
    const series = buildDailySeries([], 7, NOW);
    expect(series).toHaveLength(7);
    expect(series[0].date).toBe(day(6));
    expect(series[6].date).toBe(day(0));
    expect(series.every((point) => point.count === 0)).toBe(true);
  });

  it('counts repeated days into the matching bucket', () => {
    const series = buildDailySeries([day(0), day(0), day(2)], 7, NOW);
    expect(series[6].count).toBe(2);
    expect(series[4].count).toBe(1);
    expect(series[5].count).toBe(0);
  });

  it('ignores days outside the window', () => {
    const series = buildDailySeries([day(30), day(1)], 7, NOW);
    expect(series.reduce((sum, point) => sum + point.count, 0)).toBe(1);
  });

  it('ignores empty day keys', () => {
    const series = buildDailySeries(['', day(1)], 7, NOW);
    expect(series.reduce((sum, point) => sum + point.count, 0)).toBe(1);
  });
});

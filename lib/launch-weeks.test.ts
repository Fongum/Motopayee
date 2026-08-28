import { describe, it, expect } from 'vitest';
import {
  endOfLaunchWeek,
  groupWeeklyRows,
  recentWeekStarts,
  startOfLaunchWeek,
  weekStartKey,
  WEEKLY_METRICS,
} from './launch-weeks';

describe('startOfLaunchWeek', () => {
  it('returns the Monday of the same week', () => {
    // 2026-08-28 is a Friday.
    expect(weekStartKey(startOfLaunchWeek(new Date('2026-08-28T15:00:00')))).toBe('2026-08-24');
  });

  it('treats Sunday as the end of the week, not the start', () => {
    // 2026-08-30 is a Sunday; its week began Monday the 24th.
    expect(weekStartKey(startOfLaunchWeek(new Date('2026-08-30T23:59:00')))).toBe('2026-08-24');
  });

  it('is stable on a Monday', () => {
    expect(weekStartKey(startOfLaunchWeek(new Date('2026-08-24T00:00:00')))).toBe('2026-08-24');
  });

  it('strips the time so a week has one key all day', () => {
    const morning = startOfLaunchWeek(new Date('2026-08-26T06:00:00'));
    const evening = startOfLaunchWeek(new Date('2026-08-26T22:00:00'));
    expect(morning.getTime()).toBe(evening.getTime());
    expect(morning.getHours()).toBe(0);
  });

  it('crosses a month boundary correctly', () => {
    // 2026-09-02 is a Wednesday; its Monday falls in August.
    expect(weekStartKey(startOfLaunchWeek(new Date('2026-09-02T12:00:00')))).toBe('2026-08-31');
  });
});

describe('endOfLaunchWeek', () => {
  it('is exactly seven days after the start', () => {
    const start = startOfLaunchWeek(new Date('2026-08-28T12:00:00'));
    expect(weekStartKey(endOfLaunchWeek(start))).toBe('2026-08-31');
  });

  it('does not mutate the start it is given', () => {
    const start = startOfLaunchWeek(new Date('2026-08-28T12:00:00'));
    const before = start.getTime();
    endOfLaunchWeek(start);
    expect(start.getTime()).toBe(before);
  });
});

describe('recentWeekStarts', () => {
  it('returns consecutive Mondays, oldest first, ending with the current week', () => {
    expect(recentWeekStarts(4, new Date('2026-08-28T12:00:00'))).toEqual([
      '2026-08-03',
      '2026-08-10',
      '2026-08-17',
      '2026-08-24',
    ]);
  });

  it('returns just the current week for a count of one', () => {
    expect(recentWeekStarts(1, new Date('2026-08-28T12:00:00'))).toEqual(['2026-08-24']);
  });
});

describe('groupWeeklyRows', () => {
  it('folds flat rows into one record per week, oldest first', () => {
    const grouped = groupWeeklyRows([
      { week_start: '2026-08-24', metric_key: 'seller_contacts', value: 4 },
      { week_start: '2026-08-17', metric_key: 'seller_contacts', value: 2 },
      { week_start: '2026-08-24', metric_key: 'buyer_inquiries', value: 9 },
    ]);

    expect(grouped).toEqual([
      { weekStart: '2026-08-17', values: { seller_contacts: 2 } },
      { weekStart: '2026-08-24', values: { seller_contacts: 4, buyer_inquiries: 9 } },
    ]);
  });

  it('returns nothing for no rows', () => {
    expect(groupWeeklyRows([])).toEqual([]);
  });

  it('keeps a zero value rather than dropping it', () => {
    const grouped = groupWeeklyRows([{ week_start: '2026-08-24', metric_key: 'rental_bookings', value: 0 }]);
    expect(grouped[0].values.rental_bookings).toBe(0);
  });
});

describe('WEEKLY_METRICS', () => {
  it('has unique keys', () => {
    const keys = WEEKLY_METRICS.map((metric) => metric.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('gives every metric a positive target', () => {
    expect(WEEKLY_METRICS.every((metric) => metric.target > 0)).toBe(true);
  });
});

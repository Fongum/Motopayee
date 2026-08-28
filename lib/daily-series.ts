export interface DailyPoint {
  date: string;
  count: number;
}

/** YYYY-MM-DD for a date, in UTC — matches how `date_day` columns are written. */
export function dayKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Bucket a list of day keys into a zero-filled series covering the last
 * `windowDays` days, oldest first. Days outside the window are ignored.
 */
export function buildDailySeries(days: string[], windowDays: number, now: Date = new Date()): DailyPoint[] {
  const counts: Record<string, number> = {};
  for (const day of days) {
    if (!day) continue;
    counts[day] = (counts[day] ?? 0) + 1;
  }

  return Array.from({ length: windowDays }, (_, i) => {
    const date = dayKey(new Date(now.getTime() - (windowDays - 1 - i) * 86_400_000));
    return { date, count: counts[date] ?? 0 };
  });
}

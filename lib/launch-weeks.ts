/**
 * The weekly scorecard from docs/30-day-launch-scorecard.md, computed rather
 * than typed into a spreadsheet. Metrics are captured per week so week 1 is
 * still readable in week 4 — a live count alone loses the history it needs.
 */

export interface WeeklyMetricDefinition {
  key: string;
  label: string;
  target: number;
  href: string;
}

export const WEEKLY_METRICS: WeeklyMetricDefinition[] = [
  { key: 'seller_contacts', label: 'Seller contacts', target: 20, href: '/admin/leads?type=seller' },
  { key: 'dealer_contacts', label: 'Dealer contacts', target: 5, href: '/admin/leads?type=dealer' },
  { key: 'rental_owner_contacts', label: 'Rental owner contacts', target: 10, href: '/admin/leads?type=rental_owner' },
  { key: 'mfi_contacts', label: 'MFI contacts', target: 3, href: '/admin/leads?type=mfi' },
  { key: 'listings_reviewed', label: 'Listings reviewed', target: 10, href: '/admin/listings?status=pending' },
  { key: 'listings_published', label: 'Listings published', target: 5, href: '/admin/listings?status=published' },
  { key: 'rentals_published', label: 'Rentals published', target: 5, href: '/admin/hire' },
  { key: 'inspection_requests', label: 'Inspection requests', target: 2, href: '/admin/inspection-requests' },
  { key: 'finance_applications', label: 'Finance applications', target: 2, href: '/admin/applications' },
  { key: 'rental_bookings', label: 'Rental bookings', target: 1, href: '/admin/hire/bookings' },
  { key: 'buyer_inquiries', label: 'Buyer inquiries', target: 10, href: '/admin/listings?status=published' },
  { key: 'renter_inquiries', label: 'Renter inquiries', target: 5, href: '/admin/hire' },
];

export type WeeklyMetricValues = Record<string, number>;

export interface WeeklySnapshot {
  weekStart: string;
  values: WeeklyMetricValues;
}

/** Launch weeks run Monday to Sunday, matching the scorecard doc. */
export function startOfLaunchWeek(date: Date): Date {
  const start = new Date(date);
  const day = start.getDay();
  const distanceFromMonday = day === 0 ? 6 : day - 1;
  start.setDate(start.getDate() - distanceFromMonday);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function endOfLaunchWeek(weekStart: Date): Date {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 7);
  return end;
}

/** Stable YYYY-MM-DD key for a week, in local time to match startOfLaunchWeek. */
export function weekStartKey(weekStart: Date): string {
  const year = weekStart.getFullYear();
  const month = String(weekStart.getMonth() + 1).padStart(2, '0');
  const day = String(weekStart.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** The last `count` week starts, oldest first, ending with the week containing `now`. */
export function recentWeekStarts(count: number, now: Date = new Date()): string[] {
  const current = startOfLaunchWeek(now);
  return Array.from({ length: count }, (_, i) => {
    const week = new Date(current);
    week.setDate(week.getDate() - (count - 1 - i) * 7);
    return weekStartKey(week);
  });
}

/** Fold flat (week_start, metric_key, value) rows into one record per week. */
export function groupWeeklyRows(
  rows: { week_start: string; metric_key: string; value: number }[]
): WeeklySnapshot[] {
  const byWeek = new Map<string, WeeklyMetricValues>();

  for (const row of rows) {
    const values = byWeek.get(row.week_start) ?? {};
    values[row.metric_key] = row.value;
    byWeek.set(row.week_start, values);
  }

  return Array.from(byWeek.entries())
    .map(([weekStart, values]) => ({ weekStart, values }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

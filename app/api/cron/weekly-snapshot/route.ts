import { NextResponse } from 'next/server';
import { captureWeeklyMetrics, startOfLaunchWeek } from '@/lib/launch-metrics';
import { logFailure, logger } from '@/lib/logger';

/**
 * /api/cron/weekly-snapshot — captures the scorecard for the week that just
 * ended, then refreshes the current one.
 *
 * Scheduled Monday 06:00 UTC in vercel.json. Vercel invokes crons with GET,
 * so both verbs are exported; capture is idempotent, so a retry or a manual
 * run refines the stored figures rather than duplicating them.
 */
async function handle(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const currentWeek = startOfLaunchWeek(new Date());
  const previousWeek = new Date(currentWeek);
  previousWeek.setDate(previousWeek.getDate() - 7);

  const captured: string[] = [];

  for (const week of [previousWeek, currentWeek]) {
    const { weekStart, error } = await captureWeeklyMetrics(week);
    if (error) {
      logFailure('weekly_snapshot.capture_failed', { weekStart, error });
      return NextResponse.json({ error: 'Capture failed.', weekStart }, { status: 500 });
    }
    captured.push(weekStart);
  }

  logger.info('Weekly scorecard captured', { weeks: captured });
  return NextResponse.json({ captured });
}

export const GET = handle;
export const POST = handle;

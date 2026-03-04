import { NextResponse } from 'next/server';
import { computeEligibility } from '@/lib/rules';
import type { ZoneCode, IncomeGrade, ConditionGrade, PriceBand } from '@/lib/types';

const VALID_ZONES = ['A', 'B', 'C'];
const VALID_GRADES = ['A', 'B', 'C', 'D'];
const VALID_BANDS = ['green', 'yellow', 'red'];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const zone = searchParams.get('zone') ?? '';
  const income_grade = searchParams.get('income_grade') ?? '';
  const price_band = searchParams.get('price_band') ?? 'green';
  const condition_grade = searchParams.get('condition_grade') ?? '';

  if (!VALID_ZONES.includes(zone) || !VALID_GRADES.includes(income_grade) || !VALID_GRADES.includes(condition_grade)) {
    return NextResponse.json({ error: 'Missing or invalid params.' }, { status: 400 });
  }
  const band = VALID_BANDS.includes(price_band) ? price_band : 'green';

  const result = await computeEligibility(
    zone as ZoneCode,
    income_grade as IncomeGrade,
    band as PriceBand,
    condition_grade as ConditionGrade
  );

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'public, max-age=300' },
  });
}

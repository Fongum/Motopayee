import { NextResponse } from 'next/server';
import { requireSeller } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';

const REQUIRED = ['make', 'model', 'year', 'mileage_km', 'fuel_type', 'transmission', 'asking_price', 'zone'] as const;
const VALID_FUEL = ['petrol', 'diesel', 'electric', 'hybrid', 'other'];
const VALID_TRANS = ['manual', 'automatic', 'other'];
const VALID_ZONES = ['A', 'B', 'C'];

function parseCSV(csv: string): Record<string, string>[] {
  const lines = csv.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cols = line.split(',').map((c) => c.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = cols[i] ?? ''; });
    return row;
  });
}

export async function POST(request: Request) {
  const auth = await requireSeller(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // Accept JSON body with { csv: string }
  const body = await request.json().catch(() => ({})) as { csv?: string };
  if (!body.csv) {
    return NextResponse.json({ error: 'csv field is required.' }, { status: 400 });
  }

  const rows = parseCSV(body.csv);
  if (rows.length === 0) {
    return NextResponse.json({ error: 'No rows found. Include a header row.' }, { status: 400 });
  }
  if (rows.length > 100) {
    return NextResponse.json({ error: 'Maximum 100 rows per upload.' }, { status: 400 });
  }

  const created: string[] = [];
  const errors: { row: number; reason: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // 1-indexed, skip header row

    // Validate required fields
    const missing = REQUIRED.filter((f) => !row[f]);
    if (missing.length > 0) {
      errors.push({ row: rowNum, reason: `Champs manquants: ${missing.join(', ')}` });
      continue;
    }

    const year = parseInt(row.year);
    const mileage = parseInt(row.mileage_km);
    const price = parseInt(row.asking_price);
    const engineCc = row.engine_cc ? parseInt(row.engine_cc) : null;
    const seats = row.seats ? parseInt(row.seats) : null;

    if (isNaN(year) || year < 1970 || year > new Date().getFullYear() + 1) {
      errors.push({ row: rowNum, reason: `Année invalide: ${row.year}` }); continue;
    }
    if (isNaN(mileage) || mileage < 0) {
      errors.push({ row: rowNum, reason: `Kilométrage invalide: ${row.mileage_km}` }); continue;
    }
    if (isNaN(price) || price <= 0) {
      errors.push({ row: rowNum, reason: `Prix invalide: ${row.asking_price}` }); continue;
    }
    if (!VALID_FUEL.includes(row.fuel_type)) {
      errors.push({ row: rowNum, reason: `Type carburant invalide: ${row.fuel_type}` }); continue;
    }
    if (!VALID_TRANS.includes(row.transmission)) {
      errors.push({ row: rowNum, reason: `Transmission invalide: ${row.transmission}` }); continue;
    }
    if (!VALID_ZONES.includes(row.zone?.toUpperCase())) {
      errors.push({ row: rowNum, reason: `Zone invalide (A/B/C): ${row.zone}` }); continue;
    }

    // Create vehicle
    const { data: vehicle, error: vErr } = await supabaseAdmin
      .from('vehicles')
      .insert({
        make: row.make,
        model: row.model,
        year,
        mileage_km: mileage,
        fuel_type: row.fuel_type,
        transmission: row.transmission,
        color: row.color || null,
        engine_cc: engineCc,
        seats,
      })
      .select('id')
      .single();

    if (vErr || !vehicle) {
      errors.push({ row: rowNum, reason: 'Erreur lors de la création du véhicule.' }); continue;
    }

    // Create listing
    const { data: listing, error: lErr } = await supabaseAdmin
      .from('listings')
      .insert({
        vehicle_id: (vehicle as { id: string }).id,
        seller_id: auth.user.id,
        asking_price: price,
        zone: row.zone.toUpperCase(),
        city: row.city || null,
        description: row.description || null,
        status: 'draft',
        financeable: false,
      })
      .select('id')
      .single();

    if (lErr || !listing) {
      errors.push({ row: rowNum, reason: 'Erreur lors de la création de l\'annonce.' }); continue;
    }

    created.push((listing as { id: string }).id);
  }

  return NextResponse.json({
    created: created.length,
    listing_ids: created,
    errors,
    total_rows: rows.length,
  });
}

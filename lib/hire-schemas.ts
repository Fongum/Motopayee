/**
 * Shared zod shapes for hire listings.
 *
 * Create (POST /api/hire) and update (PATCH /api/hire/[id]) accept the same
 * fields, so the field rules live here once. Every enum mirrors a CHECK
 * constraint in migration 010 — keep them in sync.
 */

import { z } from 'zod';
import { optionalText, amountXaf } from './validation';

const currentYear = new Date().getFullYear();

/** Rates are whole XAF amounts; null clears an optional rate. */
const optionalRate = amountXaf.nullish();

export const hireListingFields = {
  make: z.string().trim().min(1).max(60),
  model: z.string().trim().min(1).max(60),
  year: z.number().int().min(1970).max(currentYear + 1),
  fuel_type: z.enum(['petrol', 'diesel', 'electric', 'hybrid', 'other']),
  transmission: z.enum(['manual', 'automatic', 'other']),
  color: optionalText(40),
  seats: z.number().int().min(1).max(60),
  engine_cc: z.number().int().min(0).max(20000).nullish(),
  plate_number: optionalText(20),
  hire_type: z.enum(['self_drive', 'with_driver', 'both']),
  daily_rate: amountXaf,
  weekly_rate: optionalRate,
  monthly_rate: optionalRate,
  deposit_amount: amountXaf.nullish(),
  driver_daily_rate: optionalRate,
  mileage_limit_per_day_km: z.number().int().min(0).max(100000).nullish(),
  extra_km_charge: amountXaf.nullish(),
  min_hire_days: z.number().int().min(1).max(365),
  max_hire_days: z.number().int().min(1).max(365).nullish(),
  city: z.string().trim().min(1).max(80),
  zone: z.enum(['A', 'B', 'C']),
  address: optionalText(200),
  latitude: z.number().min(-90).max(90).nullish(),
  longitude: z.number().min(-180).max(180).nullish(),
  description: optionalText(4000),
  conditions: optionalText(4000),
  features: z.array(z.string().trim().min(1).max(60)).max(40),
  insurance_included: z.boolean(),
  availability: z.enum(['available', 'hired_out', 'maintenance', 'unavailable']),
} as const;

/**
 * Create payload. make/model/year/daily_rate/city are required (as before);
 * everything else falls back to the same defaults the route used to apply
 * inline, so the DB defaults and the API stay consistent.
 */
export const createHireListingSchema = z
  .object({
    ...hireListingFields,
    dealer_id: z.string().uuid().nullish(),
    launch_lead_id: z.string().uuid().optional(),
    fuel_type: hireListingFields.fuel_type.default('petrol'),
    transmission: hireListingFields.transmission.default('automatic'),
    seats: hireListingFields.seats.default(5),
    hire_type: hireListingFields.hire_type.default('self_drive'),
    deposit_amount: amountXaf.nullish().default(0),
    min_hire_days: hireListingFields.min_hire_days.default(1),
    zone: hireListingFields.zone.default('A'),
    features: hireListingFields.features.default([]),
    insurance_included: hireListingFields.insurance_included.default(false),
  })
  .omit({ availability: true })
  .refine((v) => v.max_hire_days == null || v.max_hire_days >= v.min_hire_days, {
    message: 'max_hire_days doit être supérieur ou égal à min_hire_days.',
    path: ['max_hire_days'],
  })
  .refine((v) => v.hire_type === 'self_drive' || v.driver_daily_rate != null, {
    message: 'driver_daily_rate est requis pour les locations avec chauffeur.',
    path: ['driver_daily_rate'],
  });

/**
 * Update payload — every field optional, but at least one must be present so a
 * no-op PATCH is rejected rather than silently succeeding.
 */
export const updateHireListingSchema = z
  .object(hireListingFields)
  .partial()
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: 'Aucun champ à mettre à jour.',
  })
  .refine(
    (v) =>
      v.min_hire_days == null || v.max_hire_days == null || v.max_hire_days >= v.min_hire_days,
    {
      message: 'max_hire_days doit être supérieur ou égal à min_hire_days.',
      path: ['max_hire_days'],
    }
  );

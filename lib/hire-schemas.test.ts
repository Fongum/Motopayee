import { describe, it, expect } from 'vitest';
import { createHireListingSchema, updateHireListingSchema } from './hire-schemas';

const base = { make: 'Toyota', model: 'Corolla', year: 2018, daily_rate: 25000, city: 'Douala', min_hire_days: 1 };

describe('hire listing deposit', () => {
  // The new-listing forms default the deposit to 0. It used to be validated as
  // a positive amount, so every owner who left it alone got a 400.
  it('accepts 0 — "no deposit" — on create', () => {
    const r = createHireListingSchema.safeParse({ ...base, deposit_amount: 0 });
    expect(r.success && r.data.deposit_amount).toBe(0);
  });

  it('defaults a missing deposit to 0', () => {
    const r = createHireListingSchema.safeParse(base);
    expect(r.success && r.data.deposit_amount).toBe(0);
  });

  // The column is bigint NOT NULL: null used to pass validation and then fail
  // the insert with a 500.
  it.each([
    ['create', () => createHireListingSchema.safeParse({ ...base, deposit_amount: null })],
    ['update', () => updateHireListingSchema.safeParse({ deposit_amount: null })],
  ])('turns null into 0 on %s', (_label, parse) => {
    const r = parse();
    expect(r.success && r.data.deposit_amount).toBe(0);
  });

  it('accepts 0 on update', () => {
    const r = updateHireListingSchema.safeParse({ deposit_amount: 0 });
    expect(r.success && r.data.deposit_amount).toBe(0);
  });

  it('still rejects a negative deposit', () => {
    expect(createHireListingSchema.safeParse({ ...base, deposit_amount: -1 }).success).toBe(false);
  });
});

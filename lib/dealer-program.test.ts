import { describe, it, expect } from 'vitest';
import {
  DEALER_REQUIREMENTS,
  dealerProgramGaps,
  isProgramDealer,
  type DealerProgramRecord,
} from './dealer-program';

const AT = '2026-10-01T10:00:00Z';

const complete: DealerProgramRecord = {
  dealer_name: 'Garage Akwa',
  manager_name: 'Paul N.',
  manager_phone: '+237 690 000 000',
  manager_contact_confirmed_at: AT,
  inventory_contact_name: 'Marie T.',
  inventory_contact_phone: '+237 691 000 000',
  agreed_listing_accuracy_at: AT,
  agreed_sold_updates_at: AT,
  agreed_lead_handling_at: AT,
  agreed_no_false_financeable_at: AT,
};

describe('dealerProgramGaps', () => {
  it('is empty when every requirement is recorded', () => {
    expect(dealerProgramGaps(complete)).toEqual([]);
  });

  it('lists all seven for a bare dealer row', () => {
    const bare: DealerProgramRecord = {
      dealer_name: null,
      manager_name: null,
      manager_phone: null,
      manager_contact_confirmed_at: null,
      inventory_contact_name: null,
      inventory_contact_phone: null,
      agreed_listing_accuracy_at: null,
      agreed_sold_updates_at: null,
      agreed_lead_handling_at: null,
      agreed_no_false_financeable_at: null,
    };
    expect(dealerProgramGaps(bare)).toHaveLength(7);
  });

  it.each([
    ['manager_name', 'manager_contact'],
    ['manager_phone', 'manager_contact'],
    ['manager_contact_confirmed_at', 'manager_contact'],
    ['inventory_contact_name', 'inventory_contact'],
    ['inventory_contact_phone', 'inventory_contact'],
    ['agreed_listing_accuracy_at', 'listing_accuracy'],
    ['agreed_sold_updates_at', 'sold_updates'],
    ['agreed_lead_handling_at', 'lead_handling'],
    ['agreed_no_false_financeable_at', 'no_false_financeable'],
    ['dealer_name', 'business_name'],
  ] as const)('missing %s fails %s alone', (column, requirement) => {
    expect(dealerProgramGaps({ ...complete, [column]: null })).toEqual([requirement]);
  });

  it('treats whitespace-only text as missing, like the table CHECK', () => {
    expect(dealerProgramGaps({ ...complete, manager_name: '   ' })).toEqual(['manager_contact']);
  });

  it('has seven requirements, one per policy line', () => {
    expect(DEALER_REQUIREMENTS).toHaveLength(7);
    expect(new Set(DEALER_REQUIREMENTS.map((r) => r.key)).size).toBe(7);
  });
});

describe('isProgramDealer', () => {
  it('is true when the embedded dealer row is verified', () => {
    expect(isProgramDealer({ dealers: [{ verified: true }] })).toBe(true);
  });

  it('accepts a single embedded object as well as an array', () => {
    expect(isProgramDealer({ dealers: { verified: true } })).toBe(true);
  });

  it.each([
    ['no seller', undefined],
    ['null seller', null],
    ['dealers not selected', {}],
    ['no dealer row', { dealers: [] }],
    ['null embed', { dealers: null }],
    ['unverified row', { dealers: [{ verified: false }] }],
  ])('is false with %s — no evidence, no badge', (_label, seller) => {
    expect(isProgramDealer(seller as Parameters<typeof isProgramDealer>[0])).toBe(false);
  });
});

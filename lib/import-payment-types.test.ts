import { describe, it, expect } from 'vitest';
import {
  BUYER_PAYABLE_TYPES,
  PAYMENT_RULES,
  checkPayable,
  isBuyerPayableType,
} from './import-payment-types';

describe('what a buyer may pay', () => {
  it('offers only the types with a real amount source', () => {
    // shipping_fee and service_fee are allowed by the check constraint but no
    // code ever populates an amount for them, so offering them would let a
    // buyer start a payment for zero.
    expect([...BUYER_PAYABLE_TYPES]).toEqual(['reservation_deposit', 'purchase_balance']);
  });

  it('rejects a type outside that list', () => {
    expect(isBuyerPayableType('shipping_fee')).toBe(false);
    expect(isBuyerPayableType('refund')).toBe(false);
    expect(isBuyerPayableType('')).toBe(false);
    expect(isBuyerPayableType(undefined)).toBe(false);
  });

  it('never reads an amount from anywhere but the order', () => {
    for (const rule of Object.values(PAYMENT_RULES)) {
      expect(['reservation_deposit_amount', 'purchase_amount_due']).toContain(rule.amountColumn);
    }
  });
});

describe('reservation deposit', () => {
  const order = { status: 'deposit_pending', reservation_deposit_amount: 250_000 };

  it('is payable while the deposit is outstanding', () => {
    expect(checkPayable('reservation_deposit', order)).toEqual({ ok: true, amount: 250_000 });
    expect(checkPayable('reservation_deposit', { ...order, status: 'quote_sent' }).ok).toBe(true);
  });

  it('is not payable once the order has moved on', () => {
    // Behaviour preserved exactly: these were the only two statuses before.
    for (const status of ['deposit_paid', 'purchased', 'in_transit', 'completed', 'cancelled']) {
      expect(checkPayable('reservation_deposit', { ...order, status }).ok).toBe(false);
    }
  });
});

describe('purchase balance', () => {
  const order = { status: 'deposit_paid', purchase_amount_due: 4_750_000 };

  it('becomes payable once the deposit has landed', () => {
    expect(checkPayable('purchase_balance', order)).toEqual({ ok: true, amount: 4_750_000 });
    expect(checkPayable('purchase_balance', { ...order, status: 'purchase_authorized' }).ok).toBe(true);
  });

  it('is not payable before the deposit is in', () => {
    for (const status of ['quote_sent', 'deposit_pending']) {
      const result = checkPayable('purchase_balance', { ...order, status });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.status).toBe(400);
    }
  });

  it('is not payable once the vehicle has been bought', () => {
    for (const status of ['purchased', 'shipping_booked', 'in_transit', 'completed']) {
      expect(checkPayable('purchase_balance', { ...order, status }).ok).toBe(false);
    }
  });
});

describe('amounts', () => {
  it('refuses when the amount has not been configured', () => {
    // Distinct from the wrong-stage case: an admin has not set a number, and
    // nothing should be charged until they do.
    const result = checkPayable('purchase_balance', { status: 'deposit_paid', purchase_amount_due: null });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/not have a purchase balance amount configured/i);
  });

  it('refuses a zero or negative amount', () => {
    expect(checkPayable('purchase_balance', { status: 'deposit_paid', purchase_amount_due: 0 }).ok).toBe(false);
    expect(checkPayable('purchase_balance', { status: 'deposit_paid', purchase_amount_due: -1 }).ok).toBe(false);
  });

  it('reads the numeric string Postgres returns for numeric columns', () => {
    const result = checkPayable('purchase_balance', { status: 'deposit_paid', purchase_amount_due: '4750000.00' });
    expect(result).toEqual({ ok: true, amount: 4_750_000 });
  });

  it('rounds to whole XAF, which has no subunit', () => {
    const result = checkPayable('purchase_balance', { status: 'deposit_paid', purchase_amount_due: '1000.49' });
    expect(result).toEqual({ ok: true, amount: 1_000 });
  });

  it('refuses a non-numeric amount rather than charging NaN', () => {
    expect(checkPayable('purchase_balance', { status: 'deposit_paid', purchase_amount_due: 'abc' }).ok).toBe(false);
  });
});

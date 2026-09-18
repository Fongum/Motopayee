/**
 * Which import payments a buyer can make, and when.
 *
 * `import_payments.payment_type` allows five values. Only `reservation_deposit`
 * could ever be requested, so a buyer paid the deposit and then had no way to
 * pay anything else through the platform.
 *
 * Two of the remaining four are still not offered, and the reason is worth
 * stating rather than leaving as an omission:
 *
 *   `shipping_fee`  — `import_orders.shipping_amount_due` is never populated by
 *                     any code path, and there is no admin screen to set it.
 *                     A payment type with no amount source is a door to a room
 *                     that does not exist.
 *   `service_fee`   — likewise. `final_amount_due` is set equal to the purchase
 *                     balance when a quote is accepted, so it is a running
 *                     "still owed" figure, not a separate platform fee.
 *
 * Both need an amount source and an admin screen before they mean anything.
 * `refund` is not a buyer-initiated payment at all.
 */

export const BUYER_PAYABLE_TYPES = ['reservation_deposit', 'purchase_balance'] as const;
export type BuyerPayableType = (typeof BUYER_PAYABLE_TYPES)[number];

export interface PaymentRule {
  /** Order statuses at which this payment may be started. */
  allowedStatuses: readonly string[];
  /** The column on import_orders holding the amount. Never taken from the client. */
  amountColumn: 'reservation_deposit_amount' | 'purchase_amount_due';
  /** Used in the messages the buyer sees. */
  label: string;
}

export const PAYMENT_RULES: Record<BuyerPayableType, PaymentRule> = {
  reservation_deposit: {
    // A deposit reserves the vehicle, so it is payable as soon as the quote is
    // out and until it has been paid.
    allowedStatuses: ['quote_sent', 'deposit_pending'],
    amountColumn: 'reservation_deposit_amount',
    label: 'Reservation deposit',
  },
  purchase_balance: {
    // The balance funds the actual purchase, so it comes after the deposit has
    // landed and before the partner buys. `purchase_amount_due` is the accepted
    // quote's total minus the deposit, set when the buyer accepted the quote.
    allowedStatuses: ['deposit_paid', 'purchase_authorized'],
    amountColumn: 'purchase_amount_due',
    label: 'Purchase balance',
  },
};

export function isBuyerPayableType(value: unknown): value is BuyerPayableType {
  return typeof value === 'string' && (BUYER_PAYABLE_TYPES as readonly string[]).includes(value);
}

export interface OrderAmounts {
  status: string;
  reservation_deposit_amount?: number | string | null;
  purchase_amount_due?: number | string | null;
}

export type PaymentCheck =
  | { ok: true; amount: number }
  | { ok: false; status: number; error: string };

/**
 * Whether this payment can be started against this order, and for how much.
 *
 * The amount always comes from the order, never from the request body — a
 * buyer must not be able to name their own price. An amount of zero means an
 * admin has not configured it yet, which is a different problem from the wrong
 * stage and gets a different message.
 */
export function checkPayable(type: BuyerPayableType, order: OrderAmounts): PaymentCheck {
  const rule = PAYMENT_RULES[type];

  if (!rule.allowedStatuses.includes(order.status)) {
    return {
      ok: false,
      status: 400,
      error: `${rule.label} is not available for an order in status ${order.status}.`,
    };
  }

  const raw = order[rule.amountColumn];
  const amount = Math.round(Number(raw ?? 0));

  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      ok: false,
      status: 400,
      error: `This order does not have a ${rule.label.toLowerCase()} amount configured.`,
    };
  }

  return { ok: true, amount };
}

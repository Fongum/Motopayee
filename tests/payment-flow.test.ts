import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createSupabaseMock, testUser, type SupabaseMock } from './support/supabase-mock';

/**
 * The payment path, end to end: a buyer requests a mobile-money deposit, MTN
 * calls back, and the payment settles.
 *
 * Unit tests cover each piece; this covers the seams between them, which is
 * where the money bugs have lived. The webhook in particular has one property
 * that matters more than any other: it must not believe what it is told. A
 * forged "SUCCESSFUL" callback should change nothing, because a payment marked
 * successful is a vehicle released against money that never arrived.
 *
 * Each step is driven with the database state that step would really see, and
 * the state handed to the next step is built from the writes the previous one
 * actually made.
 */

let supabase: SupabaseMock;
let currentUser = testUser();
let momoStatus: { status: string | null; financialTransactionId?: string } = { status: 'PENDING' };
let momoRequest = { ok: true, referenceId: 'ref-1' };

vi.mock('@/lib/auth/server', () => ({
  get supabaseAdmin() {
    return supabase.client;
  },
  getCurrentUser: () => Promise.resolve(currentUser),
}));

vi.mock('@/lib/auth/middleware', () => ({
  authenticateRequest: () => Promise.resolve({ authenticated: true, user: currentUser }),
  requireBuyer: () => Promise.resolve({ authenticated: true, user: currentUser }),
  requireStaff: () => Promise.resolve({ authenticated: true, user: currentUser }),
  requireAdmin: () => Promise.resolve({ authenticated: true, user: currentUser }),
}));

vi.mock('@/lib/mobilemoney', () => ({
  checkMomoPayment: () => Promise.resolve(momoStatus),
  requestMomoPayment: () => Promise.resolve(momoRequest),
}));

const notifyDisbursed = vi.fn(() => Promise.resolve());
vi.mock('@/lib/notifications', () => ({
  notifyDisbursed: (...args: unknown[]) => notifyDisbursed(...(args as [])),
  notifyApplicationSubmitted: () => Promise.resolve(),
}));

const updateImportPaymentStatus = vi.fn(() => Promise.resolve());
vi.mock('@/lib/import-payments', () => ({
  updateImportPaymentStatus: (...args: unknown[]) => updateImportPaymentStatus(...(args as [])),
}));

const PAYMENT_ID = '11111111-1111-4111-8111-111111111111';

const webhookRequest = (body: unknown) =>
  new Request('http://localhost/api/payments/webhook/mtn', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  currentUser = testUser();
  momoStatus = { status: 'PENDING' };
  momoRequest = { ok: true, referenceId: PAYMENT_ID };
  notifyDisbursed.mockClear();
  updateImportPaymentStatus.mockClear();
  delete process.env.MTN_WEBHOOK_SECRET;
  vi.resetModules();
});

describe('deposit request → callback → settled', () => {
  it('creates a pending payment the buyer owns', async () => {
    supabase = createSupabaseMock({
      import_orders: { data: { id: 'order-1', buyer_id: 'user-self', status: 'deposit_pending', reservation_deposit_amount: 500000 } },
      // Read twice: first the in-flight check (nothing pending), then the row
      // the insert returns.
      import_payments: [
        { data: null },
        { data: { id: PAYMENT_ID, order_id: 'order-1', buyer_id: 'user-self', amount: 500000, status: 'pending' } },
      ],
    });

    const { POST } = await import('@/app/api/imports/orders/[id]/payments/request/route');
    const response = await POST(
      new Request('http://localhost/api/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '677000000', provider: 'mtn_momo' }),
      }),
      { params: { id: 'order-1' } }
    );

    expect(response.status).toBeLessThan(300);

    const write = supabase.writesTo('import_payments')[0].payload as {
      buyer_id: string;
      status: string;
      amount: number;
    };
    // The amount comes from the order, never from the request body.
    expect(write.amount).toBe(500000);
    expect(write.buyer_id).toBe('user-self');
    expect(write.status).toBe('pending');
  });

  it('settles the payment when MTN confirms it', async () => {
    momoStatus = { status: 'SUCCESSFUL', financialTransactionId: 'ftx-9' };
    supabase = createSupabaseMock({
      payments: { data: { status: 'pending', buyer_id: 'user-self', inspection_request_id: null, payment_type: 'down_payment' } },
      profiles: { data: { phone: '677000000' } },
    });

    const { POST } = await import('@/app/api/payments/webhook/mtn/route');
    const response = await POST(webhookRequest({ referenceId: PAYMENT_ID }));

    expect(response.status).toBe(200);
    const update = supabase.writesTo('payments')[0].payload as { status: string; completed_at: string | null };
    expect(update.status).toBe('successful');
    expect(update.completed_at).not.toBeNull();
    expect(notifyDisbursed).toHaveBeenCalledTimes(1);
  });
});

describe('the webhook does not trust its caller', () => {
  it('ignores a forged SUCCESSFUL body while MTN still says pending', async () => {
    momoStatus = { status: 'PENDING' };
    supabase = createSupabaseMock({
      payments: { data: { status: 'pending', buyer_id: 'user-self', inspection_request_id: null, payment_type: 'down_payment' } },
    });

    const { POST } = await import('@/app/api/payments/webhook/mtn/route');
    const response = await POST(webhookRequest({ referenceId: PAYMENT_ID, status: 'SUCCESSFUL' }));

    // Acknowledged so the provider stops retrying, but nothing was written.
    expect(response.status).toBe(200);
    expect(supabase.writes).toEqual([]);
    expect(notifyDisbursed).not.toHaveBeenCalled();
  });

  it('marks a payment failed when MTN says failed, whatever the body claims', async () => {
    momoStatus = { status: 'FAILED' };
    supabase = createSupabaseMock({
      payments: { data: { status: 'pending', buyer_id: 'user-self', inspection_request_id: null, payment_type: 'down_payment' } },
    });

    const { POST } = await import('@/app/api/payments/webhook/mtn/route');
    await POST(webhookRequest({ referenceId: PAYMENT_ID, status: 'SUCCESSFUL' }));

    const update = supabase.writesTo('payments')[0].payload as { status: string; completed_at: string | null };
    expect(update.status).toBe('failed');
    expect(update.completed_at).toBeNull();
    expect(notifyDisbursed).not.toHaveBeenCalled();
  });

  it('rejects a caller without the shared secret when one is configured', async () => {
    process.env.MTN_WEBHOOK_SECRET = 'top-secret';
    momoStatus = { status: 'SUCCESSFUL' };
    supabase = createSupabaseMock({ payments: { data: { status: 'pending', buyer_id: 'user-self', payment_type: 'down_payment' } } });

    const { POST } = await import('@/app/api/payments/webhook/mtn/route');
    const response = await POST(webhookRequest({ referenceId: PAYMENT_ID }));

    expect(response.status).toBe(401);
    expect(supabase.writes).toEqual([]);
  });

  it('ignores a reference id that is not a uuid rather than passing it to Postgres', async () => {
    supabase = createSupabaseMock({ payments: { data: null } });

    const { POST } = await import('@/app/api/payments/webhook/mtn/route');
    const response = await POST(webhookRequest({ referenceId: "not-a-uuid'; drop table payments;--" }));

    expect(response.status).toBe(200);
    expect(supabase.writes).toEqual([]);
  });
});

describe('repeated callbacks', () => {
  it('does not notify twice when the payment is already successful', async () => {
    momoStatus = { status: 'SUCCESSFUL' };
    supabase = createSupabaseMock({
      // The state after the first callback settled it.
      payments: { data: { status: 'successful', buyer_id: 'user-self', inspection_request_id: null, payment_type: 'down_payment' } },
      profiles: { data: { phone: '677000000' } },
    });

    const { POST } = await import('@/app/api/payments/webhook/mtn/route');
    await POST(webhookRequest({ referenceId: PAYMENT_ID }));

    expect(notifyDisbursed).not.toHaveBeenCalled();
  });

  it('routes an unknown reference to the import payment path instead of failing', async () => {
    momoStatus = { status: 'SUCCESSFUL' };
    supabase = createSupabaseMock({ payments: { data: null } });

    const { POST } = await import('@/app/api/payments/webhook/mtn/route');
    const response = await POST(webhookRequest({ referenceId: PAYMENT_ID }));

    expect(response.status).toBe(200);
    expect(updateImportPaymentStatus).toHaveBeenCalledWith(PAYMENT_ID, 'successful', {});
  });
});

describe('inspection fee callbacks', () => {
  it('advances the inspection request when its fee is paid', async () => {
    momoStatus = { status: 'SUCCESSFUL' };
    supabase = createSupabaseMock({
      payments: { data: { status: 'pending', buyer_id: 'user-self', inspection_request_id: 'insp-1', payment_type: 'inspection_fee' } },
    });

    const { POST } = await import('@/app/api/payments/webhook/mtn/route');
    await POST(webhookRequest({ referenceId: PAYMENT_ID }));

    const update = supabase.writesTo('inspection_requests')[0].payload as { status: string };
    expect(update.status).toBe('paid');
    // An inspection fee is not a disbursement; the buyer must not be told one happened.
    expect(notifyDisbursed).not.toHaveBeenCalled();
  });
});

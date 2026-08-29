import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createSupabaseMock, testUser, type SupabaseMock } from './support/supabase-mock';

/**
 * The financing path across the parties who touch it: a buyer submits, staff
 * route the file to an institution, that institution offers, the buyer
 * responds, and the institution disburses.
 *
 * Each step is a different actor with different rights, and the state each one
 * leaves behind is what the next one is allowed to act on. These tests walk the
 * transitions in order and check the rules that hold between them — above all
 * that disbursement, the step that releases money, cannot be reached out of
 * order or by the wrong institution.
 */

let supabase: SupabaseMock;
let currentUser = testUser();

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
  requireMFIPartner: () => Promise.resolve({ authenticated: true, user: currentUser }),
}));

vi.mock('@/lib/notifications', () => ({
  notifyDisbursed: () => Promise.resolve(),
  notifyApplicationSubmitted: () => Promise.resolve(),
  notifyApproved: () => Promise.resolve(),
}));

const ensureFinanceCommission = vi.fn(() => Promise.resolve());
vi.mock('@/lib/finance-commissions', () => ({
  ensureFinanceCommission: (...args: unknown[]) => ensureFinanceCommission(...(args as [])),
}));

const APP_ID = 'app-1';
const INSTITUTION = 'institution-a';

const jsonRequest = (body: unknown = {}) =>
  new Request('http://localhost/api/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

/** The application row as it stands at a given point in the flow. */
const application = (over: Record<string, unknown> = {}) => ({
  id: APP_ID,
  status: 'submitted',
  buyer_id: 'user-self',
  mfi_institution_id: null,
  listing: { id: 'listing-1', financeable: true },
  ...over,
});

const asMfiPartner = () => {
  currentUser = testUser({ id: 'mfi-user', role: 'mfi_partner' });
};

beforeEach(() => {
  currentUser = testUser();
  ensureFinanceCommission.mockClear();
  vi.resetModules();
});

describe('step: the institution offers on a routed file', () => {
  it('accepts an offer once the file is routed to it', async () => {
    asMfiPartner();
    supabase = createSupabaseMock({
      profiles: { data: { mfi_institution_id: INSTITUTION } },
      financing_applications: { data: application({ mfi_institution_id: INSTITUTION }) },
      mfi_application_offers: { data: { id: 'offer-1' } },
    });

    const { POST } = await import('@/app/api/mfi/applications/[id]/offer/route');
    const response = await POST(jsonRequest({ status: 'submitted', proposed_tenor_months: 24 }), { params: { id: APP_ID } });

    expect(response.status).toBeLessThan(300);

    // The offer moves the file into "waiting on the buyer" so it surfaces in
    // the staff follow-up queues rather than going quiet.
    const followUp = supabase.writesTo('financing_applications')[0].payload as { follow_up_status: string };
    expect(followUp.follow_up_status).toBe('waiting_buyer');
  });
});

describe('step: the buyer answers the offer', () => {
  it('records the response against the offer', async () => {
    supabase = createSupabaseMock({
      mfi_application_offers: [
        {
          data: {
            id: 'offer-1',
            application_id: APP_ID,
            status: 'submitted',
            institution: { name: 'IMF A', code: 'A' },
            application: { id: APP_ID, buyer_id: 'user-self', status: 'submitted' },
          },
        },
        { data: { id: 'offer-1' } },
      ],
    });

    const { PATCH } = await import('@/app/api/mfi-offers/[id]/buyer-response/route');
    const response = await PATCH(jsonRequest({ buyer_response: 'interested' }), { params: { id: 'offer-1' } });

    expect(response.status).toBeLessThan(300);
    const update = supabase.writesTo('mfi_application_offers')[0].payload as { buyer_response: string };
    expect(update.buyer_response).toBe('interested');
  });
});

describe('step: disbursement', () => {
  const load = () => import('@/app/api/mfi/applications/[id]/disburse/route');

  it('releases the money once the file is approved and routed to the institution', async () => {
    asMfiPartner();
    supabase = createSupabaseMock({
      profiles: [{ data: { mfi_institution_id: INSTITUTION } }, { data: { phone: '677000000' } }],
      financing_applications: [
        { data: application({ status: 'approved', mfi_institution_id: INSTITUTION }) },
        { data: application({ status: 'disbursed', mfi_institution_id: INSTITUTION }) },
      ],
    });

    const { POST } = await load();
    const response = await POST(jsonRequest(), { params: { id: APP_ID } });

    expect(response.status).toBeLessThan(300);
    const update = supabase.writesTo('financing_applications')[0].payload as { status: string; disbursed_at: string };
    expect(update.status).toBe('disbursed');
    expect(update.disbursed_at).toBeTruthy();
    // MotoPayee's commission is booked as part of disbursing, not separately.
    expect(ensureFinanceCommission).toHaveBeenCalledTimes(1);
  });

  it('refuses to disburse a file that was never approved', async () => {
    asMfiPartner();
    supabase = createSupabaseMock({
      profiles: { data: { mfi_institution_id: INSTITUTION } },
      financing_applications: { data: application({ status: 'submitted', mfi_institution_id: INSTITUTION }) },
    });

    const { POST } = await load();
    const response = await POST(jsonRequest(), { params: { id: APP_ID } });

    expect(response.status).toBe(400);
    expect(supabase.writesTo('financing_applications')).toEqual([]);
    expect(ensureFinanceCommission).not.toHaveBeenCalled();
  });

  it("refuses to disburse another institution's file", async () => {
    asMfiPartner();
    supabase = createSupabaseMock({
      profiles: { data: { mfi_institution_id: INSTITUTION } },
      financing_applications: { data: application({ status: 'approved', mfi_institution_id: 'institution-b' }) },
    });

    const { POST } = await load();
    const response = await POST(jsonRequest(), { params: { id: APP_ID } });

    expect(response.status).toBe(403);
    expect(supabase.writesTo('financing_applications')).toEqual([]);
    expect(ensureFinanceCommission).not.toHaveBeenCalled();
  });

  it('does not disburse the same file twice', async () => {
    asMfiPartner();
    supabase = createSupabaseMock({
      profiles: { data: { mfi_institution_id: INSTITUTION } },
      // State after a successful disbursement.
      financing_applications: { data: application({ status: 'disbursed', mfi_institution_id: INSTITUTION }) },
    });

    const { POST } = await load();
    const response = await POST(jsonRequest(), { params: { id: APP_ID } });

    expect(response.status).toBe(400);
    expect(supabase.writesTo('financing_applications')).toEqual([]);
    expect(ensureFinanceCommission).not.toHaveBeenCalled();
  });

  it('writes an audit record naming the actor who released the money', async () => {
    asMfiPartner();
    supabase = createSupabaseMock({
      profiles: [{ data: { mfi_institution_id: INSTITUTION } }, { data: { phone: '677000000' } }],
      financing_applications: [
        { data: application({ status: 'approved', mfi_institution_id: INSTITUTION }) },
        { data: application({ status: 'disbursed', mfi_institution_id: INSTITUTION }) },
      ],
    });

    const { POST } = await load();
    await POST(jsonRequest(), { params: { id: APP_ID } });

    const audit = supabase.writesTo('audit_logs')[0].payload as { action: string; actor_id: string; entity_id: string };
    expect(audit.action).toBe('application_disbursed');
    expect(audit.actor_id).toBe('mfi-user');
    expect(audit.entity_id).toBe(APP_ID);
  });
});

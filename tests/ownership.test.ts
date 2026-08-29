import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createSupabaseMock, testUser, type SupabaseMock } from './support/supabase-mock';

/**
 * Ownership checks — the class of bug the route-guard test cannot catch.
 *
 * tests/api-authorization.test.ts proves a route asks *who* the caller is.
 * These prove it then asks whether that caller owns the record: the payment
 * IDOR, the thumbnail serving a private bucket, and the MFI partner acting on
 * another institution's file were all authenticated requests.
 *
 * Each test drives the real handler with a row that belongs to somebody else
 * and asserts it is refused and that nothing was written.
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
  requireAuth: () => Promise.resolve({ authenticated: true, user: currentUser }),
  requireBuyer: () => Promise.resolve({ authenticated: true, user: currentUser }),
  requireSeller: () => Promise.resolve({ authenticated: true, user: currentUser }),
  requireStaff: () => Promise.resolve({ authenticated: true, user: currentUser }),
  requireAdmin: () => Promise.resolve({ authenticated: true, user: currentUser }),
  requireMFIPartner: () => Promise.resolve({ authenticated: true, user: currentUser }),
}));

vi.mock('@/lib/mobilemoney', () => ({
  checkMomoPayment: () => Promise.resolve({ ok: true, status: 'PENDING' }),
}));

const request = (url = 'http://localhost/api/test', init?: RequestInit) => new Request(url, init);
const jsonRequest = (body: unknown) =>
  request('http://localhost/api/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  currentUser = testUser();
  vi.resetModules();
});

describe('GET /api/payments/[id]/status', () => {
  const load = () => import('@/app/api/payments/[id]/status/route');

  it("refuses another buyer's payment", async () => {
    supabase = createSupabaseMock({
      payments: { data: { id: 'pay-1', buyer_id: 'someone-else', status: 'pending', provider_reference: 'ref' } },
    });

    const { GET } = await load();
    const response = await GET(request(), { params: { id: 'pay-1' } });

    expect(response.status).toBe(403);
  });

  it('allows the buyer who owns it', async () => {
    supabase = createSupabaseMock({
      payments: { data: { id: 'pay-1', buyer_id: 'user-self', status: 'pending', provider_reference: 'ref' } },
    });

    const { GET } = await load();
    const response = await GET(request(), { params: { id: 'pay-1' } });

    expect(response.status).toBe(200);
  });

  it('allows staff', async () => {
    currentUser = testUser({ id: 'staff-1', role: 'admin' });
    supabase = createSupabaseMock({
      payments: { data: { id: 'pay-1', buyer_id: 'someone-else', status: 'pending', provider_reference: 'ref' } },
    });

    const { GET } = await load();
    const response = await GET(request(), { params: { id: 'pay-1' } });

    expect(response.status).toBe(200);
  });
});

describe('GET /api/files/thumb/[id]', () => {
  const load = () => import('@/app/api/files/thumb/[id]/route');

  it('serves a public listing image', async () => {
    supabase = createSupabaseMock({
      media_assets: { data: { storage_path: 'listings/a.jpg', bucket: 'listing-media' } },
    });

    const { GET } = await load();
    const response = await GET(request(), { params: { id: 'asset-1' } });

    expect(response.status).toBe(302);
    expect(supabase.signedUrls).toEqual([{ bucket: 'listing-media', path: 'listings/a.jpg' }]);
  });

  it('never signs a private bucket, even for a row that names one', async () => {
    supabase = createSupabaseMock({
      media_assets: { data: { storage_path: 'ownership/id-card.pdf', bucket: 'documents-private' } },
    });

    const { GET } = await load();
    const response = await GET(request(), { params: { id: 'asset-1' } });

    expect(response.status).toBe(404);
    expect(supabase.signedUrls).toEqual([]);
  });

  it('does not distinguish a private asset from a missing one', async () => {
    supabase = createSupabaseMock({ media_assets: { data: null } });
    const { GET } = await load();
    const missing = await GET(request(), { params: { id: 'nope' } });

    expect(missing.status).toBe(404);
  });
});

describe('GET /api/seller/listings/[id]/analytics', () => {
  const load = () => import('@/app/api/seller/listings/[id]/analytics/route');

  it("refuses another seller's listing", async () => {
    currentUser = testUser({ id: 'seller-self', role: 'seller_dealer' });
    supabase = createSupabaseMock({
      listings: { data: { id: 'listing-1', seller_id: 'other-seller' } },
    });

    const { GET } = await load();
    const response = await GET(request(), { params: { id: 'listing-1' } });

    expect(response.status).toBe(404);
  });

  it('allows the seller who owns it', async () => {
    currentUser = testUser({ id: 'seller-self', role: 'seller_dealer' });
    supabase = createSupabaseMock({
      listings: { data: { id: 'listing-1', seller_id: 'seller-self' } },
      listing_views: { data: [] },
      favourites: { data: [] },
      contact_events: { data: [] },
    });

    const { GET } = await load();
    const response = await GET(request(), { params: { id: 'listing-1' } });

    expect(response.status).toBe(200);
  });
});

describe('POST /api/mfi/applications/[id]/offer', () => {
  const load = () => import('@/app/api/mfi/applications/[id]/offer/route');

  const offerBody = { status: 'submitted', proposed_tenor_months: 24 };

  it("refuses an application routed to another institution", async () => {
    currentUser = testUser({ id: 'mfi-user', role: 'mfi_partner' });
    supabase = createSupabaseMock({
      profiles: { data: { mfi_institution_id: 'institution-a' } },
      financing_applications: {
        data: {
          id: 'app-1',
          status: 'submitted',
          mfi_institution_id: 'institution-b',
          listing: { id: 'l1', financeable: true },
        },
      },
    });

    const { POST } = await load();
    const response = await POST(jsonRequest(offerBody), { params: { id: 'app-1' } });

    expect(response.status).toBe(403);
    // The follow-up update is the damaging part: it would overwrite the notes
    // driving another institution's file.
    expect(supabase.writesTo('financing_applications')).toEqual([]);
    expect(supabase.writesTo('mfi_application_offers')).toEqual([]);
  });

  it('refuses an application that has not been routed yet', async () => {
    currentUser = testUser({ id: 'mfi-user', role: 'mfi_partner' });
    supabase = createSupabaseMock({
      profiles: { data: { mfi_institution_id: 'institution-a' } },
      financing_applications: {
        data: {
          id: 'app-1',
          status: 'submitted',
          mfi_institution_id: null,
          listing: { id: 'l1', financeable: true },
        },
      },
    });

    const { POST } = await load();
    const response = await POST(jsonRequest(offerBody), { params: { id: 'app-1' } });

    expect(response.status).toBe(403);
    expect(supabase.writesTo('mfi_application_offers')).toEqual([]);
  });

  it('allows the institution the application is routed to', async () => {
    currentUser = testUser({ id: 'mfi-user', role: 'mfi_partner' });
    supabase = createSupabaseMock({
      profiles: { data: { mfi_institution_id: 'institution-a' } },
      financing_applications: {
        data: {
          id: 'app-1',
          status: 'submitted',
          mfi_institution_id: 'institution-a',
          listing: { id: 'l1', financeable: true },
        },
      },
      mfi_application_offers: { data: { id: 'offer-1' } },
    });

    const { POST } = await load();
    const response = await POST(jsonRequest(offerBody), { params: { id: 'app-1' } });

    expect(response.status).toBeLessThan(300);
    expect(supabase.writesTo('mfi_application_offers')).toHaveLength(1);
  });

  it('refuses a partner with no institution at all', async () => {
    currentUser = testUser({ id: 'mfi-user', role: 'mfi_partner' });
    supabase = createSupabaseMock({
      profiles: { data: { mfi_institution_id: null } },
    });

    const { POST } = await load();
    const response = await POST(jsonRequest(offerBody), { params: { id: 'app-1' } });

    expect(response.status).toBe(403);
    expect(supabase.writes).toEqual([]);
  });
});

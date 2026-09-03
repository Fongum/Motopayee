import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * States the schema allows must be reachable by something.
 *
 * `listings.sold` was in the check constraint and labelled in the seller portal
 * while nothing could set it, so a vehicle that sold stayed in the browse
 * results. Three more were found the same way: an import request could never be
 * marked `reviewing` though the admin list offered a filter tab for it, and two
 * of the three inspection request types could never be created.
 *
 * These read the routes rather than restating them, so removing the writer
 * fails here rather than quietly recreating the gap.
 */

const read = (...p: string[]) => readFileSync(join(process.cwd(), ...p), 'utf8');

describe('import request triage', () => {
  const route = read('app', 'api', 'admin', 'imports', 'requests', '[id]', 'route.ts');
  const listPage = read('app', 'admin', 'imports', 'requests', 'page.tsx');

  it('can set the status its own filter chip offers', () => {
    expect(listPage).toContain("'reviewing'");
    expect(route).toMatch(/submitted:\s*\[[^\]]*'reviewing'/);
  });

  it('lets a request go back to the queue', () => {
    // Picking something up by mistake should not strand it.
    expect(route).toMatch(/reviewing:\s*\[[^\]]*'submitted'/);
  });

  it('leaves quoted and accepted to the events that cause them', () => {
    // A status meaning "a quote went out" belongs to the quote route, not to a
    // button asserting it happened.
    expect(route).not.toMatch(/'quoted'\s*,?\s*\]/);
    expect(route).not.toContain("'accepted'");
  });

  it('rejects a transition it does not allow', () => {
    expect(route).toContain('Cannot move a request from');
  });
});

describe('inspection request types', () => {
  const route = read('app', 'api', 'inspection-requests', 'route.ts');

  it('accepts every type the constraint allows', () => {
    // migration 015: check (request_type in (...))
    for (const type of ['buyer_requested', 'seller_package', 'finance_check']) {
      expect(route).toContain(`'${type}'`);
    }
    expect(route).not.toContain("request_type: 'buyer_requested'");
  });

  it('still requires a published listing for a buyer request', () => {
    expect(route).toMatch(/requestType === 'buyer_requested' && listing\.status !== 'published'/);
  });

  it('restricts a seller package to the listing owner', () => {
    // Otherwise anyone could order an inspection against somebody else's
    // unpublished vehicle.
    expect(route).toMatch(/listing\.seller_id !== user\.id/);
  });

  it('restricts a finance check to staff', () => {
    expect(route).toMatch(/finance_check[\s\S]{0,400}?verifier/);
  });

  it('does not invent a fee per type', () => {
    // The schema defaults fee_xaf to 15000 for every type; nothing in the
    // codebase says the others cost differently.
    expect(route).toContain('fee_xaf: 15000');
  });
});

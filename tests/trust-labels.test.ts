import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The trust labels are the platform's central promise, and
 * docs/trust-verification-policy.md states what each one means and what it
 * requires. A label shown without its stated prerequisites is the same defect
 * as the price band: a public claim the system cannot support.
 *
 * Both "MotoPayee revu" and "Location verifiee" list usable photos among their
 * minimum requirements, and neither publish path checked for any. A sale
 * listing could reach published through inspection_scheduled -> inspected,
 * skipping media_done entirely.
 */

const read = (...p: string[]) => readFileSync(join(process.cwd(), ...p), 'utf8');

const POLICY = read('docs', 'trust-verification-policy.md');
const BADGES = read('app', '(components)', 'TrustLabelBadges.tsx');

describe('the policy still says what these tests assume', () => {
  it('requires usable photos for MotoPayee Reviewed', () => {
    // If the policy changes, this should fail rather than silently drift.
    expect(POLICY).toMatch(/## MotoPayee Reviewed[\s\S]*?Photos are usable/);
  });

  it('requires photos received for Verified Rental', () => {
    expect(POLICY).toMatch(/## Verified Rental[\s\S]*?Photos received/);
  });

  it('forbids claiming every car is verified or inspected', () => {
    expect(POLICY).toContain('Every car is verified.');
    expect(POLICY).toContain('Every car is inspected.');
  });
});

describe('publishing enforces the photo requirement', () => {
  it('refuses to publish a sale listing with no photo', () => {
    const route = read('app', 'api', 'admin', 'listings', '[id]', 'publish', 'route.ts');
    expect(route).toMatch(/targetStatus === 'published'/);
    expect(route).toMatch(/from\('media_assets'\)/);
    expect(route).toMatch(/Cannot publish without at least one photo/);
  });

  it('refuses to publish a hire listing with no photo', () => {
    const route = read('app', 'api', 'admin', 'hire', '[id]', 'route.ts');
    expect(route).toMatch(/status === 'published'/);
    expect(route).toMatch(/from\('hire_listing_media'\)/);
    expect(route).toMatch(/Cannot publish without at least one photo/);
  });

  it('counts only photos, not videos', () => {
    // Both tables hold videos too, and a video is not a usable listing photo.
    for (const route of [
      read('app', 'api', 'admin', 'listings', '[id]', 'publish', 'route.ts'),
      read('app', 'api', 'admin', 'hire', '[id]', 'route.ts'),
    ]) {
      expect(route).toMatch(/asset_type'?,\s*'photo'/);
    }
  });
});

describe('a trust label never defaults to true', () => {
  it('requires a known status rather than asserting on absence', () => {
    // `!listing.status || listing.status === 'published'` showed the review
    // badge whenever the status had not been selected. No evidence must mean no
    // badge, not a claim.
    expect(BADGES).not.toMatch(/!listing\.status \|\|/);
    expect(BADGES).toMatch(/listing\.status === 'published'/);
  });

  it('ties the inspection label to a condition grade', () => {
    // condition_grade is written only by app/api/inspections/[listingId], which
    // also inserts an inspections row — so the grade implies a real inspection.
    expect(BADGES).toMatch(/condition_grade/);
  });

  it('does not claim MotoPayee holds the rental deposit', () => {
    // The policy forbids it unless MotoPayee actually holds it, and it does not.
    expect(BADGES).not.toMatch(/caution.*(protég|garanti)/i);
  });
});

describe('documents checked', () => {
  const badges = read('app', '(components)', 'TrustLabelBadges.tsx');

  it('is defined by the policy and listed in the dashboard spec', () => {
    expect(POLICY).toMatch(/## Documents Checked[\s\S]*?Ownership or authority-to-sell document received/);
    expect(read('docs', 'launch-dashboard-specification.md')).toMatch(/### Trust Labels[\s\S]*?Documents checked/);
  });

  it('requires a document staff actually marked reviewed', () => {
    // Not implied by publication. Every published listing has passed
    // ownership_verified, so keying off status would make this universal — the
    // blanket-claim trap the price band fell into.
    expect(badges).toMatch(/listing\.documents\?\.some\(\(doc\) => doc\.verified\)/);
    expect(badges).toContain('Documents revus');
  });

  it('has something that can write documents.verified', () => {
    // The column existed from migration 003 with no writer, which is why the
    // label could never be earned.
    const route = read('app', 'api', 'admin', 'documents', '[id]', 'verify', 'route.ts');
    expect(route).toMatch(/verified: true/);
    expect(route).toMatch(/verified_by: auth\.user\.id/);
    expect(route).toMatch(/verified_at/);
  });

  it('records the review in the audit log', () => {
    const route = read('app', 'api', 'admin', 'documents', '[id]', 'verify', 'route.ts');
    expect(route).toMatch(/action: 'document_verified'/);
  });
});

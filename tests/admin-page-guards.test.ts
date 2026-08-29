import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { ADMIN_SECTION_ACCESS, canAccessAdminSection } from '@/lib/auth/admin-sections';

/**
 * Every /admin page must declare which section it belongs to.
 *
 * The admin layout gates on isStaffRole, which is deliberately wide — field
 * agents, inspectors and verifiers all pass it. Relying on the layout alone
 * meant a page's real audience was invisible at the page itself, and six pages
 * had no guard of their own at all.
 */

const ADMIN_ROOT = path.join(process.cwd(), 'app', 'admin');

function collectPages(dir: string, found: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectPages(full, found);
    else if (entry.name === 'page.tsx') found.push(full);
  }
  return found;
}

function sectionOf(file: string): string {
  const segments = path.relative(ADMIN_ROOT, path.dirname(file)).split(path.sep).filter(Boolean);
  return segments.length === 0 ? 'dashboard' : segments[0];
}

const pages = collectPages(ADMIN_ROOT);

describe('admin page guards', () => {
  it('finds the admin pages', () => {
    expect(pages.length).toBeGreaterThan(20);
  });

  it('guards every admin page with requireAdminPage', () => {
    const unguarded = pages
      .filter((file) => !fs.readFileSync(file, 'utf8').includes('requireAdminPage('))
      .map((file) => path.relative(ADMIN_ROOT, file));

    expect(unguarded, `Admin pages without requireAdminPage: ${unguarded.join(', ')}`).toEqual([]);
  });

  it('declares the section matching the page path', () => {
    const mismatched = pages
      .filter((file) => {
        const source = fs.readFileSync(file, 'utf8');
        return !source.includes(`requireAdminPage('${sectionOf(file)}')`);
      })
      .map((file) => `${path.relative(ADMIN_ROOT, file)} (expected '${sectionOf(file)}')`);

    expect(mismatched, `Admin pages declaring the wrong section: ${mismatched.join(', ')}`).toEqual([]);
  });

  it('has a policy entry for every section that exists on disk', () => {
    const sections = new Set(pages.map(sectionOf));
    const missing = Array.from(sections).filter((section) => !(section in ADMIN_SECTION_ACCESS));

    expect(missing, `Sections with no access policy: ${missing.join(', ')}`).toEqual([]);
  });
});

describe('canAccessAdminSection', () => {
  it('keeps contractors out of customer and money sections', () => {
    for (const role of ['field_agent', 'inspector', 'verifier']) {
      expect(canAccessAdminSection(role, 'leads')).toBe(false);
      expect(canAccessAdminSection(role, 'finance')).toBe(false);
      expect(canAccessAdminSection(role, 'users')).toBe(false);
      expect(canAccessAdminSection(role, 'launch')).toBe(false);
    }
  });

  it('leaves the operational screens open to staff', () => {
    for (const role of ['field_agent', 'inspector', 'verifier', 'admin']) {
      expect(canAccessAdminSection(role, 'inspection-requests')).toBe(true);
      expect(canAccessAdminSection(role, 'listings')).toBe(true);
    }
  });

  it('gives admins everything', () => {
    for (const section of Object.keys(ADMIN_SECTION_ACCESS)) {
      expect(canAccessAdminSection('admin', section as keyof typeof ADMIN_SECTION_ACCESS)).toBe(true);
    }
  });

  it('refuses non-staff roles outright', () => {
    for (const role of ['buyer', 'seller_individual', 'seller_dealer', 'mfi_partner', '', null, undefined]) {
      expect(canAccessAdminSection(role, 'listings')).toBe(false);
      expect(canAccessAdminSection(role, 'leads')).toBe(false);
    }
  });
});

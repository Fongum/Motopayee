/**
 * Canonical public URL for MotoPayee.
 *
 * Single source of truth for every absolute link the app emits: SEO metadata,
 * sitemap/robots, SMS notifications and referral shares.
 *
 * The default is the live custom domain. It used to be `motopayee.vercel.app`,
 * which has never resolved — Vercel assigned `motopayee-omega.vercel.app`
 * because the shorter name was unavailable — so SMS messages sent customers to
 * a 404. Keep this pointing at the domain users actually reach.
 *
 * NEXT_PUBLIC_APP_URL overrides it (preview deployments, local dev). Any
 * trailing slash is stripped so callers can safely append `/path`.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://motopayee.com').replace(/\/$/, '');

/** Host without the scheme — for SMS copy, where a bare domain reads better. */
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, '');

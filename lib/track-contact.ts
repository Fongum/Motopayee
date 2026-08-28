import type { ContactChannel, ContactSurface } from '@/lib/contact-events';

export interface TrackContactInput {
  surface: ContactSurface;
  channel: ContactChannel;
  listingId?: string;
  hireListingId?: string;
}

const VISITOR_KEY_STORAGE = 'mp_visitor_key';

/**
 * Stable random id for this browser, used only to collapse a viewer's repeat
 * contact clicks into one inquiry. Not a fingerprint and not tied to identity;
 * returns undefined when storage is unavailable (private mode), in which case
 * the click still records — it just cannot be deduped.
 */
export function getVisitorKey(): string | undefined {
  try {
    const existing = window.localStorage.getItem(VISITOR_KEY_STORAGE);
    if (existing && existing.length >= 8) return existing;

    const generated =
      window.crypto?.randomUUID?.() ??
      `v${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(VISITOR_KEY_STORAGE, generated);
    return generated;
  } catch {
    return undefined;
  }
}

/**
 * Client-side fire-and-forget contact ping. Runs immediately before a wa.me /
 * tel: handoff, so it uses sendBeacon (survives the page losing focus) and
 * falls back to a keepalive fetch. Never throws, never blocks the click.
 */
export function trackContact({ surface, channel, listingId, hireListingId }: TrackContactInput): void {
  if (typeof window === 'undefined') return;

  const payload = JSON.stringify({
    surface,
    channel,
    listing_id: listingId,
    hire_listing_id: hireListingId,
    visitor_key: getVisitorKey(),
  });

  try {
    const beacon = navigator.sendBeacon?.bind(navigator);
    if (beacon && beacon('/api/contact-events', new Blob([payload], { type: 'application/json' }))) {
      return;
    }
    void fetch('/api/contact-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Tracking must never break the contact flow.
  }
}

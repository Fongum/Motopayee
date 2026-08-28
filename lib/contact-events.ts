import { z } from 'zod';

export const CONTACT_SURFACES = ['listing', 'hire', 'support'] as const;
export const CONTACT_CHANNELS = ['whatsapp', 'call', 'form'] as const;

export type ContactSurface = (typeof CONTACT_SURFACES)[number];
export type ContactChannel = (typeof CONTACT_CHANNELS)[number];

/**
 * Mirrors `contact_events_target_check` in migration 029 — a listing contact
 * carries a listing id, a hire contact carries a hire listing id, and support
 * contacts carry neither. Rejecting the mismatch here turns a 500 from the DB
 * constraint into a 400.
 */
export const contactEventSchema = z
  .object({
    surface: z.enum(CONTACT_SURFACES),
    channel: z.enum(CONTACT_CHANNELS),
    listing_id: z.string().uuid().optional(),
    hire_listing_id: z.string().uuid().optional(),
    /** Random per-browser id from localStorage. Absent in private mode. */
    visitor_key: z.string().min(8).max(64).optional(),
  })
  .refine(
    (value) =>
      (value.surface === 'listing' && !!value.listing_id && !value.hire_listing_id) ||
      (value.surface === 'hire' && !!value.hire_listing_id && !value.listing_id) ||
      (value.surface === 'support' && !value.listing_id && !value.hire_listing_id),
    { message: 'Contact target does not match the surface.', path: ['surface'] }
  );

export type ContactEventInput = z.infer<typeof contactEventSchema>;

/** Row shape for `contact_events` — see migrations 029 and 030. */
export function contactEventRow(input: ContactEventInput, actorId: string | null, day: string) {
  return {
    surface: input.surface,
    channel: input.channel,
    listing_id: input.listing_id ?? null,
    hire_listing_id: input.hire_listing_id ?? null,
    actor_id: actorId,
    visitor_key: input.visitor_key ?? null,
    date_day: day,
  };
}

/** The subset of a `contact_events` row that dedupe needs. */
export interface ContactEventRecord {
  id: string;
  surface: ContactSurface;
  listing_id: string | null;
  hire_listing_id: string | null;
  actor_id: string | null;
  visitor_key: string | null;
  date_day: string;
}

/**
 * Identity used to group repeat clicks. A logged-in buyer is the same person
 * across devices; an anonymous one is their browser. Events carrying neither
 * (private mode, sendBeacon before the key was stored) fall back to their own
 * row id, so they are never silently merged with an unrelated viewer.
 */
function viewerKey(row: ContactEventRecord): string {
  if (row.actor_id) return `u:${row.actor_id}`;
  if (row.visitor_key) return `v:${row.visitor_key}`;
  return `e:${row.id}`;
}

/**
 * Collapse repeat clicks to one per viewer, per target, per day — the honest
 * "inquiries" number. Channel is deliberately not part of the key: the same
 * person tapping WhatsApp and then Call is one interested buyer, not two.
 * The raw rows stay in the table for click-level analysis.
 */
export function dedupeContactEvents<T extends ContactEventRecord>(rows: T[]): T[] {
  const seen = new Set<string>();
  const unique: T[] = [];

  for (const row of rows) {
    const target = row.listing_id ?? row.hire_listing_id ?? '';
    const key = `${row.surface}|${target}|${row.date_day}|${viewerKey(row)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(row);
  }

  return unique;
}

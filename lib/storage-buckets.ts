/**
 * Storage buckets, named once so the difference between them stays explicit.
 *
 * The split is a security boundary, not filing: PUBLIC_MEDIA_BUCKET holds
 * listing photos anyone may see, PRIVATE_DOCUMENT_BUCKET holds ownership
 * papers and ID documents that must only ever reach their owner or staff.
 */

export const PUBLIC_MEDIA_BUCKET = 'listing-media';
export const PRIVATE_DOCUMENT_BUCKET = 'documents-private';

export const STORAGE_BUCKETS = [PUBLIC_MEDIA_BUCKET, PRIVATE_DOCUMENT_BUCKET] as const;

export type StorageBucket = (typeof STORAGE_BUCKETS)[number];

export function isPublicBucket(bucket: string | null | undefined): boolean {
  return bucket === PUBLIC_MEDIA_BUCKET;
}

/** Private buckets may only be signed after an ownership or staff check. */
export function isPrivateBucket(bucket: string | null | undefined): boolean {
  return bucket === PRIVATE_DOCUMENT_BUCKET;
}

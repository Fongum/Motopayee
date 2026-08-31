/**
 * Documents are attached polymorphically.
 *
 * `documents.entity_type` / `entity_id` point at either a listing or a financing
 * application, with no foreign key to either. PostgREST needs a foreign key to
 * infer an embed, so `documents(*)` inside a select on `listings` or
 * `financing_applications` fails with PGRST200 — and because every one of those
 * call sites treats an error as "not found", seven surfaces answered 404 or
 * "not found" for their entire existence.
 *
 * There is no query shape that makes the embed work. They have to be fetched
 * separately, keyed by entity, which is what `fetchDocumentsFor` does.
 */

/** Mirrors the documents.entity_type CHECK constraint (migration 003). */
export const DOCUMENT_ENTITY_TYPES = ['listing', 'application'] as const;
export type DocumentEntityType = (typeof DOCUMENT_ENTITY_TYPES)[number];

export function isDocumentEntityType(value: unknown): value is DocumentEntityType {
  return typeof value === 'string' && (DOCUMENT_ENTITY_TYPES as readonly string[]).includes(value);
}

/**
 * Columns safe to hand to a document owner — the person who uploaded it or the
 * staff reviewing it. Deliberately excludes `storage_path` and `bucket`: files
 * are only ever reached through a signed URL, so the raw path has no business
 * in a page payload.
 */
export const DOCUMENT_SAFE_COLUMNS =
  'id, entity_type, entity_id, doc_type, filename, content_type, file_size_bytes, verified, verified_at, created_at';

/** Everything a staff reviewer needs, including who uploaded and verified it. */
export const DOCUMENT_STAFF_COLUMNS = `${DOCUMENT_SAFE_COLUMNS}, uploader_id, verified_by, storage_path, bucket`;

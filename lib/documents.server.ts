/**
 * Fetching polymorphic documents.
 *
 * Split from `documents.ts` so the vocabulary stays importable without a
 * Supabase client. See that file for why these cannot be embedded.
 */

import { supabaseAdmin } from './auth/server';
import { reportError } from './error-reporting';
import { DOCUMENT_SAFE_COLUMNS } from './documents';
import type { DocumentEntityType } from './documents';

export interface EntityDocument {
  id: string;
  entity_type: DocumentEntityType;
  entity_id: string;
  doc_type: string;
  filename: string | null;
  content_type: string | null;
  file_size_bytes: number | null;
  verified: boolean;
  verified_at: string | null;
  created_at: string;
}

/**
 * Documents attached to one listing or application, newest first.
 *
 * Returns an empty array on failure rather than throwing: a document list that
 * cannot load should not take down the page it decorates — which is precisely
 * the failure being fixed here, where an unloadable embed 404'd the whole route.
 */
export async function fetchDocumentsFor(
  entityType: DocumentEntityType,
  entityId: string,
  columns: string = DOCUMENT_SAFE_COLUMNS
): Promise<EntityDocument[]> {
  const { data, error } = await supabaseAdmin
    .from('documents')
    .select(columns)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false });

  if (error) {
    reportError(error, { source: 'documents', context: 'fetchDocumentsFor', entityType, entityId });
    return [];
  }
  return (data ?? []) as unknown as EntityDocument[];
}

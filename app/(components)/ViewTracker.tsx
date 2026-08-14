'use client';

import { useEffect } from 'react';

interface Props {
  listingId: string;
  entityType?: 'listing' | 'hire_listing';
}

/** Fires a view event on mount — non-blocking, silent */
export default function ViewTracker({ listingId, entityType = 'listing' }: Props) {
  useEffect(() => {
    fetch(`/api/listings/${listingId}/view`, { method: 'POST' }).catch(() => {});
    // Track browsing history for recommendations
    fetch('/api/browsing-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity_type: entityType, entity_id: listingId }),
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

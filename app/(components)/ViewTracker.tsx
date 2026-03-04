'use client';

import { useEffect } from 'react';

interface Props {
  listingId: string;
}

/** Fires a view event on mount — non-blocking, silent */
export default function ViewTracker({ listingId }: Props) {
  useEffect(() => {
    fetch(`/api/listings/${listingId}/view`, { method: 'POST' }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

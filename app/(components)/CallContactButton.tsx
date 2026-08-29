'use client';

import { trackContact } from '@/lib/track-contact';
import type { ContactSurface } from '@/lib/contact-events';

interface Props {
  phone: string;
  label?: string;
  className?: string;
  surface?: ContactSurface;
  listingId?: string;
  hireListingId?: string;
}

/** `tel:` link that records the contact intent before handing off to the dialer. */
export default function CallContactButton({
  phone,
  label = 'Appeler',
  className,
  surface,
  listingId,
  hireListingId,
}: Props) {
  return (
    <a
      href={`tel:${phone}`}
      onClick={() => {
        if (surface) trackContact({ surface, channel: 'call', listingId, hireListingId });
      }}
      className={className ?? 'inline-flex items-center justify-center border border-gray-300 text-gray-700 font-medium px-4 py-2.5 rounded-xl hover:bg-gray-50 transition text-sm'}
    >
      {label}
    </a>
  );
}

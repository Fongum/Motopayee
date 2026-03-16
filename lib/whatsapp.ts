// WhatsApp Integration helpers for MotoPayee

const SUPPORT_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_SUPPORT_NUMBER ?? '237600000000';

/** Build a wa.me URL to contact a phone number with a pre-filled message */
export function buildContactUrl(phone: string, message: string): string {
  // Strip non-digit chars except leading +
  const cleaned = phone.replace(/[^\d+]/g, '').replace(/^\+/, '');
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
}

/** Build a WhatsApp share URL (for sharing links/text) */
export function buildShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/** Build support URL to contact MotoPayee support */
export function buildSupportUrl(message?: string): string {
  const cleaned = SUPPORT_NUMBER.replace(/[^\d+]/g, '').replace(/^\+/, '');
  const msg = message ?? 'Bonjour MotoPayee, j\'ai besoin d\'aide.';
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(msg)}`;
}

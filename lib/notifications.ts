/**
 * MotoPayee SMS notification service — Africa's Talking REST API
 *
 * Required env vars (add to Vercel + .env.local):
 *   AFRICASTALKING_USERNAME   — your AT account username (or "sandbox" for testing)
 *   AFRICASTALKING_API_KEY    — API key from Africa's Talking dashboard
 *   AFRICASTALKING_SENDER_ID  — optional sender ID (e.g. "MotoPayee", must be approved)
 *
 * Cameroon numbers: MTN (+237 6XX), Orange (+237 6XX)
 * All functions are fire-and-forget safe — they swallow errors so they
 * never block a response. Call with `.catch(console.error)` if you want logging.
 */

const AT_SMS_URL = 'https://api.africastalking.com/version1/messaging';
const AT_USERNAME = process.env.AFRICASTALKING_USERNAME ?? '';
const AT_API_KEY  = process.env.AFRICASTALKING_API_KEY ?? '';
const AT_SENDER   = process.env.AFRICASTALKING_SENDER_ID ?? 'MotoPayee';

/** Normalise to international format (+237XXXXXXXXX) */
function normalise(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('237') && digits.length === 12) return `+${digits}`;
  if (digits.length === 9 && digits.startsWith('6'))    return `+237${digits}`;
  if (digits.startsWith('+'))                           return phone.trim();
  return `+${digits}`;
}

/** Core send function — never throws */
export async function sendSMS(phone: string | null | undefined, message: string): Promise<void> {
  if (!phone) return;
  if (!AT_API_KEY || !AT_USERNAME) {
    console.warn('[SMS] Africa\'s Talking credentials not set — skipping notification');
    return;
  }

  const body = new URLSearchParams({
    username: AT_USERNAME,
    to: normalise(phone),
    message: `MotoPayee: ${message}`,
    from: AT_SENDER,
  });

  try {
    const res = await fetch(AT_SMS_URL, {
      method: 'POST',
      headers: {
        apiKey: AT_API_KEY,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: body.toString(),
    });
    if (!res.ok) {
      console.error('[SMS] Africa\'s Talking error:', await res.text());
    }
  } catch (err) {
    console.error('[SMS] Network error:', err);
  }
}

// ─── Typed notification helpers ───────────────────────────────────────────────

/** Buyer submitted a financing application */
export async function notifyApplicationSubmitted(phone: string | null | undefined, appId: string) {
  const ref = appId.slice(0, 8).toUpperCase();
  await sendSMS(phone,
    `Votre demande de financement a été reçue (Réf: ${ref}). Notre équipe vous contactera sous 48h.`
  );
}

/** Verifier requests documents from buyer */
export async function notifyDocsRequired(phone: string | null | undefined, appId: string) {
  const ref = appId.slice(0, 8).toUpperCase();
  await sendSMS(phone,
    `Action requise — déposez vos pièces justificatives pour votre demande ${ref} sur motopayee.vercel.app/me/applications`
  );
}

/** Application moved to under_review */
export async function notifyUnderReview(phone: string | null | undefined) {
  await sendSMS(phone,
    `Votre dossier est en cours d'examen par notre équipe. Vous recevrez une réponse sous 48h.`
  );
}

/** Application approved */
export async function notifyApproved(phone: string | null | undefined) {
  await sendSMS(phone,
    `Félicitations! Votre demande de financement a été approuvée. Notre équipe vous contactera pour les prochaines étapes.`
  );
}

/** Application rejected */
export async function notifyRejected(phone: string | null | undefined) {
  await sendSMS(phone,
    `Nous n'avons pas pu approuver votre demande cette fois. Contactez-nous pour plus d'informations.`
  );
}

/** Funds disbursed */
export async function notifyDisbursed(phone: string | null | undefined) {
  await sendSMS(phone,
    `Votre financement a été décaissé. Bienvenue dans votre nouveau véhicule! Merci de choisir MotoPayee.`
  );
}

/** Seller listing published */
export async function notifyListingPublished(
  phone: string | null | undefined,
  make: string,
  model: string
) {
  await sendSMS(phone,
    `Votre annonce ${make} ${model} est maintenant publiée sur MotoPayee. Les acheteurs peuvent la consulter sur motopayee.vercel.app/listings`
  );
}

/** Seller listing inspection scheduled */
export async function notifyInspectionScheduled(phone: string | null | undefined) {
  await sendSMS(phone,
    `Un inspecteur certifié a été assigné à votre véhicule. Il vous contactera pour planifier l'inspection sous 24h.`
  );
}

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
 * never block a response. Call with `.catch(logFailure(...))` from lib/logger
 * if you want the failure recorded.
 */

import { logger } from './logger';
import { SITE_HOST } from './site';

const AT_SMS_URL = 'https://api.africastalking.com/version1/messaging';
const AT_USERNAME = process.env.AFRICASTALKING_USERNAME ?? '';
const AT_API_KEY  = process.env.AFRICASTALKING_API_KEY ?? '';
const AT_SENDER   = process.env.AFRICASTALKING_SENDER_ID ?? 'MotoPayee';

const FETCH_TIMEOUT_MS = 10_000;

/**
 * fetch() with an abort-based timeout, mirroring lib/mobilemoney.ts. Without it
 * a hung Africa's Talking endpoint would keep a serverless invocation alive for
 * its whole execution budget.
 */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = FETCH_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Normalise to international format (+237XXXXXXXXX) */
function normalise(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('237') && digits.length === 12) return `+${digits}`;
  if (digits.length === 9 && digits.startsWith('6'))    return `+237${digits}`;
  if (digits.startsWith('+'))                           return phone.trim();
  return `+${digits}`;
}

/**
 * Core send function — never throws.
 *
 * Retries once on a network error or 5xx. Africa's Talking has no idempotency
 * key, so a retry can in principle double-send; that risk is accepted only for
 * failures where the first attempt almost certainly never reached them. A 4xx
 * is a caller error (bad number, no credit) and is never retried.
 */
export async function sendSMS(phone: string | null | undefined, message: string): Promise<void> {
  if (!phone) return;
  if (!AT_API_KEY || !AT_USERNAME) {
    logger.warn('SMS skipped: Africa\'s Talking credentials not set');
    return;
  }

  const body = new URLSearchParams({
    username: AT_USERNAME,
    to: normalise(phone),
    message: `MotoPayee: ${message}`,
    from: AT_SENDER,
  });

  const init: RequestInit = {
    method: 'POST',
    headers: {
      apiKey: AT_API_KEY,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: body.toString(),
  };

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetchWithTimeout(AT_SMS_URL, init);
      if (res.ok) return;
      logger.error('SMS send failed', { status: res.status, body: await res.text(), attempt });
      if (res.status < 500) return; // 4xx won't fix itself
    } catch (err) {
      logger.error('SMS network error', { err, attempt });
    }
    if (attempt === 0) await sleep(500);
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
    `Action requise — déposez vos pièces justificatives pour votre demande ${ref} sur ${SITE_HOST}/me/applications`
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
    `Votre annonce ${make} ${model} est maintenant publiée sur MotoPayee. Les acheteurs peuvent la consulter sur ${SITE_HOST}/listings`
  );
}

/** Seller listing inspection scheduled */
export async function notifyInspectionScheduled(phone: string | null | undefined) {
  await sendSMS(phone,
    `Un inspecteur certifié a été assigné à votre véhicule. Il vous contactera pour planifier l'inspection sous 24h.`
  );
}

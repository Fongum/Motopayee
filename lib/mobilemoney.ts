/**
 * MotoPayee Mobile Money integration
 *
 * Supported providers:
 *  - MTN Mobile Money (Cameroon) — MTN MoMo Collection API
 *  - Orange Money Cameroon — manual reference flow (no public REST API)
 *
 * Required env vars for MTN MoMo:
 *   MTN_MOMO_BASE_URL          — https://sandbox.momodeveloper.mtn.com (or production)
 *   MTN_MOMO_SUBSCRIPTION_KEY  — Ocp-Apim-Subscription-Key from MoMo portal
 *   MTN_MOMO_API_USER          — UUID you registered in the MoMo portal
 *   MTN_MOMO_API_KEY           — API key for the user above
 *   MTN_MOMO_ENVIRONMENT       — "sandbox" | "production"
 */

import { logger } from './logger';

const MTN_BASE  = (process.env.MTN_MOMO_BASE_URL ?? 'https://sandbox.momodeveloper.mtn.com').replace(/\/$/, '');
const MTN_SUBKEY = process.env.MTN_MOMO_SUBSCRIPTION_KEY ?? '';
const MTN_USER   = process.env.MTN_MOMO_API_USER ?? '';
const MTN_KEY    = process.env.MTN_MOMO_API_KEY ?? '';
const MTN_ENV    = process.env.MTN_MOMO_ENVIRONMENT ?? 'sandbox';

const FETCH_TIMEOUT_MS = 15_000;

/**
 * fetch() with an abort-based timeout so a hung MoMo endpoint can never block a
 * serverless invocation indefinitely.
 */
async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Normalise Cameroonian phone to MSISDN (digits only, 237xxxxxxxxx) */
function toMsisdn(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('237') && digits.length === 12) return digits;
  if (digits.length === 9 && digits.startsWith('6')) return `237${digits}`;
  return digits;
}

/** Fetch a short-lived Bearer token from MTN MoMo Collections */
async function getMomoToken(): Promise<string | null> {
  if (!MTN_SUBKEY || !MTN_USER || !MTN_KEY) return null;
  const credentials = Buffer.from(`${MTN_USER}:${MTN_KEY}`).toString('base64');

  // Token creation is safe to retry (no side effects). Retry transient
  // network / 5xx failures with a short backoff.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetchWithTimeout(`${MTN_BASE}/collection/token/`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Ocp-Apim-Subscription-Key': MTN_SUBKEY,
        },
      });
      if (res.ok) {
        const data = await res.json();
        return (data as { access_token: string }).access_token ?? null;
      }
      logger.error('MoMo token fetch failed', { status: res.status, body: await res.text(), attempt });
      if (res.status < 500) return null; // 4xx won't fix itself
    } catch (err) {
      logger.error('MoMo token error', { err, attempt });
    }
    if (attempt === 0) await sleep(500);
  }
  return null;
}

export interface MomoRequestResult {
  ok: boolean;
  error?: string;
}

/**
 * Initiate a MTN MoMo RequestToPay (push notification to buyer's phone).
 * referenceId must be a UUID — used as the X-Reference-Id and payment record ID.
 */
export async function requestMomoPayment(
  referenceId: string,
  amount: number,
  phone: string,
  description: string
): Promise<MomoRequestResult> {
  const token = await getMomoToken();
  if (!token) {
    return { ok: false, error: 'MTN MoMo credentials not configured or token fetch failed.' };
  }

  const msisdn = toMsisdn(phone);
  const init: RequestInit = {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      // X-Reference-Id is MTN's idempotency key: re-POSTing the same id never
      // creates a second charge — MTN returns 409 Conflict instead. This makes
      // retrying (below) safe and protects against duplicate prompts.
      'X-Reference-Id': referenceId,
      'X-Target-Environment': MTN_ENV,
      'Ocp-Apim-Subscription-Key': MTN_SUBKEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: String(amount),
      currency: 'XAF',
      externalId: referenceId,
      payer: { partyIdType: 'MSISDN', partyId: msisdn },
      payerMessage: description.slice(0, 160),
      payeeNote: 'MotoPayee',
    }),
  };

  let lastError = 'Unknown error';
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetchWithTimeout(`${MTN_BASE}/collection/v1_0/requesttopay`, init);

      // 202 Accepted = push sent. 409 Conflict = this referenceId was already
      // accepted by a prior call — treat as success (idempotent), do NOT retry
      // or fail, otherwise we'd mark a live request as failed.
      if (res.status === 202 || res.status === 409) return { ok: true };

      const text = await res.text();
      lastError = `MTN error ${res.status}: ${text}`;
      logger.error('MoMo RequestToPay failed', { status: res.status, body: text, referenceId, attempt });
      if (res.status < 500) return { ok: false, error: lastError }; // 4xx won't fix itself
    } catch (err) {
      // Timeout / network error. Safe to retry with the same referenceId.
      lastError = `Network error: ${err}`;
      logger.error('MoMo RequestToPay error', { err, referenceId, attempt });
    }
    if (attempt === 0) await sleep(500);
  }
  return { ok: false, error: lastError };
}

export type MomoStatus = 'PENDING' | 'SUCCESSFUL' | 'FAILED' | 'CANCELLED';

export interface MomoStatusResult {
  status: MomoStatus | null;
  financialTransactionId?: string;
  error?: string;
}

/** Poll the status of a RequestToPay by its referenceId (= our payment record UUID) */
export async function checkMomoPayment(referenceId: string): Promise<MomoStatusResult> {
  const token = await getMomoToken();
  if (!token) return { status: null, error: 'MTN MoMo credentials not configured.' };

  // Status polling is a read — safe to retry transient failures.
  let lastError = 'Unknown error';
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetchWithTimeout(`${MTN_BASE}/collection/v1_0/requesttopay/${referenceId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Target-Environment': MTN_ENV,
          'Ocp-Apim-Subscription-Key': MTN_SUBKEY,
        },
      });
      if (res.ok) {
        const data = await res.json() as { status: MomoStatus; financialTransactionId?: string };
        return { status: data.status, financialTransactionId: data.financialTransactionId };
      }
      lastError = `MTN error ${res.status}`;
      if (res.status < 500) return { status: null, error: lastError };
    } catch (err) {
      lastError = `Network error: ${err}`;
    }
    if (attempt === 0) await sleep(500);
  }
  return { status: null, error: lastError };
}

export interface OrangePaymentResult {
  ok: boolean;
  reference: string;
  instructions: string;
}

/**
 * Orange Money Cameroon — no standardised REST API available.
 * Returns a manual payment reference the buyer uses via USSD (*150# or agent).
 */
export function requestOrangePayment(
  referenceId: string,
  amount: number,
  phone: string
): OrangePaymentResult {
  void phone; // phone noted for record-keeping only
  const ref = `OM-${referenceId.slice(0, 8).toUpperCase()}`;
  return {
    ok: true,
    reference: ref,
    instructions: `Effectuez un paiement de ${amount.toLocaleString('fr-FR')} XAF via Orange Money au numéro MotoPayee en indiquant la référence ${ref}. Votre dossier sera mis à jour dès confirmation.`,
  };
}

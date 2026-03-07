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

const MTN_BASE  = (process.env.MTN_MOMO_BASE_URL ?? 'https://sandbox.momodeveloper.mtn.com').replace(/\/$/, '');
const MTN_SUBKEY = process.env.MTN_MOMO_SUBSCRIPTION_KEY ?? '';
const MTN_USER   = process.env.MTN_MOMO_API_USER ?? '';
const MTN_KEY    = process.env.MTN_MOMO_API_KEY ?? '';
const MTN_ENV    = process.env.MTN_MOMO_ENVIRONMENT ?? 'sandbox';

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
  try {
    const res = await fetch(`${MTN_BASE}/collection/token/`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Ocp-Apim-Subscription-Key': MTN_SUBKEY,
      },
    });
    if (!res.ok) {
      console.error('[MoMo] Token fetch failed:', res.status, await res.text());
      return null;
    }
    const data = await res.json();
    return (data as { access_token: string }).access_token ?? null;
  } catch (err) {
    console.error('[MoMo] Token error:', err);
    return null;
  }
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

  try {
    const res = await fetch(`${MTN_BASE}/collection/v1_0/requesttopay`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
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
    });

    if (res.status === 202) return { ok: true };
    const text = await res.text();
    console.error('[MoMo] RequestToPay failed:', res.status, text);
    return { ok: false, error: `MTN error ${res.status}: ${text}` };
  } catch (err) {
    return { ok: false, error: `Network error: ${err}` };
  }
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

  try {
    const res = await fetch(`${MTN_BASE}/collection/v1_0/requesttopay/${referenceId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Target-Environment': MTN_ENV,
        'Ocp-Apim-Subscription-Key': MTN_SUBKEY,
      },
    });
    if (!res.ok) {
      return { status: null, error: `MTN error ${res.status}` };
    }
    const data = await res.json() as { status: MomoStatus; financialTransactionId?: string };
    return { status: data.status, financialTransactionId: data.financialTransactionId };
  } catch (err) {
    return { status: null, error: `Network error: ${err}` };
  }
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

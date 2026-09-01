/**
 * Which environment variables are set, and what breaks when they are not.
 *
 *   npm run check:env
 *
 * Every integration in this codebase degrades quietly when its credentials are
 * missing. Payments return null, SMS logs a warning and returns, crons answer
 * 401 and never run. Nothing crashes, so an unset variable looks exactly like a
 * feature nobody is using — which is how two cron jobs went unnoticed for the
 * life of the project.
 *
 * This prints the surface and says, for each variable, what silently stops
 * working without it. It never prints a value.
 */

import { readFileSync } from 'node:fs';

/**
 * The consequences below were each read out of the code rather than assumed —
 * they say what the guard actually does, not what it ought to do.
 */
const VARS = [
  // ── Required for the app to function at all ──
  { name: 'NEXT_PUBLIC_SUPABASE_URL', group: 'core', missing: 'Nothing can reach the database.' },
  { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', group: 'core', missing: 'Client-side Supabase calls fail.' },
  { name: 'SUPABASE_SERVICE_ROLE_KEY', group: 'core', missing: 'Every server route and page fails to load data.' },
  { name: 'NEXT_PUBLIC_APP_URL', group: 'core', missing: 'Absolute links in emails and share URLs point nowhere.' },

  // ── Scheduled work ──
  {
    name: 'CRON_SECRET',
    group: 'crons',
    missing:
      'All three cron routes reject every request with 401 — deliberately fail-closed, ' +
      'so the weekly scorecard, price alerts and saved-search alerts silently never run.',
  },

  // ── Payments ──
  { name: 'MTN_MOMO_SUBSCRIPTION_KEY', group: 'payments', missing: 'MoMo token request returns null; no payment can be initiated.' },
  { name: 'MTN_MOMO_API_USER', group: 'payments', missing: 'Same — payments are inert.' },
  { name: 'MTN_MOMO_API_KEY', group: 'payments', missing: 'Same — payments are inert.' },
  { name: 'MTN_MOMO_ENVIRONMENT', group: 'payments', optional: true, missing: 'Defaults to "sandbox" — real money never moves.' },
  { name: 'MTN_MOMO_BASE_URL', group: 'payments', optional: true, missing: 'Falls back to the sandbox host.' },
  { name: 'MTN_WEBHOOK_SECRET', group: 'payments', optional: true, missing: 'The MoMo callback is unauthenticated. It still re-checks status with MTN before mutating, so a forged payload is harmless, but the gate is off.' },

  // ── Notifications ──
  { name: 'AFRICASTALKING_USERNAME', group: 'notifications', missing: 'Every SMS logs "SMS skipped" and returns. Alerts appear to send and do not.' },
  { name: 'AFRICASTALKING_API_KEY', group: 'notifications', missing: 'Same — all SMS is a no-op.' },
  { name: 'AFRICASTALKING_SENDER_ID', group: 'notifications', optional: true, missing: 'Defaults to "MotoPayee".' },
  { name: 'OPS_ALERT_PHONE', group: 'notifications', optional: true, missing: 'Operational alerts have nowhere to go.' },
  { name: 'NEXT_PUBLIC_WHATSAPP_SUPPORT_NUMBER', group: 'notifications', optional: true, missing: 'Support links fall back to a default number.' },

  // ── Operations ──
  { name: 'ERROR_WEBHOOK_URL', group: 'ops', optional: true, missing: 'Reported errors are logged locally only — nobody is paged.' },
  { name: 'UPSTASH_REDIS_REST_URL', group: 'ops', optional: true, missing: 'Rate limiting falls back to per-instance memory, which does not hold across serverless instances.' },
  { name: 'UPSTASH_REDIS_REST_TOKEN', group: 'ops', optional: true, missing: 'Same as above.' },
  { name: 'LOG_LEVEL', group: 'ops', optional: true, missing: 'Defaults to info.' },
];

function localEnvNames(path = '.env.local') {
  try {
    return new Set(
      readFileSync(path, 'utf8')
        .split('\n')
        .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
        .map((l) => l.slice(0, l.indexOf('=')).trim())
    );
  } catch {
    return new Set();
  }
}

const local = localEnvNames();
const isSet = (name) => Boolean(process.env[name]) || local.has(name);

const GROUPS = {
  core: 'Core — the app does not work without these',
  crons: 'Scheduled work',
  payments: 'Payments (MTN MoMo)',
  notifications: 'Notifications (Africa\'s Talking)',
  ops: 'Operations',
};

let missingRequired = 0;

for (const [group, title] of Object.entries(GROUPS)) {
  console.log(`\n${title}`);
  for (const v of VARS.filter((x) => x.group === group)) {
    const set = isSet(v.name);
    if (!set && !v.optional) missingRequired += 1;
    const mark = set ? '  set    ' : v.optional ? '  unset  ' : '  MISSING';
    console.log(`${mark} ${v.name}`);
    if (!set) console.log(`           ${v.missing}`);
  }
}

console.log(
  `\n${missingRequired === 0
    ? 'Every required variable is present.'
    : `${missingRequired} required variable(s) missing — the features above are silently inert.`}`
);
console.log('Values are never printed. "set" means present in the environment or .env.local.');
process.exit(0);

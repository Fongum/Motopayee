# MotoPayee

Vehicle marketplace and financing platform for MotoPayee. Built with Next.js, Supabase, and Vercel.

## Getting Started

Install dependencies and run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Scripts

| Command          | Description                          |
| ---------------- | ------------------------------------ |
| `npm run dev`    | Start the local development server   |
| `npm run build`  | Production build                     |
| `npm run start`  | Serve the production build           |
| `npm run lint`   | Run ESLint                           |
| `npm test`       | Run the Vitest unit suite once       |
| `npm run test:watch` | Run Vitest in watch mode         |
| `npm run check:env` | List the environment surface and what each missing variable silently disables |
| `npm run audit` | Both live-database audits (needs credentials) |
| `npm run audit:queries` | Check every query in the codebase against the live schema |
| `npm run audit:access` | Check what the public anon key can read |

## Environment

Copy your credentials into `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=

# Optional — distributed rate limiting (Upstash Redis).
# When unset, rate limiting falls back to a per-instance in-memory store,
# which is best-effort only. Set these in production for correct throttling
# across serverless instances.
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Optional — where production errors are forwarded. Accepts a Slack incoming
# webhook or any collector that takes JSON. When unset, errors are still
# written to the structured logs; they just do not page anyone.
ERROR_WEBHOOK_URL=

# Required — shared secret for the scheduled jobs. Vercel sends it as an
# Authorization: Bearer header. The cron routes FAIL CLOSED: when this is unset
# every one answers 401, so the weekly scorecard, price alerts and saved-search
# alerts silently never run.
CRON_SECRET=

# Required for payments — MTN Mobile Money. Without these the token request
# returns null and no payment can be initiated; nothing errors.
MTN_MOMO_SUBSCRIPTION_KEY=
MTN_MOMO_API_USER=
MTN_MOMO_API_KEY=
# Optional — defaults to "sandbox", where real money never moves.
MTN_MOMO_ENVIRONMENT=
MTN_MOMO_BASE_URL=
# Optional — gate on the MoMo callback. The webhook re-checks status with MTN
# before mutating either way, so a forged payload is harmless without it.
MTN_WEBHOOK_SECRET=

# Required for notifications — Africa's Talking. Without these every SMS logs
# "SMS skipped" and returns, so alerts appear to send and do not.
AFRICASTALKING_USERNAME=
AFRICASTALKING_API_KEY=
# Optional — defaults to "MotoPayee". Must be approved by Africa's Talking.
AFRICASTALKING_SENDER_ID=

# Optional — comma-separated numbers alerted by SMS when a buyer or renter
# requests a callback from a vehicle page. When unset, no alert is sent and
# the requests are only visible in /admin/ops and /admin/leads?inbound=waiting.
# Requires the Africa's Talking SMS credentials to be set as well.
OPS_ALERT_PHONE=
```

Every integration here degrades quietly when its credentials are absent —
payments return null, SMS logs a warning and returns, crons answer 401. Nothing
crashes, so an unset variable looks exactly like a feature nobody uses. Run
`npm run check:env` to see what is set and what each gap disables.

## Rate limiting

All state-changing API requests are throttled per IP by `middleware.ts` (a global
safety net), and sensitive routes such as `auth/login` and `auth/register` apply
stricter per-IP limits on top. Throttling uses Upstash Redis when configured and
falls back to an in-memory limiter otherwise. See `lib/rate-limit.ts`.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Database / Auth:** Supabase (Postgres + Auth + Storage)
- **Validation:** Zod
- **Testing:** Vitest
- **Hosting:** Vercel

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

# Optional — comma-separated numbers alerted by SMS when a buyer or renter
# requests a callback from a vehicle page. When unset, no alert is sent and
# the requests are only visible in /admin/ops and /admin/leads?inbound=waiting.
# Requires the Africa's Talking SMS credentials to be set as well.
OPS_ALERT_PHONE=
```

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

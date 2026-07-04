# Konnect NOC

A full-stack technical support workspace for an ISP NOC team: ticketing, a
block-based knowledge base, a device registry, and a real network
diagnostic engine with automatic incident detection.

Built with Next.js 14 (App Router), TypeScript, Tailwind CSS, Prisma, and
PostgreSQL. Ready to deploy on Vercel.

## What is in here

- **Tickets**: create, triage, and resolve faults. Tickets carry a cluster
  tag so tickets from the same OLT/PoP/DHCP pool surface together instead
  of being worked as separate, unrelated issues.
- **Knowledge base**: block-based pages (heading, text, checklist, code)
  for writing up a fix once so the next shift does not have to
  re-escalate the same problem.
- **Device registry**: register any device with a routable address (ONT,
  OLT, router, switch, server, access point) and a check method.
- **Diagnostics engine**: real network checks, not simulated data. A TCP
  check opens an actual socket. An HTTP/HTTPS check issues an actual
  request. A DNS check performs an actual lookup. Results are logged to
  history. N consecutive failures (configurable per device) automatically
  opens an incident and a linked ticket; a later success automatically
  resolves both.
- **Role-based access**: Admin, Engineer, Viewer. Viewers get read-only
  access. Engineers can work tickets, articles, and devices. Admins can
  also delete devices and trigger a manual full diagnostic sweep.
- **Audit log**: every login, ticket change, article edit, device change,
  and auto-opened incident is recorded with who, what, and when.

### On the diagnostics module, honestly

This runs on Vercel's serverless network. It can reach anything with a
public or otherwise routable address (a server, a cloud-hosted API, a
device exposed through a static IP or port forward, a VPN-reachable
endpoint if you route the function through one). It cannot ARP-scan a
private LAN it is not attached to; that needs an on-prem agent, which is
a separate piece of software outside a serverless deployment. There is no
fake or simulated data anywhere in this module: if nothing is reachable,
the history will show real failures, not placeholder numbers.

## Getting started

### 1. Requirements

- Node.js 20+
- A PostgreSQL database reachable from wherever you run this (Neon,
  Vercel Postgres, Supabase, or your own instance all work)

### 2. Install

```bash
npm install
```

This also runs `prisma generate` via `postinstall`.

### 3. Configure environment variables

Copy `.env.example` to `.env` and fill it in:

```bash
cp .env.example .env
```

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `SESSION_SECRET` | Signs session cookies. 32+ random characters. |
| `CRON_SECRET` | Authorizes the scheduled diagnostic sweep. |
| `SEED_ADMIN_NAME` / `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | First account, created once by the seed script |

Generate random secrets with:

```bash
openssl rand -base64 48
```

### 4. Create the database schema

```bash
npx prisma migrate deploy
```

(Use `npx prisma migrate dev --name init` instead if this is the very
first migration and you want Prisma to generate the migration files.)

### 5. Create your admin account

```bash
npm run db:seed
```

This creates exactly one account, from the `SEED_ADMIN_*` variables. It
does not create any sample tickets, devices, or articles. Everything you
see afterward is data you enter yourself.

### 6. Run it

```bash
npm run dev
```

Visit `http://localhost:3000` and sign in with the account you just
seeded.

## Deploying to Vercel

1. Push this repository to GitHub.
2. Import it in Vercel.
3. In Project Settings -> Environment Variables, add `DATABASE_URL`,
   `SESSION_SECRET`, and `CRON_SECRET` (and the `SEED_ADMIN_*` variables
   if you plan to run the seed script against the production database).
4. Deploy. Vercel runs `npm run build`, which runs `prisma generate`
   before `next build`.
5. Run the migration and seed against your production database once,
   either from your machine with `DATABASE_URL` pointed at production,
   or via Vercel's CLI (`vercel env pull` then run the same commands
   locally).

### Scheduled diagnostics on Vercel

`vercel.json` defines a cron job that hits `/api/diagnostics/run` every
five minutes. Vercel automatically sends `Authorization: Bearer
<CRON_SECRET>` to cron requests once `CRON_SECRET` is set as an
environment variable, and the route checks that header before running.

Note: frequent cron schedules (every 5 minutes) require a Vercel Pro
plan or higher. On the Hobby plan, cron jobs run at most once a day. If
you are on Hobby and want more frequent checks, either reduce the
schedule in `vercel.json` to once daily, or use a free external
scheduler (e.g. cron-job.org) to call `POST /api/diagnostics/run` with
the same bearer token on whatever interval you need. An admin can also
trigger a full sweep on demand from the Diagnostics page in the app.

## Security notes

- Passwords are hashed with bcrypt (cost factor 12). Never stored in
  plain text.
- Sessions are signed JWTs in an httpOnly, secure, sameSite cookie, not
  readable or forgeable from the browser.
- All mutation routes validate input with Zod before touching the
  database, and check the session's role before making a change.
- The login route is rate limited per IP.
- The diagnostics module blocks cloud metadata addresses and loopback
  before making an outbound request, to prevent a device entry from
  being used to probe the hosting platform itself.
- Security headers (HSTS, X-Frame-Options, X-Content-Type-Options,
  Referrer-Policy, a restrictive Permissions-Policy) are set on every
  response in `next.config.mjs`.
- Run `npm audit` before every deploy and keep dependencies current. At
  the time this project was built, two moderate advisories remained open
  upstream in Next.js's bundled PostCSS dependency with no patched
  release yet; there is no application-level workaround for that one,
  only watching for the upstream fix.

## Project structure

```
prisma/schema.prisma        Data model
prisma/seed.ts               Creates the first admin account only
src/middleware.ts            Route protection (session check)
src/lib/                     Auth, RBAC, validation, diagnostics engine,
                              monitor orchestration, audit log
src/components/              Client-side forms and interactive widgets
src/app/(app)/                Authenticated pages (dashboard, tickets,
                              kb, devices, diagnostics), behind one
                              shared sidebar/topbar shell
src/app/login/                Sign-in page
src/app/api/                  Route handlers for all mutations and the
                              cron endpoint
```

## Roles

| Action | Viewer | Engineer | Admin |
|---|:---:|:---:|:---:|
| View tickets, KB, devices, diagnostics | Yes | Yes | Yes |
| Create/update tickets, post notes | No | Yes | Yes |
| Write/edit KB articles | No | Yes | Yes |
| Register/edit devices, run a check | No | Yes | Yes |
| Delete a device | No | No | Yes |
| Trigger a manual full diagnostic sweep | No | No | Yes |

Create additional accounts directly in the database (there is no
self-signup by design, since this is an internal tool) or extend the app
with a simple admin-only "create user" screen using the same pattern as
the device/ticket forms.

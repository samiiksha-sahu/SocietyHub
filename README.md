# SocietyHub Maintenance Tracker

SocietyHub is a full-stack maintenance-complaint management platform for residential communities. It gives residents a simple way to raise and follow requests, while giving facility teams a focused queue for triage, accountability, SLA risk, notices, and operational reporting.

## Product experience

The interface uses a MyGate-inspired visual language: crimson actions, slate typography, cool-gray page surfaces, white cards, compact status badges, and a responsive workspace that works on desktop and mobile. Residents see only their own complaints, the shared notice board, and their notification activity. Administrators see the complete queue, overdue items pinned first, complaint detail with photo and audit history, status and priority controls, notice publishing, and category analytics.

## Local setup

The project is a React 19 + Tailwind CSS 4 frontend served by an Express + tRPC backend. Drizzle ORM targets the provisioned MySQL/TiDB-compatible database. Manus OAuth is already wired by the scaffold and provides the authenticated `ctx.user` used by protected procedures.

```bash
pnpm install
pnpm drizzle-kit generate
# Apply the generated SQL through the project database migration workflow.
pnpm db:seed
pnpm dev
```

The local server reads the database and Manus runtime environment from the project environment. Do not commit `.env` files or hardcode credentials. To make a signed-in account an administrator during development, update the `users.role` value to `admin` in the database; regular authenticated users use the `user` role and are presented as residents in the UI.

## Roles and guarded behavior

| Capability | Resident | Admin |
|---|---:|---:|
| Sign in through Manus OAuth | Yes | Yes |
| Submit a complaint with an image | Yes | Yes, through the same protected procedure |
| View complaint history | Own complaints only | All complaints |
| Change status or priority | No | Yes |
| Resolve a complaint permanently | No | Yes |
| Publish or pin notices | No | Yes |
| View analytics and overdue triage | No | Yes |
| Receive notification activity | Own events | Owner alerts are emitted for operations |

The backend uses `protectedProcedure` for authenticated operations and an admin middleware that rejects any non-admin caller with `FORBIDDEN`. Complaint detail also checks ownership for residents. Resolved complaints cannot be updated again.

## Data model

The core tables are `users`, `complaints`, `complaint_history`, `notices`, `notification_events`, and `app_settings`. Complaint history is append-only by application contract: a status transition inserts a new record containing the complaint, previous status, new status, actor, note, and timestamp. The complaint row stores the current projection for fast queue reads. The overdue projection is refreshed before queue and analytics reads using the configurable threshold in `app_settings`.

Photo uploads are accepted only when the MIME type begins with `image/`. The server decodes the request payload and sends the bytes to the managed object-storage helper under a user-scoped complaint key. The database retains only `photoUrl` and `photoKey`; it never stores image bytes. The UI displays a thumbnail in the complaint drawer when a reference exists.

## Notifications

Status changes create resident notification events that contain the recipient address, complaint reference, and admin note. Pinned notices create one event per resident and an owner alert. New complaints also create an owner alert. The built-in owner notification service is attempted first. If it is unavailable, the event is recorded with `fallback`, providing a reliable audit surface for a future SMTP, Resend, or SendGrid adapter without blocking the core workflow. This keeps local development deterministic and avoids embedding credentials in source code.

## Verification

Run the static checks and tests before delivery:

```bash
pnpm check
pnpm test
pnpm build
```

For browser verification, sign in once through Manus OAuth, confirm a resident can create and view only their own ticket, promote a development account to admin, confirm the queue and analytics load, update a ticket twice, confirm the audit timeline grows, confirm a resolved ticket is locked, publish a pinned notice, and verify notification events are listed. The responsive layout should be checked at both desktop and narrow mobile widths.

## Important implementation notes

The generated migration is stored under `drizzle/`. Use the project database migration workflow to apply it and keep the Drizzle schema in sync. The seed script is intentionally repeatable for named sample records and creates an overdue open complaint so the admin triage state is visible immediately. Sample data is clearly marked as seed data and is not presented as resident testimonials or ratings.

## Final package quick start

The repository includes `env.example` as a credential-free template. Copy it to `.env` locally, then replace the database and Manus placeholders with your environment values. Live email is intentionally disabled for this package; leave `RESEND_API_KEY` blank to keep fallback notification records enabled.

```bash
cp env.example .env
pnpm install
pnpm drizzle-kit generate
pnpm db:seed
pnpm dev
```

For a production verification pass, use:

```bash
pnpm check
pnpm test
pnpm build
```

The generated migration is `drizzle/0001_aromatic_eternals.sql`. The schema creates `users`, `complaints`, `complaint_history`, `notices`, `notification_events`, and `app_settings`. The complete REST contract, including methods, paths, access rules, JSON examples, errors, audit payloads, photo handling, analytics, and notification behavior, is documented in [`REST_API.md`](./REST_API.md).

This release is intentionally **single-society**. There is no tenant selector, customer partition, or multi-tenant routing layer. All authenticated residents and administrators operate within the same society workspace, with role boundaries enforced at the procedure and query layers.

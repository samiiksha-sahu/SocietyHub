# SocietyHub System Design

## Overview

SocietyHub is a single full-stack web application. The React frontend renders resident and admin workspaces, while the Express server exposes typed tRPC procedures. Manus OAuth establishes the session cookie; the server context resolves the authenticated user for every request. Drizzle ORM provides the database contract and queries against the provisioned MySQL/TiDB-compatible database.

## Domain model

`users` stores OAuth identity, role, email, and residential unit. `complaints` stores the current ticket projection: resident, assigned administrator, title, category, description, secure photo reference, priority, status, resolution note, overdue flag, and UTC timestamps. `complaint_history` is the accountability ledger. Each status transition inserts a row with `complaintId`, `previousStatus`, `newStatus`, `changedByUserId`, `adminNote`, and `createdAt`. The current complaint row is optimized for queue reads; the history table is the immutable record of what happened.

`notices` stores resident announcements with category, author, creation time, and the pinned flag. `notification_events` stores delivery attempts and fallback state for resident notifications and owner alerts. `app_settings` stores the configurable overdue threshold, defaulting to three days.

## Request and security flow

A resident authenticates through Manus OAuth and receives the existing secure session cookie. Protected tRPC procedures require `ctx.user`. The admin middleware checks `ctx.user.role === "admin"` before triage, analytics, notice publishing, or settings updates. Resident complaint lists are filtered by `residentId`; complaint detail repeats the ownership check to prevent ID-based data exposure. Resolved complaints are permanently closed at the procedure boundary, so neither priority nor status can be changed after resolution.

Complaint creation validates title, category, and description. If a photo is attached, the server accepts only image MIME types, uploads bytes through the managed object-storage helper using a user-scoped key, and stores only the returned URL and object key in the database. The database does not contain BLOB data. A first `open` history row is inserted in the same workflow as the complaint.

## Lifecycle and overdue logic

The admin update procedure reads the current complaint, rejects missing or resolved tickets, updates the current projection, and inserts a history row only when the status changes. A resolution note is stored on the complaint when the new status is `resolved`. Queue and analytics reads refresh overdue flags using `createdAt`, current status, and `app_settings.overdueThresholdDays`. Unresolved tickets older than the threshold receive `isOverdue = true`; the admin list orders overdue items before newer work.

## Notification architecture

New complaints, status changes, and pinned notices emit notification events. The built-in owner notification service is attempted for owner alerts. Resident email delivery is represented as an explicit event with `fallback` status in the current environment, allowing SMTP, Resend, or SendGrid to be added as a provider adapter without changing the complaint transaction. The event retains recipient, related entity, message, and timestamp so delivery status remains visible and auditable.

## Analytics and UI

Admin analytics derives counts from complaint projections for total, open, in-progress, resolved, overdue, category, and priority. The UI presents these as metric cards, a triage queue, and proportional category bars. Residents see their own counters, recent requests, notice board, notification activity, and a complaint detail dialog with the audit timeline. Both views use the same responsive shell, semantic badges, keyboard-reachable controls, and reduced-motion-friendly CSS transitions.

## Verification

The project should pass `pnpm check`, `pnpm test`, and `pnpm build`. Browser verification covers OAuth entry, resident ownership boundaries, admin-only workflows, photo references, immutable history, resolved-ticket locking, overdue ordering, pinned notices, notification events, and narrow-screen layout behavior.

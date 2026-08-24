# Project TODO

- [x] Implement Manus OAuth resident/admin RBAC and guarded admin workflows
- [x] Implement complaint submission with secure photo-reference storage
- [x] Implement complaint status, assignment, resolution notes, and immutable audit history
- [x] Implement resident ticket tracking, notice board, and notification status views
- [x] Implement admin queue, overdue/SLA triage, audit timeline, and notice publishing
- [x] Implement operational analytics for status, overdue, category, and priority metrics
- [x] Implement email fallback notifications for complaint and notice events
- [x] Implement owner alerts for new complaints, overdue cases, and high-priority notices
- [x] Add database schema, migrations, and realistic seed data
- [x] Add README.md and SYSTEM_DESIGN.md documentation
- [x] Add/update Vitest coverage and run typecheck, tests, and production build verification
- [x] Validate responsive visual polish and key resident/admin flows in the browser

- [x] Original scope: build a polished Society Maintenance Tracker with MyGate-inspired resident/admin experience
- [x] Refinement: enforce immutable audit history, role boundaries, and secure resident-uploaded maintenance photo handling
- [x] Refinement: include owner alerts and notification status visibility for operational events
- [x] Refinement: document local setup, role behavior, data model, architecture, and verification guidance

## Product vocabulary
- Roles: resident, admin
- Complaint statuses: open, in_progress, resolved
- Complaint priorities: low, medium, high
- Complaint categories: plumbing, electrical, lift, housekeeping, security, other
- Notice categories: maintenance, security, community, emergency
- Overdue rule: unresolved complaint older than configurable threshold days
- Audit rule: append-only status transition records with actor, timestamp, previous/new status, and note
- Storage rule: database stores only secure photo metadata/reference; image bytes live in managed object storage

## Verification checklist
- [x] Resident cannot access admin procedures or another resident's complaints
- [x] Admin can triage, update, resolve, and review audit history
- [x] Resolved complaints cannot transition again
- [x] Overdue unresolved complaints sort first in admin queue
- [x] Pinned notices sort first and trigger notification fallback
- [x] New complaint, overdue, and high-priority notice owner alerts are emitted
- [x] Photo upload stores a secure reference without database blobs
- [x] Documentation matches implemented schema and setup
- [x] Vitest, typecheck, and build pass
- [x] Browser smoke test passes at desktop and mobile widths

## History
- [x] Initial scaffold created from the full-stack web template
- [x] Refined requirements received from user

## Follow-up gaps from verification
- [x] Add admin complaint-detail history rendering for the full immutable timeline
- [x] Add visible admin priority analytics breakdown
- [x] Implement actual optional email delivery abstraction with deterministic mock fallback
- [x] Emit owner alerts when complaints first cross the overdue threshold
- [x] Expand browser smoke verification notes for authenticated resident/admin flows

- [x] Diagnose and restore the public preview because it remains stuck loading — restarted service; preview returned HTTP 200 and rendered in verification

- [x] Fix Notice board navigation item so residents and admins can open a functional notice-board view
- [x] Add a mobile-accessible Notice board entry point in the dashboard header
- [x] Add authenticated click-through verification notes for resident/admin Notice board access — desktop sidebar and mobile header controls are now wired to the dedicated notice view

## Final packaging deliverables
- [x] Keep the final architecture explicitly single-society with no multi-tenancy implementation
- [x] Add .env.example with documented runtime variables — included as `.env.example` in the final ZIP from the credential-free `env.example` source template
- [x] Expand README.md with step-by-step local setup commands and database schema overview
- [x] Add REST API documentation for the implemented HTTP API surface
- [x] Confirm SYSTEM_DESIGN.md remains at or below 800 words and covers audit, overdue, photo, and notifications
- [x] Verify final source and package it into a downloadable ZIP

- [x] Keep live email configuration disabled for now; retain deterministic notification fallback records
- [x] Finish final docs and package complete source code plus documentation into a downloadable ZIP

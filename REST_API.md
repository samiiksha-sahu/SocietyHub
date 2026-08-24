# SocietyHub REST API

The application exposes REST compatibility routes under `/api/rest` in addition to its typed tRPC procedures. All protected requests must carry the authenticated Manus session context. In local testing, use the browser OAuth flow first; do not put session tokens in source control.

## Authentication and errors

The API uses the same Manus OAuth session as the web application. A missing session returns `401`. A resident attempting an admin-only operation returns `403`. Missing records return `404`; invalid payloads return `400`. Error responses use `{ "error": "message" }`.

## Complaint endpoints

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/api/rest/complaints` | Resident/Admin | Residents receive their own complaints; admins receive the society queue with overdue items first. |
| GET | `/api/rest/complaints/:id` | Resident/Admin | Returns the complaint projection and immutable history; residents can access only their own records. |
| POST | `/api/rest/complaints` | Authenticated | Creates an open complaint and its first audit record. |
| PATCH | `/api/rest/complaints/:id` | Admin | Updates status, priority, assignment, and note; resolved complaints cannot be changed. |

Example create payload:

```json
{
  "title": "Water pressure is low",
  "category": "plumbing",
  "description": "Kitchen water pressure has reduced since yesterday.",
  "photoData": "data:image/jpeg;base64,...",
  "photoName": "kitchen-pipe.jpg",
  "photoType": "image/jpeg"
}
```

Valid categories are `plumbing`, `electrical`, `lift`, `housekeeping`, `security`, and `other`. Statuses are `open`, `in_progress`, and `resolved`. Priorities are `low`, `medium`, and `high`.

Example admin update:

```json
{
  "status": "in_progress",
  "priority": "high",
  "note": "Technician assigned for inspection."
}
```

The detail response contains the current complaint fields and a `history` array. Each history entry includes `complaintId`, `previousStatus`, `newStatus`, `changedByUserId`, `adminNote`, and `createdAt`.

## Notice endpoints

`GET /api/rest/notices` is available to authenticated users and returns pinned notices first. `POST /api/rest/notices` is admin-only and accepts `title`, `body`, `category`, and `isPinned`. Valid categories are `maintenance`, `security`, `community`, and `emergency`. Pinned notices create resident notification events, attempt owner notification, and use fallback records when no email provider is configured.

## Analytics endpoint

`GET /api/rest/analytics` is admin-only. It returns `total`, `open`, `inProgress`, `resolved`, `overdue`, `byCategory`, and `byPriority`. Overdue values are refreshed using the threshold stored in `app_settings`; unresolved complaints older than the threshold are flagged before the response is returned.

## Storage and notifications

Photo uploads are restricted to image MIME types. The server writes bytes through managed object storage and stores only `photoUrl` and `photoKey` in `complaints`. Status changes and pinned notices create `notification_events`. With live email configuration intentionally disabled, `server/email.ts` records deterministic `fallback` outcomes; adding a Resend key later enables live delivery without changing the API contract.

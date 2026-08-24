# Society Maintenance Tracker

A full-stack residential society maintenance and complaint management platform that allows residents to raise and track complaints while enabling administrators to manage complaints, priorities, overdue issues, notices, and reporting.

---

## Features

### Resident

* Register and log in
* Raise maintenance complaints with category selection:

  * Plumbing
  * Electrical
  * Lift
  * Housekeeping
  * Security
  * Civil
* Add description and optional photo attachment
* View personal submitted complaints
* Track complete complaint status audit history with admin notes
* Receive notification updates when complaint status changes
* View society notice board and important announcements

### Admin

* View all society complaints with multi-filter triage:

  * Category
  * Status
  * Date
* Set complaint priority:

  * `Low`
  * `Medium`
  * `High`
* Update complaint status:

  * `Open`
  * `In Progress`
  * `Resolved`
* Add optional remarks to status changes
* View complete immutable complaint audit history
* Identify overdue complaints past the SLA threshold
* Publish and pin important society notices
* View workload analytics, operational metrics, and category distributions

---

## Complaint Lifecycle

```text
Open → In Progress → Resolved
```

Every status change records:

* Timestamp
* Actor
* Previous status
* New status
* Optional resolution note

Once a complaint is marked as **Resolved**, it is permanently locked from further status modification.

---

## Overdue Detection

* Complaints are checked against a configurable overdue SLA threshold.
* The default threshold is **3 days / 72 hours**.
* Active complaints that remain unresolved beyond the threshold are marked as **Overdue**.
* Overdue complaints are surfaced at the top of the admin triage console.

---

## Tech Stack

| Layer              | Technology                                             |
| ------------------ | ------------------------------------------------------ |
| **Frontend**       | React 19, TypeScript, Tailwind CSS, Vite, Lucide Icons |
| **Backend**        | Node.js, Express                                       |
| **Database**       | SQLite (`better-sqlite3`)                              |
| **ORM**            | Drizzle ORM                                            |
| **Authentication** | Role-Based Access Control (RBAC) with Sessions / JWT   |
| **Data Fetching**  | TanStack Query                                         |

---

## Roles & Permissions

| Feature                               | Resident | Admin |
| ------------------------------------- | :------: | :---: |
| Register / Login                      |    Yes   |  Yes  |
| Raise Complaint                       |    Yes   |  Yes  |
| Upload Photo                          |    Yes   |  Yes  |
| View Own Complaints                   |    Yes   |  Yes  |
| View All Society Complaints           |    No    |  Yes  |
| Update Status                         |    No    |  Yes  |
| Set Priority                          |    No    |  Yes  |
| Manage & Pin Notices                  |    No    |  Yes  |
| View SLA Metrics & Workload Dashboard |    No    |  Yes  |

---

## Database Schema

Main entities:

* **`Users`** — Resident and administrator credentials, flat numbers, and roles.
* **`Societies`** — Residential community details.
* **`Complaints`** — Core ticket details, category, current state, priority, and photo references.
* **`Status History`** — Append-only log tracking every status transition, actor ID, timestamp, and admin remark.
* **`Notices`** — Society circulars and announcements with pinning capabilities.
* **`Notification Events`** — Event logging for complaint status changes and important notices.

---

## REST API Reference

### Authentication

```http
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

### Complaints

```http
GET   /api/complaints
POST  /api/complaints
GET   /api/complaints/:id
PATCH /api/complaints/:id/status
PATCH /api/complaints/:id/priority
```

### Notices & Analytics

```http
GET  /api/notices
POST /api/notices
GET  /api/analytics/overview
```

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/samiiksha-sahu/SocietyHub.git
cd SocietyHub
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory:

```env
PORT=3000
DATABASE_URL=file:./dev.db
JWT_SECRET=your_secret_key
```

### 4. Setup Database

Push the database schema and seed the default demo data:

```bash
npm run db:push
npm run db:seed
```

### 5. Start the Application

```bash
npm run dev
```

Open your browser at:

```text
http://localhost:3000
```

---

## Default Demo Credentials

| Role         | Email                  | Password      | Flat / Unit                |
| ------------ | ---------------------- | ------------- | -------------------------- |
| **Admin**    | `admin@society.com`    | `admin123`    | Facility Management Office |
| **Resident** | `resident@society.com` | `resident123` | Flat B-402, Wing B         |

> These credentials are intended for local development and testing only.

---

## Testing & Verification

Run the following commands before deployment:

```bash
# Run TypeScript static checks
npm run check

# Run test suite
npm run test

# Validate production build
npm run build
```

---

## Project Scope

The application covers:

* Resident complaint management
* Append-only complaint status history
* Priority management
* Configurable overdue SLA detection
* Complaint photo uploads
* Society notice board with pinned announcements
* Notification event logging
* Admin dashboard and operational reporting
* Role-based route and API access control

---

## Future Enhancements

* Mobile application
* WhatsApp and push notifications
* Visitor management and gate pass generation
* Amenity and clubhouse booking
* Maintenance bill payment integration
* Staff/vendor task assignment
* Multi-society tenant partitioning
* Cloud object storage for media

---

## License

This project is developed as part of a society maintenance tracker application assignment.

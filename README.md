# Society Maintenance Tracker

A full-stack residential society maintenance and complaint management platform that allows residents to raise and track complaints while enabling administrators to manage complaints, priorities, overdue issues, notices, and reporting.

## Features

### Resident

* Register and log in
* Raise maintenance complaints
* Select complaint category
* Add description and optional photo
* View submitted complaints
* Track complete complaint status history
* Receive email updates when complaint status changes
* Receive email updates for important society notices

### Admin

* View all complaints
* Filter complaints by category, status, or date
* Set complaint priority:

  * Low
  * Medium
  * High
* Update complaint status:

  * Open
  * In Progress
  * Resolved
* Add optional notes to status changes
* View complete complaint history
* Identify overdue complaints
* Publish society notices
* Pin important notices
* View complaint dashboard and reporting

## Complaint Lifecycle

```text
Open → In Progress → Resolved
```

Every status change records:

* Timestamp
* Actor
* Previous status
* New status
* Optional note

Once a complaint is marked as `Resolved`, it is closed.

## Overdue Detection

Complaints are checked against a configurable overdue threshold.

When a complaint remains open beyond the configured number of days, it is marked as overdue and surfaced at the top of the admin view.

## Tech Stack

| Layer          | Technology                            |
| -------------- | ------------------------------------- |
| Frontend       | React, TypeScript, Tailwind CSS, Vite |
| Backend        | Node.js, Express                      |
| Database       | SQLite                                |
| ORM            | Drizzle ORM                           |
| Authentication | Role-based authentication             |
| Data Fetching  | TanStack Query                        |

## Roles & Permissions

| Feature             | Resident | Admin |
| ------------------- | :------: | :---: |
| Register / Login    |    Yes   |  Yes  |
| Raise Complaint     |    Yes   |  Yes  |
| Upload Photo        |    Yes   |  Yes  |
| View Own Complaints |    Yes   |  Yes  |
| View All Complaints |    No    |  Yes  |
| Update Status       |    No    |  Yes  |
| Set Priority        |    No    |  Yes  |
| Manage Notices      |    No    |  Yes  |
| View Dashboard      |    No    |  Yes  |

## Database

Main entities:

```text
Users
Societies
Complaints
Status History
Notices
Notification Events
```

Complaint history is stored separately so every status change can be tracked with its timestamp, actor, and optional note.

## API

### Authentication

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

### Complaints

```text
GET   /api/complaints
POST  /api/complaints
GET   /api/complaints/:id
PATCH /api/complaints/:id/status
PATCH /api/complaints/:id/priority
```

### Notices & Analytics

```text
GET  /api/notices
POST /api/notices
GET  /api/analytics/overview
```

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

Create a `.env` file:

```env
PORT=3000
DATABASE_URL=file:./dev.db
JWT_SECRET=your_secret_key
```

### 4. Setup Database

```bash
npm run db:push
npm run db:seed
```

### 5. Start the Application

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Testing

Run:

```bash
npm run check
npm run test
npm run build
```

## Project Scope

The application covers:

* Resident complaint management
* Complaint status history
* Priority management
* Configurable overdue detection
* Complaint photo uploads
* Society notice board
* Important/pinned notices
* Email notification flow
* Admin dashboard and reporting
* Role-based access

## Future Enhancements

* Mobile application
* WhatsApp notifications
* Visitor management
* Amenity booking
* Maintenance payment management
* Staff/vendor assignment
* Multi-society support
* Cloud file storage
* Real-time notifications

---

## License

This project is developed as part of a society maintenance tracker application assignment.

CREATE TABLE `app_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`overdueThresholdDays` integer DEFAULT 3 NOT NULL,
	`updatedByUserId` integer,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `complaint_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`complaintId` integer NOT NULL,
	`previousStatus` text,
	`newStatus` text NOT NULL,
	`changedByUserId` integer NOT NULL,
	`adminNote` text,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `history_complaint_idx` ON `complaint_history` (`complaintId`);--> statement-breakpoint
CREATE TABLE `complaints` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`residentId` integer NOT NULL,
	`assignedAdminId` integer,
	`societyId` integer,
	`title` text NOT NULL,
	`category` text NOT NULL,
	`description` text NOT NULL,
	`photoUrl` text,
	`photoKey` text,
	`priority` text DEFAULT 'medium' NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`resolutionNote` text,
	`isOverdue` integer DEFAULT false NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `complaints_status_idx` ON `complaints` (`status`);--> statement-breakpoint
CREATE INDEX `complaints_resident_idx` ON `complaints` (`residentId`);--> statement-breakpoint
CREATE INDEX `complaints_overdue_idx` ON `complaints` (`isOverdue`);--> statement-breakpoint
CREATE TABLE `notices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`category` text NOT NULL,
	`isPinned` integer DEFAULT false NOT NULL,
	`authorId` integer NOT NULL,
	`societyId` integer,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `notification_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`eventType` text NOT NULL,
	`recipientEmail` text,
	`complaintId` integer,
	`noticeId` integer,
	`status` text DEFAULT 'fallback' NOT NULL,
	`message` text,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `societies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`area` text NOT NULL,
	`city` text NOT NULL,
	`totalWings` integer NOT NULL,
	`totalUnits` integer NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`openId` text NOT NULL,
	`name` text,
	`email` text,
	`passwordHash` text,
	`loginMethod` text,
	`role` text DEFAULT 'user' NOT NULL,
	`unit` text DEFAULT 'Unassigned',
	`wing` text,
	`flatNumber` text,
	`societyId` integer,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`lastSignedIn` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_openId_unique` ON `users` (`openId`);
import { integer, sqliteTable, text, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const societies = sqliteTable("societies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  area: text("area").notNull(),
  city: text("city").notNull(),
  totalWings: integer("totalWings").notNull(),
  totalUnits: integer("totalUnits").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).defaultNow().notNull(),
});

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  openId: text("openId").notNull().unique(),
  name: text("name"),
  email: text("email"),
  passwordHash: text("passwordHash"),
  loginMethod: text("loginMethod"),
  role: text("role", { enum: ["user", "admin"] }).default("user").notNull(),
  unit: text("unit").default("Unassigned"),
  wing: text("wing"),
  flatNumber: text("flatNumber"),
  societyId: integer("societyId"),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).defaultNow().notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).defaultNow().notNull(),
  lastSignedIn: integer("lastSignedIn", { mode: "timestamp_ms" }).defaultNow().notNull(),
});

export const complaints = sqliteTable("complaints", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  residentId: integer("residentId").notNull(),
  assignedAdminId: integer("assignedAdminId"),
  societyId: integer("societyId"),
  title: text("title").notNull(),
  category: text("category", { enum: ["plumbing", "electrical", "lift", "housekeeping", "security", "other"] }).notNull(),
  description: text("description").notNull(),
  photoUrl: text("photoUrl"),
  photoKey: text("photoKey"),
  priority: text("priority", { enum: ["low", "medium", "high"] }).default("medium").notNull(),
  status: text("status", { enum: ["open", "in_progress", "resolved"] }).default("open").notNull(),
  resolutionNote: text("resolutionNote"),
  isOverdue: integer("isOverdue", { mode: "boolean" }).default(false).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).defaultNow().notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).defaultNow().notNull(),
}, (table) => ({
  statusIdx: index("complaints_status_idx").on(table.status),
  residentIdx: index("complaints_resident_idx").on(table.residentId),
  overdueIdx: index("complaints_overdue_idx").on(table.isOverdue)
}));

export const complaintHistory = sqliteTable("complaint_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  complaintId: integer("complaintId").notNull(),
  previousStatus: text("previousStatus", { enum: ["open", "in_progress", "resolved"] }),
  newStatus: text("newStatus", { enum: ["open", "in_progress", "resolved"] }).notNull(),
  changedByUserId: integer("changedByUserId").notNull(),
  adminNote: text("adminNote"),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).defaultNow().notNull(),
}, (table) => ({
  complaintIdx: index("history_complaint_idx").on(table.complaintId)
}));

export const notices = sqliteTable("notices", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  body: text("body").notNull(),
  category: text("category", { enum: ["maintenance", "security", "community", "emergency"] }).notNull(),
  isPinned: integer("isPinned", { mode: "boolean" }).default(false).notNull(),
  authorId: integer("authorId").notNull(),
  societyId: integer("societyId"),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).defaultNow().notNull(),
});

export const notificationEvents = sqliteTable("notification_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  eventType: text("eventType", { enum: ["complaint_status", "notice_published", "owner_alert"] }).notNull(),
  recipientEmail: text("recipientEmail"),
  complaintId: integer("complaintId"),
  noticeId: integer("noticeId"),
  status: text("status", { enum: ["sent", "fallback", "failed"] }).default("fallback").notNull(),
  message: text("message"),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).defaultNow().notNull(),
});

export const appSettings = sqliteTable("app_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  overdueThresholdDays: integer("overdueThresholdDays").default(3).notNull(),
  updatedByUserId: integer("updatedByUserId"),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Complaint = typeof complaints.$inferSelect;
export type ComplaintHistory = typeof complaintHistory.$inferSelect;
export type Notice = typeof notices.$inferSelect;
export type Society = typeof societies.$inferSelect;

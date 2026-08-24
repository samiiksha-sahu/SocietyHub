import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { complaints, complaintHistory, InsertUser, notices, notificationEvents, appSettings, users, societies, Society } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const dbPath = process.env.DATABASE_URL.replace(/^file:/, "");
      const sqlite = new Database(dbPath);
      _db = drizzle(sqlite);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
    }
  }
  return _db;
}

export async function createSociety(name: string, area: string, city: string, totalWings: number, totalUnits: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const inserted = await db.insert(societies).values({ name, area, city, totalWings, totalUnits }).returning();
  return inserted[0];
}

export async function listSocieties() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(societies).orderBy(societies.name);
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0];
}

export async function createUser(user: InsertUser) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const inserted = await db.insert(users).values(user).returning();
  return inserted[0];
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = {
    openId: user.openId,
    name: user.name,
    email: user.email,
    loginMethod: user.loginMethod,
    lastSignedIn: user.lastSignedIn ?? new Date(),
    role: user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user"),
    unit: user.unit ?? "Unassigned",
  };
  await db.insert(users)
    .values(values)
    .onConflictDoUpdate({
      target: users.openId,
      set: {
        name: values.name,
        email: values.email,
        loginMethod: values.loginMethod,
        lastSignedIn: values.lastSignedIn,
      },
    });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select({
      user: users,
      societyName: societies.name,
    })
    .from(users)
    .leftJoin(societies, eq(users.societyId, societies.id))
    .where(eq(users.openId, openId))
    .limit(1);
  if (!result[0]) return undefined;
  return {
    ...result[0].user,
    societyName: result[0].societyName,
  };
}

export async function listComplaints(residentId?: number, societyId?: number) {
  const db = await getDb();
  if (!db) return [];
  
  let conditions = [];
  if (residentId) {
    conditions.push(eq(complaints.residentId, residentId));
  } else if (societyId) {
    conditions.push(eq(complaints.societyId, societyId));
  }
  
  const query = db.select({
    complaint: complaints,
    resident: users,
  })
  .from(complaints)
  .leftJoin(users, eq(complaints.residentId, users.id));
  
  const rows = conditions.length > 0 
    ? await query.where(and(...conditions)).orderBy(desc(complaints.isOverdue), desc(complaints.createdAt))
    : await query.orderBy(desc(complaints.isOverdue), desc(complaints.createdAt));

  return rows.map(r => ({
    ...r.complaint,
    residentName: r.resident?.name ?? "Resident",
    residentUnit: r.resident?.unit ?? "—",
    residentEmail: r.resident?.email ?? null,
  }));
}

export async function getComplaint(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select({
    complaint: complaints,
    resident: users,
  })
  .from(complaints)
  .leftJoin(users, eq(complaints.residentId, users.id))
  .where(eq(complaints.id, id))
  .limit(1);
  return rows[0] ? {
    ...rows[0].complaint,
    residentName: rows[0].resident?.name ?? "Resident",
    residentUnit: rows[0].resident?.unit ?? "—",
    residentEmail: rows[0].resident?.email ?? null,
  } : undefined;
}

export async function getHistory(complaintId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    history: complaintHistory,
    actor: users,
  })
  .from(complaintHistory)
  .leftJoin(users, eq(complaintHistory.changedByUserId, users.id))
  .where(eq(complaintHistory.complaintId, complaintId))
  .orderBy(asc(complaintHistory.createdAt));
}

export async function listNotices(societyId?: number) {
  const db = await getDb();
  if (!db) return [];
  const query = db.select({
    notice: notices,
    author: users,
  })
  .from(notices)
  .leftJoin(users, eq(notices.authorId, users.id));
  
  const rows = societyId
    ? await query.where(eq(notices.societyId, societyId)).orderBy(desc(notices.isPinned), desc(notices.createdAt))
    : await query.orderBy(desc(notices.isPinned), desc(notices.createdAt));
  return rows;
}

export async function listResidents(societyId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (societyId) {
    return db.select().from(users).where(and(eq(users.role, "user"), eq(users.societyId, societyId)));
  }
  return db.select().from(users).where(eq(users.role, "user"));
}

export async function getSettings() {
  const db = await getDb();
  if (!db) return { overdueThresholdDays: 3 };
  const rows = await db.select().from(appSettings).limit(1);
  return rows[0] ?? { overdueThresholdDays: 3 };
}

export async function recordNotification(event: typeof notificationEvents.$inferInsert) {
  const db = await getDb();
  if (!db) return;
  await db.insert(notificationEvents).values(event);
}

export async function listNotifications(recipientEmail?: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notificationEvents)
    .where(recipientEmail ? eq(notificationEvents.recipientEmail, recipientEmail) : undefined)
    .orderBy(desc(notificationEvents.createdAt))
    .limit(20);
}

export async function refreshOverdueFlags() {
  const db = await getDb();
  if (!db) return 0;
  const settings = await getSettings();
  const cutoff = new Date(Date.now() - settings.overdueThresholdDays * 86400000);
  const newlyOverdue = await db.select().from(complaints)
    .where(and(
      eq(complaints.isOverdue, false),
      sql`${complaints.status} <> 'resolved'`,
      sql`${complaints.createdAt} < ${cutoff}`
    ));
  await db.update(complaints).set({ isOverdue: true })
    .where(and(
      sql`${complaints.status} <> 'resolved'`,
      sql`${complaints.createdAt} < ${cutoff}`
    ));
  await db.update(complaints).set({ isOverdue: false })
    .where(eq(complaints.status, "resolved"));

  if (newlyOverdue.length) {
    const { notifyOwner } = await import("./_core/notification");
    for (const complaint of newlyOverdue) {
      const delivered = await notifyOwner({
        title: "Overdue maintenance complaint",
        content: `${complaint.title} has crossed the configured ${settings.overdueThresholdDays}-day SLA threshold.`,
      }).catch(() => false);
      await recordNotification({
        eventType: "owner_alert",
        complaintId: complaint.id,
        recipientEmail: null,
        status: delivered ? "sent" : "fallback",
        message: "Owner alert for overdue complaint",
      });
    }
  }
  return newlyOverdue.length;
}

export async function analytics() {
  const db = await getDb();
  if (!db) {
    return {
      total: 0,
      open: 0,
      inProgress: 0,
      resolved: 0,
      overdue: 0,
      byCategory: [],
      byPriority: [],
    };
  }
  await refreshOverdueFlags();
  const all = await db.select().from(complaints);
  const count = (fn: (c: typeof all[number]) => boolean) => all.filter(fn).length;
  const group = (key: "category" | "priority") =>
    Array.from(new Set(all.map(c => c[key]))).map(value => ({
      label: value,
      count: count(c => c[key] === value),
    }));
  return {
    total: all.length,
    open: count(c => c.status === "open"),
    inProgress: count(c => c.status === "in_progress"),
    resolved: count(c => c.status === "resolved"),
    overdue: count(c => c.isOverdue),
    byCategory: group("category"),
    byPriority: group("priority"),
  };
}

import Database from "better-sqlite3";
import dotenv from "dotenv";
import crypto from "crypto";
dotenv.config();

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");
const dbPath = url.replace(/^file:/, "");
const db = new Database(dbPath);

const now = Date.now();

function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

try {
  // Clear existing to ensure clean seed
  db.prepare("DELETE FROM app_settings").run();
  db.prepare("DELETE FROM users").run();
  db.prepare("DELETE FROM societies").run();
  db.prepare("DELETE FROM complaint_history").run();
  db.prepare("DELETE FROM complaints").run();
  db.prepare("DELETE FROM notices").run();
  db.prepare("DELETE FROM notification_events").run();

  // Setup default app settings if not exists
  db.prepare("INSERT INTO app_settings (overdueThresholdDays) VALUES (3)").run();

  // Seed default society
  db.prepare(`
    INSERT INTO societies (name, area, city, totalWings, totalUnits)
    VALUES ('Green Valley Heights', 'Whitefield', 'Bengaluru', 3, 150)
  `).run();
  const society = db.prepare("SELECT id FROM societies WHERE name='Green Valley Heights' LIMIT 1").get();
  const societyId = society.id;

  // Seed default users
  const insertUser = db.prepare(`
    INSERT OR REPLACE INTO users (openId, name, email, loginMethod, role, unit, wing, flatNumber, societyId, passwordHash) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertUser.run("seed-admin", "Anika Rao", "admin@society.com", "seed", "admin", "Society office", null, null, societyId, hashPassword("admin123"));
  insertUser.run("seed-resident-1", "Rohan Mehta", "resident@society.com", "seed", "user", "B-402", "B", "402", societyId, hashPassword("resident123"));
  insertUser.run("seed-resident-2", "Meera Shah", "meera@example.com", "seed", "user", "A-110", "A", "110", societyId, hashPassword("resident123"));
  insertUser.run("seed-resident-3", "Kabir Nair", "kabir@example.com", "seed", "user", "C-206", "C", "206", societyId, hashPassword("resident123"));

  const admin = db.prepare("SELECT id FROM users WHERE openId='seed-admin'").get();
  const r1 = db.prepare("SELECT id FROM users WHERE openId='seed-resident-1'").get();
  const r2 = db.prepare("SELECT id FROM users WHERE openId='seed-resident-2'").get();
  const r3 = db.prepare("SELECT id FROM users WHERE openId='seed-resident-3'").get();

  const insertComplaint = db.prepare(`
    INSERT INTO complaints (residentId, assignedAdminId, societyId, title, category, description, priority, status, isOverdue, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertHistory = db.prepare(`
    INSERT INTO complaint_history (complaintId, previousStatus, newStatus, changedByUserId, adminNote, createdAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const complaintsData = [
    { residentId: r1.id, adminId: admin.id, title: "Water pressure in kitchen", category: "plumbing", desc: "Water pressure has reduced significantly since yesterday evening. Please check the kitchen line and inlet valve.", priority: "medium", status: "in_progress", isOverdue: 0, ageDays: 1 },
    { residentId: r2.id, adminId: null, title: "Basement light outage", category: "electrical", desc: "The light near the visitor parking ramp is out, creating a safety concern after 8pm.", priority: "high", status: "open", isOverdue: 1, ageDays: 6 },
    { residentId: r3.id, adminId: admin.id, title: "Lift making a rattling sound", category: "lift", desc: "Lift 2 makes a sharp rattling sound between floors 3 and 5.", priority: "high", status: "resolved", isOverdue: 0, ageDays: 4 },
    { residentId: r1.id, adminId: null, title: "Deep cleaning request", category: "housekeeping", desc: "Requesting a deep clean of the common corridor outside B wing after the renovation work.", priority: "low", status: "open", isOverdue: 0, ageDays: 2 }
  ];

  for (const c of complaintsData) {
    const createdTime = now - c.ageDays * 86400000;
    const res = insertComplaint.run(c.residentId, c.adminId, societyId, c.title, c.category, c.desc, c.priority, c.status, c.isOverdue, createdTime, createdTime);
    const id = res.lastInsertRowid;

    insertHistory.run(id, null, "open", c.residentId, "Complaint submitted", createdTime);
    if (c.status !== "open") {
      const actor = admin.id;
      const note = c.status === "resolved" ? "Technician completed repair and verified on site." : "Assigned to the facility team for inspection.";
      insertHistory.run(id, "open", c.status, actor, note, createdTime + 3600000);
    }
  }

  // Seed Notices
  const insertNotice = db.prepare(`
    INSERT INTO notices (title, body, category, isPinned, authorId, societyId, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const created1 = now - 1 * 86400000;
  const created2 = now - 3 * 86400000;
  insertNotice.run("Planned water shutdown", "Water supply will be paused from 11:00 AM to 1:00 PM on Thursday for overhead tank maintenance. Please plan accordingly.", "maintenance", 1, admin.id, societyId, created1);
  insertNotice.run("Monsoon safety reminder", "Please keep balconies and common passages clear during heavy rain. Report any seepage through a new maintenance request.", "security", 0, admin.id, societyId, created2);

  // Seed Notification Events
  const insertEvent = db.prepare(`
    INSERT INTO notification_events (eventType, recipientEmail, status, message, createdAt)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertEvent.run("notice_published", "rohan@example.com", "fallback", "Planned water shutdown", created1);
  insertEvent.run("owner_alert", null, "fallback", "Seed owner alert: high-priority activity review", created1);

  console.log("Seed complete: society, users, complaints, history, notices, and notifications generated.");
} catch (err) {
  console.error("Seeding failed:", err);
  process.exit(1);
} finally {
  db.close();
}

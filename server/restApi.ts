import { Router, type Request, type Response } from "express";
import { eq, desc, and } from "drizzle-orm";
import { getDb } from "./db";
import { users, complaints, complaintHistory } from "../drizzle/schema";
import { sdk } from "./_core/sdk";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";

function sendError(res: Response, error: any) {
  const status = error?.code === "UNAUTHORIZED" ? 401 : error?.code === "FORBIDDEN" ? 403 : error?.code === "NOT_FOUND" ? 404 : 400;
  res.status(status).json({ error: error?.message ?? "Request failed" });
}

export function registerRestApi(app: Router) {
  const api = Router();
  const caller = async (req: Request, res: Response) => appRouter.createCaller(await createContext({ req: req as any, res: res as any, info: {} as any }));

  // GET /api/rest/complaints
  api.get("/complaints", async (req, res) => {
    try {
      res.json(await (await caller(req, res)).complaints.list());
    } catch (e) {
      sendError(res, e);
    }
  });

  // GET /api/rest/complaints/:id
  api.get("/complaints/:id", async (req, res) => {
    try {
      res.json(await (await caller(req, res)).complaints.detail({ id: Number(req.params.id) }));
    } catch (e) {
      sendError(res, e);
    }
  });

  // POST /api/rest/complaints
  api.post("/complaints", async (req, res) => {
    try {
      const result = await (await caller(req, res)).complaints.create(req.body);
      res.status(201).json(result);
    } catch (e) {
      sendError(res, e);
    }
  });

  // PATCH /api/rest/complaints/:id
  api.patch("/complaints/:id", async (req, res) => {
    try {
      const result = await (await caller(req, res)).complaints.update({ ...req.body, id: Number(req.params.id) });
      res.json(result);
    } catch (e) {
      sendError(res, e);
    }
  });

  api.get("/notices", async (req, res) => { try { res.json(await (await caller(req, res)).notices.list()); } catch (e) { sendError(res, e); } });
  api.post("/notices", async (req, res) => { try { const result = await (await caller(req, res)).notices.create(req.body); res.status(201).json(result); } catch (e) { sendError(res, e); } });
  api.get("/analytics", async (req, res) => { try { res.json(await (await caller(req, res)).analytics.overview()); } catch (e) { sendError(res, e); } });
  api.get("/societies", async (req, res) => { try { const { listSocieties } = await import("./db"); res.json(await listSocieties()); } catch (e) { sendError(res, e); } });
  
  app.use("/api/rest", api);
  
  // DIRECT /api PATH ROUTING

  // 1. GET /api/societies
  app.get("/api/societies", async (req, res) => {
    try {
      const { listSocieties } = await import("./db");
      res.json(await listSocieties());
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch societies" });
    }
  });

  // 2. POST /api/complaints
  app.post("/api/complaints", async (req, res) => {
    console.log("--> CREATE COMPLAINT BODY:", req.body);
    let user;
    try {
      user = await sdk.authenticateRequest(req);
      console.log("--> CURRENT USER:", user);
    } catch (e) {
      console.warn("--> AUTH FAILED:", e);
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { title, description, category, photoUrl } = req.body;
    if (!title || !description || !category) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      const dbInstance = await getDb();
      if (!dbInstance) {
        return res.status(500).json({ error: "Database not available" });
      }

      const societyId = user.societyId ?? 1;
      const cat = String(category).toLowerCase();

      const [inserted] = await dbInstance.insert(complaints).values({
        residentId: user.id,
        assignedAdminId: null,
        societyId,
        title,
        category: cat as any,
        description,
        photoUrl: photoUrl || null,
        photoKey: null,
        priority: "medium",
        status: "open",
        isOverdue: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();

      // Initial history row
      await dbInstance.insert(complaintHistory).values({
        complaintId: inserted.id,
        previousStatus: null,
        newStatus: "open",
        changedByUserId: user.id,
        adminNote: "Complaint created",
        createdAt: new Date(),
      });

      console.log(`[REST] Created complaint ID ${inserted.id} for user ${user.name}`);
      res.status(201).json(inserted);
    } catch (err: any) {
      console.error("--> DB INSERT ERROR:", err);
      res.status(400).json({ error: err.message || "Failed to create complaint" });
    }
  });

  // 3. GET /api/complaints
  app.get("/api/complaints", async (req, res) => {
    let user;
    try {
      user = await sdk.authenticateRequest(req);
    } catch (e) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const dbInstance = await getDb();
      if (!dbInstance) {
        return res.status(500).json({ error: "Database not available" });
      }

      let rows;
      if (user.role === "admin") {
        const societyId = user.societyId ?? 1;
        rows = await dbInstance
          .select({
            complaint: complaints,
            resident: users,
          })
          .from(complaints)
          .leftJoin(users, eq(complaints.residentId, users.id))
          .where(eq(complaints.societyId, societyId))
          .orderBy(desc(complaints.createdAt));
      } else {
        rows = await dbInstance
          .select({
            complaint: complaints,
            resident: users,
          })
          .from(complaints)
          .leftJoin(users, eq(complaints.residentId, users.id))
          .where(eq(complaints.residentId, user.id))
          .orderBy(desc(complaints.createdAt));
      }

      const result = rows.map(r => ({
        ...r.complaint,
        residentName: r.resident?.name ?? "Resident",
        residentUnit: r.resident?.unit ?? "—",
        residentEmail: r.resident?.email ?? null,
      }));

      console.log("--> RETRIEVING COMPLAINTS COUNT:", result.length);
      res.json(result);
    } catch (e: any) {
      console.error("[REST] Failed to fetch complaints:", e);
      res.status(500).json({ error: "Failed to fetch complaints" });
    }
  });

  // 4. GET /api/complaints/me
  app.get("/api/complaints/me", async (req, res) => {
    let user;
    try {
      user = await sdk.authenticateRequest(req);
    } catch (e) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const dbInstance = await getDb();
      if (!dbInstance) {
        return res.status(500).json({ error: "Database not available" });
      }

      const rows = await dbInstance
        .select({
          complaint: complaints,
          resident: users,
        })
        .from(complaints)
        .leftJoin(users, eq(complaints.residentId, users.id))
        .where(eq(complaints.residentId, user.id))
        .orderBy(desc(complaints.createdAt));

      const result = rows.map(r => ({
        ...r.complaint,
        residentName: r.resident?.name ?? "Resident",
        residentUnit: r.resident?.unit ?? "—",
        residentEmail: r.resident?.email ?? null,
      }));

      console.log("--> RETRIEVING COMPLAINTS COUNT:", result.length);
      res.json(result);
    } catch (e: any) {
      console.error("[REST] Failed to fetch complaints/me:", e);
      res.status(500).json({ error: "Failed to fetch complaints" });
    }
  });
}

import { COOKIE_NAME, ONE_YEAR_MS, OAUTH_STATE_COOKIE, decodeOAuthState } from "@shared/const";
import { parse as parseCookieHeader } from "cookie";
import type { Express, Request, Response } from "express";
import crypto from "crypto";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    // CSRF guard: the nonce in `state` must match the one-time cookie that
    // startLogin set in the browser that began this login. An attacker can
    // forge `state`, but cannot plant this cookie in the victim's browser.
    const { nonce } = decodeOAuthState(state);
    const expectedNonce = parseCookieHeader(req.headers.cookie ?? "")[OAUTH_STATE_COOKIE];
    if (!nonce || nonce !== expectedNonce) {
      res.status(403).json({ error: "invalid oauth state" });
      return;
    }
    res.clearCookie(OAUTH_STATE_COOKIE, { path: "/", secure: true, sameSite: "none" });

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    const { role, name, email, password } = req.body;
    if (!role || !name || !email || !password) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    try {
      const existingUser = await db.getUserByEmail(email);
      if (existingUser) {
        res.status(400).json({ error: "Email already in use" });
        return;
      }

      const passwordHash = crypto.createHash("sha256").update(password).digest("hex");
      const openId = `credentials_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

      let user;
      if (role === "admin") {
        const { societyName, area, city, totalWings, totalUnits } = req.body;
        if (!societyName || !area || !city || !totalWings || !totalUnits) {
          res.status(400).json({ error: "Missing society details" });
          return;
        }
        const society = await db.createSociety(societyName, area, city, Number(totalWings), Number(totalUnits));
        user = await db.createUser({
          openId,
          name,
          email,
          passwordHash,
          role: "admin",
          societyId: society.id,
          unit: "Society office",
        });
      } else {
        const { societyId, wing, flatNumber } = req.body;
        if (!societyId || !wing || !flatNumber) {
          res.status(400).json({ error: "Missing unit details" });
          return;
        }
        user = await db.createUser({
          openId,
          name,
          email,
          passwordHash,
          role: "user",
          societyId: Number(societyId),
          wing,
          flatNumber,
          unit: `${wing}-${flatNumber}`,
        });
      }

      const sessionToken = await sdk.createSessionToken(user.openId, {
        name: user.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({ success: true, token: sessionToken, redirect: role === "admin" ? "/dashboard/admin" : "/dashboard/resident" });
    } catch (error) {
      console.error("[Auth] Registration failed:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    try {
      const user = await db.getUserByEmail(email);
      if (!user) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }

      const hash = crypto.createHash("sha256").update(password).digest("hex");
      if (user.passwordHash !== hash) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }

      const sessionToken = await sdk.createSessionToken(user.openId, {
        name: user.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({ success: true, token: sessionToken, redirect: user.role === "admin" ? "/dashboard/admin" : "/dashboard/resident" });
    } catch (error) {
      console.error("[Auth] Login failed:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/logout", async (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    res.json({ success: true, redirect: "/login" });
  });

  app.post("/api/auth/dev-login", async (req: Request, res: Response) => {
    const { role } = req.body;
    if (!role) {
      res.status(400).json({ error: "Role is required" });
      return;
    }

    try {
      const dbInstance = await db.getDb();
      if (!dbInstance) {
        res.status(500).json({ error: "Database not available" });
        return;
      }

      const { users } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");

      const dbRole = role === "admin" ? "admin" : "user";
      const match = await dbInstance.select().from(users).where(eq(users.role, dbRole)).limit(1);
      const user = match[0];

      if (!user) {
        res.status(404).json({ error: `User with role ${role} not found. Did you run the database seed command?` });
        return;
      }

      const sessionToken = await sdk.createSessionToken(user.openId, {
        name: user.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({ success: true, token: sessionToken, redirect: "/" });
    } catch (error) {
      console.error("[Auth] Dev login bypass failed", error);
      res.status(500).json({ error: "Dev login bypass failed" });
    }
  });
}

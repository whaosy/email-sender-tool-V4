import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

function getBodyParam(req: Request, key: string): string | undefined {
  const value = (req.body as Record<string, unknown>)?.[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  /**
   * 本地登录 API
   * POST /api/auth/login
   * Body: { username: string, password: string }
   */
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const username = getBodyParam(req, "username");
      const password = getBodyParam(req, "password");

      if (!username || !password) {
        res.status(400).json({ error: "username and password are required" });
        return;
      }

      // 验证用户密码
      const isValid = await db.verifyUserPassword(username, password);
      if (!isValid) {
        res.status(401).json({ error: "Invalid username or password" });
        return;
      }

      // 获取用户信息
      const user = await db.getUserByUsername(username);
      if (!user) {
        res.status(401).json({ error: "User not found" });
        return;
      }

      // 创建会话 token
      const sessionToken = await sdk.createSessionToken(user.id, user.username, {
        expiresInMs: ONE_YEAR_MS,
      });

      // 设置 cookie
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      // 返回用户信息
      res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      console.error("[Auth] Login failed", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  /**
   * 登出 API
   * POST /api/auth/logout
   */
  app.post("/api/auth/logout", async (req: Request, res: Response) => {
    try {
      res.clearCookie(COOKIE_NAME);
      res.json({ success: true });
    } catch (error) {
      console.error("[Auth] Logout failed", error);
      res.status(500).json({ error: "Logout failed" });
    }
  });
}

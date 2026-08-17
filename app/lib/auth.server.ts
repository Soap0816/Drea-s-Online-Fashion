import { createCookieSessionStorage, redirect } from "@remix-run/cloudflare";
import bcrypt from "bcryptjs";
import type { Env } from "./env.server";

/**
 * Session storage is created per-request because the signing secret comes
 * from a Cloudflare binding (env.SESSION_SECRET), which is only available
 * once a request arrives — it can't be read at module load time the way a
 * Node .env var could be.
 *
 * IMPORTANT: set a real SESSION_SECRET in production with
 *   wrangler pages secret put SESSION_SECRET
 * The fallback below only exists so local dev works before you've set one;
 * it is NOT safe to deploy with.
 */
function getSessionStorage(env: Env) {
  return createCookieSessionStorage({
    cookie: {
      name: "drea_admin_session",
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secrets: [env.SESSION_SECRET || "dev-only-insecure-secret-change-me"],
      secure: true,
      maxAge: 60 * 60 * 24 * 7, // 7 days
    },
  });
}

export interface AdminUser {
  id: number;
  email: string;
  name: string | null;
}

export async function findAdminByEmail(env: Env, email: string) {
  return env.DB.prepare(`SELECT * FROM admin_users WHERE email = ?`)
    .bind(email.trim().toLowerCase())
    .first<{ id: number; email: string; password_hash: string; name: string | null }>();
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function createAdminSession(env: Env, adminId: number, redirectTo: string) {
  const storage = getSessionStorage(env);
  const session = await storage.getSession();
  session.set("adminId", adminId);
  return redirect(redirectTo, {
    headers: { "Set-Cookie": await storage.commitSession(session) },
  });
}

export async function getAdminId(request: Request, env: Env): Promise<number | null> {
  const storage = getSessionStorage(env);
  const session = await storage.getSession(request.headers.get("Cookie"));
  const id = session.get("adminId");
  return typeof id === "number" ? id : null;
}

/** Call at the top of any admin loader/action. Throws a redirect to /admin/login if not authenticated. */
export async function requireAdmin(request: Request, env: Env): Promise<AdminUser> {
  const adminId = await getAdminId(request, env);
  if (!adminId) {
    const url = new URL(request.url);
    throw redirect(`/admin/login?redirectTo=${encodeURIComponent(url.pathname)}`);
  }
  const admin = await env.DB.prepare(`SELECT id, email, name FROM admin_users WHERE id = ?`)
    .bind(adminId)
    .first<AdminUser>();
  if (!admin) {
    throw redirect("/admin/login");
  }
  return admin;
}

export async function destroyAdminSession(request: Request, env: Env) {
  const storage = getSessionStorage(env);
  const session = await storage.getSession(request.headers.get("Cookie"));
  return redirect("/admin/login", {
    headers: { "Set-Cookie": await storage.destroySession(session) },
  });
}

export async function touchLastLogin(env: Env, adminId: number) {
  await env.DB.prepare(`UPDATE admin_users SET last_login_at = datetime('now') WHERE id = ?`)
    .bind(adminId)
    .run();
}

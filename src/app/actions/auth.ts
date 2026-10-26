"use server";

import { randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_MEMBER_ID } from "@/lib/server/auth";
import { env } from "@/lib/server/env";
import { ADMIN_COOKIE, SESSION_COOKIE, adminFingerprint, createSessionToken, isAdminPassword, sessionCookieOptions } from "@/lib/server/session";
import { getStore } from "@/lib/server/store";

export type AuthResult = { ok: false; error: string } | { ok: true };

// Best-effort brute-force brake (per server instance): 5 wrong passwords per IP per 10 minutes.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_FAILURES = 5;
const failures = new Map<string, number[]>();

async function clientKey() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

export async function adminLogin(_: AuthResult | null, form: FormData): Promise<AuthResult> {
  if (!env.adminPassword) return { ok: false, error: "Admin access is not configured. Set ADMIN_PASSWORD on the server." };
  const key = await clientKey();
  const now = Date.now();
  const recent = (failures.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_FAILURES) return { ok: false, error: "Too many wrong attempts. Try again in a few minutes." };

  const password = form.get("password");
  if (typeof password !== "string" || !isAdminPassword(password)) {
    failures.set(key, [...recent, now]);
    await new Promise((r) => setTimeout(r, 400));
    return { ok: false, error: "Admin password is incorrect." };
  }
  failures.delete(key);
  try {
    const jar = await cookies();
    jar.set(ADMIN_COOKIE, createSessionToken(`admin-${adminFingerprint()}`), sessionCookieOptions);
    jar.delete(SESSION_COOKIE);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  const store = getStore();
  const adminExists = (await store.snapshot()).members.some((m) => m.id === ADMIN_MEMBER_ID);
  await store.apply([
    { op: "insert", c: "auditEvents", row: { id: randomUUID(), actorId: adminExists ? ADMIN_MEMBER_ID : null, action: "admin.signin", entity: "member", entityId: ADMIN_MEMBER_ID, summary: "Administrator signed in", href: "/admin", createdAt: new Date().toISOString() } },
  ]);
  redirect("/admin");
}

/** Local/demo mode only: act as one of the clearly labeled demo personas. */
export async function loginAsDemo(memberId: string): Promise<AuthResult> {
  if (!env.demoAccounts) return { ok: false, error: "Demo accounts are disabled on this deployment." };
  const db = await getStore().snapshot();
  const m = db.members.find((x) => x.id === memberId && x.isDemo && x.active);
  if (!m) return { ok: false, error: "Demo account not found." };
  try {
    const jar = await cookies();
    jar.set(SESSION_COOKIE, createSessionToken(m.id), sessionCookieOptions);
    jar.delete(ADMIN_COOKIE);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  redirect("/");
}

export async function logout() {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
  jar.delete(SESSION_COOKIE);
  redirect("/");
}

import "server-only";
import { createHmac, randomBytes, scryptSync, timingSafeEqual, createHash } from "node:crypto";
import { env } from "./env";

export const SESSION_COOKIE = "lacc_session";

export const ADMIN_COOKIE = "lacc_admin";

/** Ties admin sessions to the current password, so changing ADMIN_PASSWORD signs every admin out. */
export const adminFingerprint = () => (env.adminPassword ? createHash("sha256").update(`admin:${env.adminPassword}`).digest("hex").slice(0, 16) : null);

/** Constant-time check of the shared admin password (false when ADMIN_PASSWORD is unset). */
export function isAdminPassword(input: string | null | undefined) {
  if (!env.adminPassword || !input) return false;
  const digest = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(digest(input), digest(env.adminPassword));
}
const MAX_AGE_S = 60 * 60 * 24 * 14;
const DEV_SECRET = "dev-only-insecure-secret-change-me";

function secret() {
  if (env.sessionSecret) return env.sessionSecret;
  if (env.isProduction) throw new Error("SESSION_SECRET must be set in production for local (non-Supabase) sessions.");
  return DEV_SECRET;
}

const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

export function createSessionToken(memberId: string, now = Date.now()) {
  const payload = `${memberId}.${Math.floor(now / 1000)}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined, now = Date.now()): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [memberId, issued, mac] = parts;
  const expected = sign(`${memberId}.${issued}`);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (now / 1000 - Number(issued) > MAX_AGE_S) return null;
  return memberId;
}

export const sessionCookieOptions = { httpOnly: true, sameSite: "lax" as const, secure: env.isProduction, path: "/", maxAge: MAX_AGE_S };

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string | null | undefined) {
  if (!stored?.startsWith("scrypt:")) return false;
  const [, salt, hash] = stored.split(":");
  const candidate = scryptSync(password, salt, 64);
  const known = Buffer.from(hash, "hex");
  return known.length === candidate.length && timingSafeEqual(known, candidate);
}

export const newInviteToken = () => randomBytes(24).toString("base64url");
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import type { Member } from "@/lib/domain/types";
import { GUEST_ID } from "@/lib/guest";
import { env } from "./env";
import { ADMIN_COOKIE, SESSION_COOKIE, adminFingerprint, verifySessionToken } from "./session";
import { getStore } from "./store";

/**
 * Everyone can read the workspace without an account. Visitors act as a read-only
 * guest; entering the admin password grants the Administrator identity, which is the
 * only way to add or change data (plus the labeled demo personas in local mode).
 */
export { GUEST_ID };
export const ADMIN_MEMBER_ID = "00000000-0000-4000-8000-0000000000ad";

const EPOCH = "2026-10-25T12:00:00.000Z";

export const GUEST: Member = {
  id: GUEST_ID,
  name: "Guest",
  email: "",
  passwordHash: null,
  role: "viewer",
  isDemo: false,
  primaryTrackId: null,
  secondaryTrackId: null,
  leadTrackIds: [],
  githubUsername: null,
  discordHandle: null,
  skills: [],
  experience: "new",
  availabilityHours: 0,
  bio: "",
  avatarColor: "#475569",
  active: true,
  createdAt: EPOCH,
  updatedAt: EPOCH,
};

export const isGuest = (m: Pick<Member, "id">) => m.id === GUEST_ID;

/** Resolves who is making this request: the administrator, a local demo persona, or the guest. */
export const getActor = cache(async (): Promise<Member> => {
  const jar = await cookies();
  let adminToken: string | null = null;
  try {
    adminToken = verifySessionToken(jar.get(ADMIN_COOKIE)?.value);
  } catch {
    // SESSION_SECRET missing in production: nobody can hold an admin session.
  }
  const fp = adminFingerprint();
  if (fp && adminToken === `admin-${fp}`) return ensureAdminMember();

  if (env.demoAccounts) {
    let memberId: string | null = null;
    try {
      memberId = verifySessionToken(jar.get(SESSION_COOKIE)?.value);
    } catch {
      memberId = null;
    }
    if (memberId) {
      const db = await getStore().snapshot();
      const m = db.members.find((x) => x.id === memberId && x.isDemo && x.active);
      if (m) return m;
    }
  }
  return GUEST;
});

export const requireActor = getActor;

/** The single Administrator record that admin-made changes are attributed to. */
async function ensureAdminMember(): Promise<Member> {
  const store = getStore();
  const existing = (await store.snapshot()).members.find((m) => m.id === ADMIN_MEMBER_ID);
  if (existing) return { ...existing, role: "admin", active: true };
  return store.exclusive(async () => {
    const found = (await store.snapshot()).members.find((m) => m.id === ADMIN_MEMBER_ID);
    if (found) return found;
    const now = new Date().toISOString();
    const admin: Member = { ...GUEST, id: ADMIN_MEMBER_ID, name: "Administrator", role: "admin", avatarColor: "#ef4444", bio: "Signed in with the admin password.", createdAt: now, updatedAt: now };
    await store.apply([{ op: "insert", c: "members", row: admin as never }]);
    return admin;
  });
}

export function pickColor(seed: string) {
  const palette = ["#38bdf8", "#a78bfa", "#34d399", "#f59e0b", "#f472b6", "#ef4444", "#22d3ee", "#84cc16", "#fb923c"];
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return palette[h % palette.length];
}

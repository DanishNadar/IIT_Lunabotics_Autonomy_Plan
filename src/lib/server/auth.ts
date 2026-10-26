import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Member } from "@/lib/domain/types";
import { env, supabaseConfigured } from "./env";
import { SESSION_COOKIE, verifySessionToken } from "./session";
import { getStore } from "./store";
import { supabaseServerClient } from "./supabase-auth";

export const authMode = () => (supabaseConfigured() ? ("supabase" as const) : ("local" as const));

/** Resolves the signed-in member for this request, or null. */
export const getActor = cache(async (): Promise<Member | null> => {
  const store = getStore();
  if (authMode() === "supabase") {
    const sb = await supabaseServerClient();
    const { data } = await sb.auth.getUser();
    const user = data.user;
    if (!user) return null;
    const db = await store.snapshot();
    const existing = db.members.find((m) => m.id === user.id);
    if (existing) return existing.active ? existing : null;
    return ensureProfile(user.id, user.email ?? "", (user.user_metadata?.full_name as string) || (user.user_metadata?.user_name as string) || user.email?.split("@")[0] || "New member", (user.user_metadata?.user_name as string) ?? null);
  }
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  let memberId: string | null = null;
  try {
    memberId = verifySessionToken(token);
  } catch {
    return null;
  }
  if (!memberId) return null;
  const db = await store.snapshot();
  const m = db.members.find((x) => x.id === memberId);
  if (!m || !m.active) return null;
  if (m.isDemo && !env.demoAccounts) return null;
  return m;
});

export async function requireActor(): Promise<Member> {
  const actor = await getActor();
  if (!actor) redirect("/login");
  return actor;
}

/**
 * Creates a profile for a first-time Supabase user. Role comes from an accepted
 * invitation, ADMIN_EMAILS, or defaults to member.
 */
async function ensureProfile(id: string, email: string, name: string, github: string | null): Promise<Member> {
  const store = getStore();
  return store.exclusive(async () => {
    const db = await store.snapshot();
    const found = db.members.find((m) => m.id === id);
    if (found) return found;
    const now = new Date().toISOString();
    const invite = db.invitations.find((i) => i.email.toLowerCase() === email.toLowerCase() && !i.acceptedAt);
    const role = env.adminEmails.includes(email.toLowerCase()) ? "admin" : invite?.role ?? "member";
    const member: Member = {
      id,
      name,
      email,
      passwordHash: null,
      role,
      isDemo: false,
      primaryTrackId: null,
      secondaryTrackId: null,
      leadTrackIds: invite?.leadTrackIds ?? [],
      githubUsername: github,
      discordHandle: null,
      skills: [],
      experience: "new",
      availabilityHours: 5,
      bio: "",
      avatarColor: pickColor(id),
      active: true,
      createdAt: now,
      updatedAt: now,
    };
    const ops: import("@/lib/domain/ops").Op[] = [{ op: "insert", c: "members", row: member as never }];
    if (invite) ops.push({ op: "update", c: "invitations", id: invite.id, patch: { acceptedAt: now } });
    await store.apply(ops);
    return member;
  });
}

export function pickColor(seed: string) {
  const palette = ["#38bdf8", "#a78bfa", "#34d399", "#f59e0b", "#f472b6", "#ef4444", "#22d3ee", "#84cc16", "#fb923c"];
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return palette[h % palette.length];
}

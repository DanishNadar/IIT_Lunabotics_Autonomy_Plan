"use server";

import { randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { authorize } from "@/lib/domain/permissions";
import { ROLES, TRACK_IDS, type Member } from "@/lib/domain/types";
import { authMode, getActor, pickColor } from "@/lib/server/auth";
import { appOrigin, env } from "@/lib/server/env";
import { SESSION_COOKIE, createSessionToken, hashPassword, hashToken, newInviteToken, sessionCookieOptions, verifyPassword } from "@/lib/server/session";
import { getStore } from "@/lib/server/store";
import { supabaseServerClient } from "@/lib/server/supabase-auth";

export type AuthResult = { ok: false; error: string } | { ok: true; link?: string };

async function setSession(memberId: string) {
  (await cookies()).set(SESSION_COOKIE, createSessionToken(memberId), sessionCookieOptions);
}

export async function loginAsDemo(memberId: string): Promise<AuthResult> {
  if (authMode() !== "local" || !env.demoAccounts) return { ok: false, error: "Demo accounts are disabled on this deployment." };
  const db = await getStore().snapshot();
  const m = db.members.find((x) => x.id === memberId && x.isDemo && x.active);
  if (!m) return { ok: false, error: "Demo account not found." };
  try {
    await setSession(m.id);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  redirect("/");
}

const credentials = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(8, "Password must be at least 8 characters").max(200) });

export async function loginWithPassword(_: AuthResult | null, form: FormData): Promise<AuthResult> {
  const parsed = credentials.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { email, password } = parsed.data;
  if (authMode() === "supabase") {
    const sb = await supabaseServerClient();
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: error.message };
    redirect("/");
  }
  const db = await getStore().snapshot();
  const m = db.members.find((x) => x.email.toLowerCase() === email && !x.isDemo);
  if (!m || !verifyPassword(password, m.passwordHash)) return { ok: false, error: "Email or password is incorrect." };
  if (!m.active) return { ok: false, error: "This account has been deactivated." };
  try {
    await setSession(m.id);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  redirect("/");
}

const registration = credentials.extend({ name: z.string().trim().min(2).max(80), invite: z.string().optional() });

export async function register(_: AuthResult | null, form: FormData): Promise<AuthResult> {
  const parsed = registration.safeParse({ email: form.get("email"), password: form.get("password"), name: form.get("name"), invite: form.get("invite") || undefined });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { email, password, name, invite } = parsed.data;
  const store = getStore();

  if (authMode() === "supabase") {
    const sb = await supabaseServerClient();
    const origin = appOrigin((await headers()).get("origin"));
    const { error } = await sb.auth.signUp({ email, password, options: { data: { full_name: name }, emailRedirectTo: `${origin}/auth/callback` } });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  const result = await store.exclusive(async () => {
    const db = await store.snapshot();
    if (db.members.some((m) => m.email.toLowerCase() === email)) return { ok: false as const, error: "An account with that email already exists." };
    const inv = invite ? db.invitations.find((i) => i.tokenHash === hashToken(invite) && !i.acceptedAt) : undefined;
    if (invite && !inv) return { ok: false as const, error: "Invitation link is invalid or already used." };
    if (inv && inv.email.toLowerCase() !== email) return { ok: false as const, error: "Use the email address the invitation was sent to." };
    if (!inv && !db.settings[0]?.allowSelfRegistration) return { ok: false as const, error: "Registration requires an invitation." };
    const hasRealAdmin = db.members.some((m) => !m.isDemo && m.role === "admin");
    // Bootstrap: ADMIN_EMAILS, otherwise the first real account becomes administrator.
    const role = env.adminEmails.includes(email) || (!env.adminEmails.length && !hasRealAdmin) ? "admin" : inv?.role ?? "member";
    const now = new Date().toISOString();
    const id = randomUUID();
    const member: Member = {
      id, name, email, passwordHash: hashPassword(password), role, isDemo: false, primaryTrackId: null, secondaryTrackId: null,
      leadTrackIds: inv?.leadTrackIds ?? [], githubUsername: null, discordHandle: null, skills: [], experience: "new",
      availabilityHours: 5, bio: "", avatarColor: pickColor(id), active: true, createdAt: now, updatedAt: now,
    };
    const ops: import("@/lib/domain/ops").Op[] = [
      { op: "insert", c: "members", row: member as never },
      { op: "insert", c: "auditEvents", row: { id: randomUUID(), actorId: id, action: "member.register", entity: "member", entityId: id, summary: `${name} joined as ${role}`, href: `/team/${id}`, createdAt: now } },
    ];
    if (inv) ops.push({ op: "update", c: "invitations", id: inv.id, patch: { acceptedAt: now } });
    await store.apply(ops);
    return { ok: true as const, id };
  });
  if (!result.ok) return result;
  try {
    await setSession(result.id);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  redirect("/my-work");
}

export async function signInWithGithub(): Promise<AuthResult> {
  if (authMode() !== "supabase" || !env.githubOAuthEnabled) return { ok: false, error: "GitHub sign-in is not configured." };
  const sb = await supabaseServerClient();
  const origin = appOrigin((await headers()).get("origin"));
  const { data, error } = await sb.auth.signInWithOAuth({ provider: "github", options: { redirectTo: `${origin}/auth/callback`, scopes: "read:user user:email" } });
  if (error || !data.url) return { ok: false, error: error?.message ?? "Could not start GitHub sign-in." };
  redirect(data.url);
}

export async function logout() {
  if (authMode() === "supabase") {
    const sb = await supabaseServerClient();
    await sb.auth.signOut();
  }
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}

const inviteInput = z.object({ email: z.string().trim().toLowerCase().email(), role: z.enum(ROLES), leadTrackIds: z.array(z.enum(TRACK_IDS as [string, ...string[]])).default([]) });

/** Creates an invitation. Local mode returns a one-time link; Supabase mode sends an email invite. */
export async function createInvitation(input: z.input<typeof inviteInput>): Promise<AuthResult> {
  const actor = await getActor();
  const check = authorize(actor, "member.manage");
  if (!check.ok) return { ok: false, error: check.reason };
  const parsed = inviteInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const store = getStore();
  const token = newInviteToken();
  const now = new Date().toISOString();
  await store.exclusive(async () => {
    await store.apply([
      { op: "insert", c: "invitations", row: { id: randomUUID(), email: parsed.data.email, role: parsed.data.role, leadTrackIds: parsed.data.leadTrackIds, tokenHash: hashToken(token), createdBy: actor!.id, createdAt: now, acceptedAt: null } },
      { op: "insert", c: "auditEvents", row: { id: randomUUID(), actorId: actor!.id, action: "member.invite", entity: "invitation", entityId: parsed.data.email, summary: `invited ${parsed.data.email} as ${parsed.data.role}`, href: "/admin", createdAt: now } },
    ]);
  });
  const origin = appOrigin((await headers()).get("origin"));
  if (authMode() === "supabase") {
    const { createClient } = await import("@supabase/supabase-js");
    const admin = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, { auth: { persistSession: false } });
    const { error } = await admin.auth.admin.inviteUserByEmail(parsed.data.email, { redirectTo: `${origin}/auth/callback` });
    if (error) return { ok: false, error: `Invitation recorded, but the email failed: ${error.message}` };
    return { ok: true };
  }
  return { ok: true, link: `${origin}/login?invite=${token}&email=${encodeURIComponent(parsed.data.email)}` };
}

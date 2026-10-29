"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { z } from "zod";
import { assignmentDigest, renderAssignmentEmail } from "@/lib/domain/email";
import { authorize } from "@/lib/domain/permissions";
import { getActor } from "@/lib/server/auth";
import { sendEmail } from "@/lib/server/email";
import { emailConfigured } from "@/lib/server/env";
import { getStore } from "@/lib/server/store";

const input = z.object({ memberIds: z.array(z.string().min(1).max(64)).min(1).max(50), note: z.string().trim().max(2000).default("") });

export type EmailResult = { ok: true; sent: string[]; skipped: { name: string; reason: string }[] } | { ok: false; error: string };

/** Emails each selected member the list of tasks they're on. Administrators only. */
export async function sendAssignmentEmails(raw: { memberIds: string[]; note?: string }): Promise<EmailResult> {
  const actor = await getActor();
  const auth = authorize(actor, "member.manage");
  if (!auth.ok) return { ok: false, error: "Only an administrator can send emails." };
  if (!emailConfigured()) return { ok: false, error: "Email sending isn't set up on this server. Use \"Open in my email app\" instead, or ask whoever manages hosting to add GMAIL_USER and GMAIL_APP_PASSWORD." };
  const parsed = input.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Pick between 1 and 50 people." };

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const baseUrl = `${proto}://${host}`;

  const store = getStore();
  const db = await store.snapshot();
  const team = `${db.settings[0].organization} autonomy`;
  const sent: string[] = [];
  const skipped: { name: string; reason: string }[] = [];
  for (const id of new Set(parsed.data.memberIds)) {
    const m = db.members.find((x) => x.id === id);
    const d = assignmentDigest(db, id);
    if (!m || !d) continue;
    if (!m.active) { skipped.push({ name: m.name, reason: "deactivated" }); continue; }
    if (!m.email) { skipped.push({ name: m.name, reason: "no email address saved" }); continue; }
    if (!d.items.length) { skipped.push({ name: m.name, reason: "no open tasks" }); continue; }
    const r = await sendEmail({ to: m.email, ...renderAssignmentEmail(d, { baseUrl, team, note: parsed.data.note }) });
    if (r.ok) sent.push(m.name);
    else skipped.push({ name: m.name, reason: r.error });
  }
  if (sent.length) {
    await store.apply([
      { op: "insert", c: "auditEvents", row: { id: randomUUID(), actorId: actor.id, action: "email.assignments", entity: "member", entityId: actor.id, summary: `emailed task lists to ${sent.join(", ")}`, href: "/admin", createdAt: new Date().toISOString() } },
    ]);
  }
  return { ok: true, sent, skipped };
}

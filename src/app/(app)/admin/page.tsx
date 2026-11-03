import { assignmentDigest } from "@/lib/domain/email";
import { summarizeTasks } from "@/lib/domain/views";
import { ADMIN_MEMBER_ID } from "@/lib/server/auth";
import { emailConfigured, env, supabaseConfigured } from "@/lib/server/env";
import { loadContext, publicMembers } from "@/lib/server/data";
import { getStore } from "@/lib/server/store";
import { ROLE_LABEL } from "@/lib/domain/types";
import { AdminClient } from "./admin-client";
import { AdminUnlock } from "./admin-unlock";

export const metadata = { title: "Administration", robots: { index: false, follow: false } };

export default async function AdminPage() {
  const { db, actor } = await loadContext();
  const store = getStore();
  if (actor.role !== "admin") {
    const demo = env.demoAccounts ? db.members.filter((m) => m.isDemo && m.active).map((m) => ({ id: m.id, name: m.name, role: ROLE_LABEL[m.role], color: m.avatarColor, bio: m.bio })) : [];
    return (
      <div className="mx-auto max-w-[920px] p-4 pt-10">
        <AdminUnlock demo={demo} configured={!!env.adminPassword} />
      </div>
    );
  }
  const people = db.members.filter((m) => m.active && m.id !== ADMIN_MEMBER_ID);
  const openTask = new Map(db.tasks.filter((t) => !t.archived && t.status !== "completed").map((t) => [t.id, t.key]));
  // Latest assignments, grouped per person when they were made within a few minutes of each other.
  const recent: { personId: string; keys: string[]; at: string }[] = [];
  for (const a of [...db.assignments].sort((x, y) => y.createdAt.localeCompare(x.createdAt))) {
    const key = openTask.get(a.taskId);
    if (!key || !people.some((m) => m.id === a.memberId)) continue;
    const last = recent.at(-1);
    if (last && last.personId === a.memberId && Date.parse(last.at) - Date.parse(a.createdAt) < 10 * 60_000) last.keys.unshift(key);
    else if (recent.length < 8) recent.push({ personId: a.memberId, keys: [key], at: a.createdAt });
    else break;
  }
  return (
    <AdminClient
      members={publicMembers(db, actor)}
      tasks={summarizeTasks(db, (t) => !t.archived)}
      emailLog={db.auditEvents
        .filter((e) => e.action === "email.sent" || e.action === "email.failed")
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 40)
        .map((e) => ({ id: e.id, memberId: e.entityId, ok: e.action === "email.sent", summary: e.summary, createdAt: e.createdAt }))}
      recent={recent}
      digests={people.map((m) => assignmentDigest(db, m.id)!).filter(Boolean)}
      people={people.map((m) => ({ id: m.id, name: m.name, color: m.avatarColor, role: m.role, primaryTrackId: m.primaryTrackId, experience: m.experience, availabilityHours: m.availabilityHours, isDemo: m.isDemo, email: m.email }))}
      settings={db.settings[0]}
      integrations={{
        storage: { kind: store.kind, description: store.description, shared: store.shared },
        supabase: supabaseConfigured(),
        githubToken: !!env.githubToken,
        adminPassword: !!env.adminPassword,
        discord: !!env.discordWebhookUrl,
        demoAccounts: env.demoAccounts,
        sessionSecret: !!env.sessionSecret,
        email: emailConfigured(),
      }}
      counts={{ tasks: db.tasks.length, resources: db.resources.length, documents: db.documents.length, audit: db.auditEvents.length }}
    />
  );
}

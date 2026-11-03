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
  return (
    <AdminClient
      members={publicMembers(db, actor)}
      tasks={summarizeTasks(db, (t) => !t.archived)}
      emailLog={db.auditEvents
        .filter((e) => e.action === "email.sent" || e.action === "email.failed")
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 40)
        .map((e) => ({ id: e.id, memberId: e.entityId, ok: e.action === "email.sent", summary: e.summary, createdAt: e.createdAt }))}
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

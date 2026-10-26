import { redirect } from "next/navigation";
import { env, supabaseConfigured } from "@/lib/server/env";
import { loadContext, publicMembers } from "@/lib/server/data";
import { getStore } from "@/lib/server/store";
import { AdminClient } from "./admin-client";

export const metadata = { title: "Administration" };

export default async function AdminPage() {
  const { db, actor } = await loadContext();
  if (actor.role !== "admin") redirect("/");
  const store = getStore();
  return (
    <AdminClient
      members={publicMembers(db, actor)}
      settings={db.settings[0]}
      invitations={db.invitations.map(({ tokenHash: _t, ...i }) => { void _t; return i; })}
      integrations={{
        storage: { kind: store.kind, description: store.description, shared: store.shared },
        supabase: supabaseConfigured(),
        githubToken: !!env.githubToken,
        githubOAuth: env.githubOAuthEnabled,
        discord: !!env.discordWebhookUrl,
        demoAccounts: env.demoAccounts,
        sessionSecret: !!env.sessionSecret,
      }}
      counts={{ tasks: db.tasks.length, resources: db.resources.length, documents: db.documents.length, audit: db.auditEvents.length }}
    />
  );
}

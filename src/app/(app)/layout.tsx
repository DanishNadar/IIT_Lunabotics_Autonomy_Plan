import { AppShell } from "@/components/shell/app-shell";
import { WorkspaceProvider } from "@/components/workspace";
import { env } from "@/lib/server/env";
import { loadContext, publicMember, publicMembers } from "@/lib/server/data";
import { getStore } from "@/lib/server/store";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { db, actor } = await loadContext();
  const store = getStore();
  const settings = db.settings[0];
  const unread = db.notifications.filter((n) => n.memberId === actor.id && !n.read).length;
  const myActive = db.assignments.filter((a) => a.memberId === actor.id && db.tasks.some((t) => t.id === a.taskId && t.status !== "completed")).length;
  const reviewQueue = db.tasks.filter((t) => t.status === "in_review" && (t.reviewerId === actor.id || (!t.reviewerId && actor.role !== "member" && actor.role !== "viewer"))).length;

  return (
    <WorkspaceProvider
      value={{
        actor: publicMember(actor, actor),
        members: publicMembers(db, actor),
        tracks: db.tracks,
        subtracks: db.subtracks,
        sprints: db.sprints,
        milestones: db.milestones,
        settings: { claimMode: settings.claimMode, organization: settings.organization, team: settings.team },
        storage: { kind: store.kind, shared: store.shared, description: store.description },
        demoMode: env.demoAccounts && store.kind !== "supabase",
      }}
    >
      <AppShell counts={{ unread, myActive, reviewQueue }} realtime={null}>
        {children}
      </AppShell>
    </WorkspaceProvider>
  );
}

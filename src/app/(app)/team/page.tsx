import { memberWorkload } from "@/lib/domain/workload";
import { loadContext, publicMembers } from "@/lib/server/data";
import { TeamClient } from "./team-client";

export const metadata = { title: "Team Members" };

export default async function TeamPage() {
  const { db, actor } = await loadContext();
  const members = publicMembers(db, actor).filter((m) => m.active);
  const keyOf = new Map(db.tasks.map((t) => [t.id, t]));
  const rows = members.map((m) => {
    const asg = db.assignments.filter((a) => a.memberId === m.id);
    return {
      member: m,
      workload: memberWorkload(m, db.tasks, db.assignments, db.checklistItems),
      current: asg.filter((a) => keyOf.get(a.taskId)?.status !== "completed").map((a) => ({ key: keyOf.get(a.taskId)!.key, role: a.role })),
      completed: asg.filter((a) => keyOf.get(a.taskId)?.status === "completed").length,
      contributions: db.auditEvents.filter((e) => e.actorId === m.id).length,
    };
  });
  const claims = db.claims.filter((c) => c.status === "pending").map((c) => {
    const t = keyOf.get(c.taskId)!;
    return { ...c, taskKey: t.key, taskTitle: t.title, trackId: t.trackId };
  });
  return <TeamClient rows={rows} claims={claims} />;
}

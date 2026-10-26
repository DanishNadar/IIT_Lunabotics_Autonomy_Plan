import { burndown, memberCapacity, sprintStats } from "@/lib/domain/sprint";
import { summarizeTasks } from "@/lib/domain/views";
import { memberWorkload } from "@/lib/domain/workload";
import { loadContext } from "@/lib/server/data";
import { SprintsClient } from "./sprints-client";

export const metadata = { title: "Sprint Planning" };

export default async function SprintsPage() {
  const { db } = await loadContext();
  const now = new Date();
  const summaries = summarizeTasks(db);
  const sprints = [...db.sprints].sort((a, b) => b.startDate.localeCompare(a.startDate)).map((s) => ({
    sprint: s,
    stats: sprintStats(s, db.tasks, now),
    burndown: burndown(s, db.tasks, db.statusHistory),
    memberCapacity: memberCapacity(s, db.members),
    blockers: db.blockers.filter((b) => !b.resolvedAt && db.tasks.some((t) => t.id === b.taskId && t.sprintId === s.id)).map((b) => ({ id: b.id, description: b.description, key: db.tasks.find((t) => t.id === b.taskId)!.key })),
  }));
  const workloads = db.members.filter((m) => m.active && m.role !== "viewer").map((m) => ({ id: m.id, ...memberWorkload(m, db.tasks, db.assignments, db.checklistItems) }));
  return <SprintsClient sprints={sprints} tasks={summaries} workloads={workloads} />;
}

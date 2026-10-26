import { nextIncomplete } from "@/lib/domain/checklist";
import { isActive } from "@/lib/domain/status";
import { summarizeTasks } from "@/lib/domain/views";
import { memberWorkload } from "@/lib/domain/workload";
import { redirect } from "next/navigation";
import { isGuest } from "@/lib/server/auth";
import { loadContext } from "@/lib/server/data";
import { MyWorkClient } from "./my-work-client";

export const metadata = { title: "My Tasks" };

export default async function MyWorkPage() {
  const { db, actor } = await loadContext();
  if (isGuest(actor)) redirect("/board");
  const mineIds = new Set(db.assignments.filter((a) => a.memberId === actor.id).map((a) => a.taskId));
  const summaries = summarizeTasks(db);
  const mine = summaries.filter((t) => mineIds.has(t.id));
  const active = mine.filter((t) => isActive(t.status));

  // Continue Working: the most recently touched active task's next incomplete step.
  const touched = (taskId: string) =>
    [
      ...db.progressLogs.filter((l) => l.taskId === taskId && l.memberId === actor.id).map((l) => l.createdAt),
      ...db.checklistItems.filter((c) => c.taskId === taskId && c.doneBy === actor.id && c.doneAt).map((c) => c.doneAt!),
      ...db.statusHistory.filter((h) => h.taskId === taskId && h.changedBy === actor.id).map((h) => h.createdAt),
    ].sort().pop() ?? "";
  const focus = [...active].filter((t) => t.status !== "in_review").sort((a, b) => touched(b.id).localeCompare(touched(a.id)))[0];
  let resume = null;
  if (focus) {
    const items = db.checklistItems.filter((c) => c.taskId === focus.id);
    const step = nextIncomplete(items);
    const lastLog = db.progressLogs.filter((l) => l.taskId === focus.id && l.memberId === actor.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
    const stepResources = step ? db.resources.filter((r) => step.resourceIds.includes(r.id)) : [];
    const taskResources = db.taskResources.filter((tr) => tr.taskId === focus.id).sort((a, b) => a.order - b.order).slice(0, 4).map((tr) => db.resources.find((r) => r.id === tr.resourceId)!).filter(Boolean);
    resume = { task: focus, step, steps: items, lastLog, resources: stepResources.length ? stepResources : taskResources };
  }

  const todos = active.flatMap((t) =>
    db.checklistItems
      .filter((c) => c.taskId === t.id && !c.done && (c.ownerId === actor.id || !c.ownerId) && !db.checklistItems.some((x) => x.parentId === c.id))
      .sort((a, b) => a.order - b.order)
      .slice(0, 3)
      .map((c) => ({ id: c.id, text: c.text, taskKey: t.key, taskId: t.id, mine: c.ownerId === actor.id })),
  );

  const reviews = summaries.filter((t) => t.status === "in_review" && !mineIds.has(t.id) && (t.reviewerId === actor.id || (!t.reviewerId && (actor.role === "autonomy_lead" || actor.role === "admin" || (actor.role === "track_lead" && actor.leadTrackIds.includes(t.trackId))))));
  const myPrimaryTracks = [actor.primaryTrackId, actor.secondaryTrackId].filter(Boolean);
  const suggestions = summaries
    .filter((t) => !t.archived && t.status === "available" && t.claimable && !mineIds.has(t.id) && !t.assignees.some((a) => a.role === "owner") && t.missingDeps.length === 0)
    .map((t) => ({ t, score: (myPrimaryTracks[0] === t.trackId ? 3 : myPrimaryTracks.includes(t.trackId) ? 2 : 0) + (actor.experience === "new" && t.difficulty === "beginner" ? 2 : 0) + (t.priority === "critical" ? 1 : 0) }))
    .sort((a, b) => b.score - a.score || a.t.key.localeCompare(b.t.key))
    .slice(0, 6)
    .map((x) => x.t);

  const commentsOnMine = db.comments.filter((c) => mineIds.has(c.taskId) && c.authorId !== actor.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);
  const mentions = db.comments.filter((c) => c.mentions.includes(actor.id)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);
  const keyOf = new Map(db.tasks.map((t) => [t.id, t.key]));
  const blockers = db.blockers.filter((b) => !b.resolvedAt && (mineIds.has(b.taskId) || db.dependencies.some((d) => d.fromTaskId === b.taskId && mineIds.has(d.toTaskId)))).map((b) => ({ ...b, taskKey: keyOf.get(b.taskId)! }));

  const paths = db.learningPaths.map((p) => {
    const mods = db.learningModules.filter((m) => m.pathId === p.id);
    const done = mods.filter((m) => db.learningProgress.some((lp) => lp.memberId === actor.id && lp.moduleId === m.id)).length;
    return { slug: p.slug, title: p.title, done, total: mods.length, trackId: p.trackId };
  });

  return (
    <MyWorkClient
      tasks={mine}
      resume={resume}
      todos={todos}
      reviews={reviews}
      suggestions={suggestions}
      comments={[...new Map([...mentions, ...commentsOnMine].map((c) => [c.id, c])).values()].map((c) => ({ ...c, taskKey: keyOf.get(c.taskId)!, mention: c.mentions.includes(actor.id) }))}
      blockers={blockers}
      paths={paths}
      workload={memberWorkload(actor, db.tasks, db.assignments, db.checklistItems)}
      claims={db.claims.filter((c) => c.memberId === actor.id && c.status === "pending").map((c) => ({ ...c, taskKey: keyOf.get(c.taskId)! }))}
    />
  );
}

import { notFound, redirect } from "next/navigation";
import { definitionOfDone } from "@/lib/domain/review";
import { summarizeTasks } from "@/lib/domain/views";
import { findTaskByKey, findTaskByLegacyKey, loadContext } from "@/lib/server/data";
import { TaskDetailClient, type TaskDetailData } from "./task-detail";

export async function generateMetadata({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  return { title: key.toUpperCase() };
}

export default async function TaskPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const { db, actor } = await loadContext();
  const task = findTaskByKey(db, key);
  if (!task) {
    // Old links (e.g. /tasks/MS-01) keep working after tasks were re-keyed.
    const moved = findTaskByLegacyKey(db, key);
    if (moved) redirect(`/tasks/${moved.key}?from=${encodeURIComponent(key.toUpperCase())}`);
    notFound();
  }

  const approved = db.reviews.some((r) => r.taskId === task.id && r.decision === "approved") && task.status === "completed";
  const related = new Set<string>();
  const prereqDeps = db.dependencies.filter((d) => d.toTaskId === task.id);
  const dependentDeps = db.dependencies.filter((d) => d.fromTaskId === task.id);
  for (const d of [...prereqDeps, ...dependentDeps]) related.add(d.fromTaskId).add(d.toTaskId);
  const sameSubtrack = db.tasks.filter((t) => t.id !== task.id && t.subtrackId && t.subtrackId === task.subtrackId).map((t) => t.id);
  const sameTrack = db.tasks.filter((t) => t.id !== task.id && t.trackId === task.trackId).map((t) => t.id);
  for (const id of [...sameSubtrack, ...sameTrack]) related.add(id);
  const summaries = summarizeTasks(db, (t) => related.has(t.id) || t.id === task.id);

  const taskResources = db.taskResources
    .filter((tr) => tr.taskId === task.id)
    .sort((a, b) => a.order - b.order)
    .map((tr) => ({ ...tr, resource: db.resources.find((r) => r.id === tr.resourceId)! }))
    .filter((x) => x.resource);
  const prereqResourceIds = new Set([...task.spec.prerequisites.flatMap((p) => p.resourceIds), ...db.checklistItems.filter((c) => c.taskId === task.id).flatMap((c) => c.resourceIds)]);

  const data: TaskDetailData = {
    task,
    summary: summaries.find((s) => s.id === task.id)!,
    assignments: db.assignments.filter((a) => a.taskId === task.id),
    checklist: db.checklistItems.filter((c) => c.taskId === task.id),
    deliverables: db.deliverables.filter((d) => d.taskId === task.id).sort((a, b) => a.order - b.order),
    submissions: db.submissions.filter((s) => s.taskId === task.id),
    acceptance: db.acceptanceCriteria.filter((a) => a.taskId === task.id).sort((a, b) => a.order - b.order),
    reviews: db.reviews.filter((r) => r.taskId === task.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    comments: db.comments.filter((c) => c.taskId === task.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    logs: db.progressLogs.filter((l) => l.taskId === task.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    blockers: db.blockers.filter((b) => b.taskId === task.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    history: db.statusHistory.filter((h) => h.taskId === task.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    claims: db.claims.filter((c) => c.taskId === task.id && (c.status === "pending" || c.memberId === actor.id)),
    links: db.githubLinks.filter((g) => g.taskId === task.id),
    resources: taskResources,
    resourceIndex: Object.fromEntries(db.resources.filter((r) => prereqResourceIds.has(r.id)).map((r) => [r.id, r])),
    prereqs: prereqDeps.map((d) => ({ dep: d, task: summaries.find((s) => s.id === d.fromTaskId)! })).filter((x) => x.task),
    dependents: dependentDeps.map((d) => ({ dep: d, task: summaries.find((s) => s.id === d.toTaskId)! })).filter((x) => x.task),
    sameSubtrack: summaries.filter((s) => sameSubtrack.includes(s.id)),
    sameTrack: summaries.filter((s) => sameTrack.includes(s.id) && !sameSubtrack.includes(s.id)).slice(0, 12),
    allTasks: db.tasks.map((t) => ({ id: t.id, key: t.key, title: t.title })),
    experiments: db.experiments.filter((e) => e.taskId === task.id).map((e) => ({ id: e.id, name: e.name, status: e.status, isDemo: e.isDemo })),
    dod: definitionOfDone({ task, checklist: db.checklistItems, deliverables: db.deliverables, submissions: db.submissions, githubLinks: db.githubLinks, approved }),
    claimMode: db.settings[0].claimMode,
    // Other tasks that used to carry this task's key.
    keyHistory: db.tasks.filter((t) => t.id !== task.id && t.legacyKeys.includes(task.key)).map((t) => ({ key: t.key, title: t.title })),
    externalDependencies: db.externalDependencies.filter((d) => d.taskIds.includes(task.id)),
  };
  return <TaskDetailClient data={data} />;
}

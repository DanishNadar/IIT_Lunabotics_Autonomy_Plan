import { checklistProgress } from "./checklist";
import { missingDependencies } from "./dependencies";
import type { Database, GithubLink, Task } from "./types";

export interface TaskSummary {
  id: string;
  key: string;
  title: string;
  trackId: Task["trackId"];
  subtrackId: string | null;
  priority: Task["priority"];
  difficulty: Task["difficulty"];
  estimateHours: number;
  status: Task["status"];
  backlog: Task["backlog"];
  sprintId: string | null;
  milestoneId: string | null;
  startDate: string | null;
  dueDate: string | null;
  reviewerId: string | null;
  claimable: boolean;
  labels: string[];
  assignees: { memberId: string; role: "owner" | "contributor" }[];
  progress: { done: number; total: number; pct: number };
  missingDeps: string[];
  prereqCount: number;
  dependentCount: number;
  openBlockers: number;
  pr: Pick<GithubLink, "url" | "state" | "checks" | "number" | "repo"> | null;
  evidence: boolean;
  testing: "none" | "evidence" | "approved";
  pendingClaims: number;
  archived: boolean;
  externalTeam: Task["externalTeam"];
  legacyKeys: string[];
  searchText: string;
  statusChangedAt: string;
}

export function summarizeTasks(db: Database, filter?: (t: Task) => boolean): TaskSummary[] {
  const submitted = new Set(db.submissions.map((s) => s.deliverableId));
  return db.tasks.filter(filter ?? (() => true)).map((t) => {
    const items = db.checklistItems.filter((c) => c.taskId === t.id);
    const evidence = db.deliverables.some((d) => d.taskId === t.id && ["tests", "benchmark", "media"].includes(d.kind) && submitted.has(d.id));
    const prs = db.githubLinks.filter((g) => g.taskId === t.id && g.kind === "pr");
    const pr = prs.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    return {
      id: t.id,
      key: t.key,
      title: t.title,
      trackId: t.trackId,
      subtrackId: t.subtrackId,
      priority: t.priority,
      difficulty: t.difficulty,
      estimateHours: t.estimateHours,
      status: t.status,
      backlog: t.backlog,
      sprintId: t.sprintId,
      milestoneId: t.milestoneId,
      startDate: t.startDate,
      dueDate: t.dueDate,
      reviewerId: t.reviewerId,
      claimable: t.claimable,
      labels: t.labels,
      assignees: db.assignments.filter((a) => a.taskId === t.id).sort((a, b) => (a.role === "owner" ? -1 : 1) - (b.role === "owner" ? -1 : 1)).map((a) => ({ memberId: a.memberId, role: a.role })),
      progress: checklistProgress(items),
      missingDeps: missingDependencies(db.tasks, db.dependencies, t.id),
      prereqCount: db.dependencies.filter((d) => d.toTaskId === t.id).length,
      dependentCount: db.dependencies.filter((d) => d.fromTaskId === t.id).length,
      openBlockers: db.blockers.filter((b) => b.taskId === t.id && !b.resolvedAt).length,
      pr: pr ? { url: pr.url, state: pr.state, checks: pr.checks, number: pr.number, repo: pr.repo } : null,
      evidence,
      testing: t.status === "completed" ? "approved" : evidence ? "evidence" : "none",
      pendingClaims: db.claims.filter((c) => c.taskId === t.id && c.status === "pending").length,
      archived: t.archived,
      externalTeam: t.externalTeam,
      legacyKeys: t.legacyKeys,
      searchText: `${t.key} ${t.legacyKeys.join(" ")} ${t.title} ${t.spec.problem} ${t.spec.goal} ${t.labels.join(" ")} ${t.spec.references.map((r) => r.path).join(" ")} ${items.map((i) => i.text).join(" ")}`.toLowerCase(),
      statusChangedAt: t.statusChangedAt,
    };
  });
}

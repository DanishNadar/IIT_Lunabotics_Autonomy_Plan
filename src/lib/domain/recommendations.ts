import { differenceInCalendarDays } from "date-fns";
import { owners } from "./assignment";
import { prerequisitesOf } from "./dependencies";
import type { Database } from "./types";

export interface Recommendation {
  id: string;
  rule: string;
  severity: "high" | "medium" | "low";
  message: string;
  taskKey?: string;
  href: string;
}

/**
 * Transparent rule-based recommendations. Each carries the rule that fired —
 * these are heuristics, not predictions.
 */
export function recommendations(db: Database, now: Date, blockedDays = 3): Recommendation[] {
  const out: Recommendation[] = [];
  const href = (key: string) => `/tasks/${key}`;
  const submittedDeliverables = new Set(db.submissions.map((s) => s.deliverableId));

  for (const t of db.tasks) {
    if (t.status === "completed" || t.archived) continue;
    const inPlay = t.backlog === "initial" || t.status !== "backlog";

    if (inPlay && t.priority === "critical" && owners(db.assignments, t.id).length === 0) {
      out.push({ id: `owner-${t.id}`, rule: "Critical task has no owner", severity: "high", message: `${t.key} ${t.title} is critical and unowned.`, taskKey: t.key, href: href(t.key) });
    }
    if (t.status === "blocked") {
      const days = differenceInCalendarDays(now, new Date(t.statusChangedAt));
      if (days >= blockedDays) {
        out.push({ id: `blocked-${t.id}`, rule: `Blocked ≥ ${blockedDays} days`, severity: "high", message: `${t.key} has been blocked for ${days} days.`, taskKey: t.key, href: href(t.key) });
      }
    }
    if (t.status === "testing") {
      const evidence = db.deliverables.some((d) => d.taskId === t.id && ["tests", "benchmark", "media"].includes(d.kind) && submittedDeliverables.has(d.id));
      if (!evidence) {
        out.push({ id: `evidence-${t.id}`, rule: "Testing without evidence", severity: "medium", message: `${t.key} is in Testing but no test evidence has been submitted.`, taskKey: t.key, href: href(t.key) });
      }
    }
    if (t.status === "in_review") {
      const days = differenceInCalendarDays(now, new Date(t.statusChangedAt));
      const pr = db.githubLinks.find((g) => g.taskId === t.id && g.kind === "pr" && (g.state === "open" || g.state === "draft"));
      out.push({
        id: `review-${t.id}`,
        rule: pr ? "Pull request awaiting review" : "Submission awaiting review",
        severity: days >= 2 ? "high" : "medium",
        message: `${t.key} has waited ${days} day(s) for review${pr ? ` (${pr.repo}#${pr.number ?? ""})` : ""}.`,
        taskKey: t.key,
        href: href(t.key),
      });
    }
    if ((t.status === "available" || t.status === "backlog") && inPlay) {
      const prereqs = prerequisitesOf(db.dependencies, t.id);
      if (prereqs.length && prereqs.every((d) => db.tasks.find((x) => x.id === d.fromTaskId)?.status === "completed")) {
        out.push({ id: `ready-${t.id}`, rule: "Dependencies complete, downstream not started", severity: "low", message: `All prerequisites of ${t.key} are complete; it can start.`, taskKey: t.key, href: href(t.key) });
      }
    }
    if (t.dueDate && differenceInCalendarDays(new Date(t.dueDate), now) < 0) {
      out.push({ id: `overdue-${t.id}`, rule: "Past target date", severity: "medium", message: `${t.key} passed its target date (${t.dueDate.slice(0, 10)}).`, taskKey: t.key, href: href(t.key) });
    }
  }
  for (const d of db.externalDependencies.filter((d) => d.status === "blocked")) {
    out.push({ id: `ext-${d.id}`, rule: "External dependency blocked", severity: "high", message: `${d.team}: “${d.title}” is blocked — autonomy integration waits on it.`, href: "/tracks/AG#external" });
  }
  const pending = db.claims.filter((c) => c.status === "pending");
  if (pending.length) {
    out.push({ id: "claims", rule: "Assignment requests pending", severity: "medium", message: `${pending.length} assignment request(s) awaiting a lead decision.`, href: "/team?tab=requests" });
  }
  const order = { high: 0, medium: 1, low: 2 };
  return out.sort((a, b) => order[a.severity] - order[b.severity]);
}

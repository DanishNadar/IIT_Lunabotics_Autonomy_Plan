import type { Task, TaskStatus } from "./types";

export const ACTIVE_STATUSES: TaskStatus[] = ["assigned", "researching", "designing", "implementing", "testing"];
export const WORK_ORDER: TaskStatus[] = [
  "backlog",
  "available",
  "assigned",
  "researching",
  "designing",
  "implementing",
  "testing",
  "in_review",
  "completed",
];

export function statusRank(s: TaskStatus): number {
  return s === "blocked" ? -1 : WORK_ORDER.indexOf(s);
}

export function isActive(s: TaskStatus) {
  return ACTIVE_STATUSES.includes(s) || s === "in_review" || s === "blocked";
}

export interface TransitionContext {
  hasOwner: boolean;
  unmetBlockingDeps: string[];
  /** Set by the review workflow only. */
  viaReview?: "approve" | "request_review" | "changes_requested";
  actorIsLead: boolean;
}

export type Check = { ok: true } | { ok: false; reason: string };
const ok: Check = { ok: true };
const no = (reason: string): Check => ({ ok: false, reason });

/**
 * Status transition rules. Board moves use this directly; the review workflow
 * passes `viaReview` because In Review and Completed are only reachable through it.
 */
export function canTransition(task: Pick<Task, "status" | "statusBeforeBlocked">, to: TaskStatus, ctx: TransitionContext): Check {
  const from = task.status;
  if (from === to) return no("Task is already in that state.");

  if (to === "completed") {
    return ctx.viaReview === "approve" ? ok : no("Tasks are completed only by an approving review.");
  }
  if (to === "in_review") {
    return ctx.viaReview === "request_review" ? ok : no("Use “Request review” so the Definition of Done is checked.");
  }
  if (from === "completed" && !ctx.actorIsLead) {
    return no("Only a lead can reopen a completed task.");
  }
  if (from === "in_review" && !ctx.viaReview && !ctx.actorIsLead && to !== "blocked") {
    return no("A task in review moves on when the reviewer approves or requests changes.");
  }
  if (to === "blocked") {
    return from === "backlog" || from === "completed" ? no("Only active work can be blocked.") : ok;
  }
  const needsOwner = ACTIVE_STATUSES.includes(to);
  if (needsOwner && !ctx.hasOwner) return no("Assign a primary owner before starting work.");
  if ((needsOwner || to === "available") && ctx.unmetBlockingDeps.length > 0) {
    return no(`Prerequisites not complete: ${ctx.unmetBlockingDeps.join(", ")}`);
  }
  return ok;
}

/** Where a task lands after an unblock: its previous state, or assigned. */
export function unblockTarget(task: Pick<Task, "statusBeforeBlocked">): TaskStatus {
  const prev = task.statusBeforeBlocked;
  return prev && prev !== "blocked" && prev !== "completed" && prev !== "in_review" ? prev : "assigned";
}

import { leadsTrack, type Actor } from "./permissions";
import type { Check } from "./status";
import type { AppSettings, Member, Task, TaskAssignment, TaskClaim } from "./types";

export function owners(assignments: TaskAssignment[], taskId: string) {
  return assignments.filter((a) => a.taskId === taskId && a.role === "owner");
}

export function canAssignMember(actor: Actor, task: Pick<Task, "trackId" | "status">, member: Pick<Member, "role" | "active">): Check {
  if (!leadsTrack(actor, task.trackId)) {
    return { ok: false, reason: actor.role === "track_lead" ? "Track leads can assign only within their track." : "Lead permission required." };
  }
  if (!member.active) return { ok: false, reason: "Member is deactivated." };
  if (member.role === "viewer") return { ok: false, reason: "Viewers cannot be assigned tasks." };
  if (task.status === "completed") return { ok: false, reason: "Task is completed." };
  return { ok: true };
}

export type ClaimOutcome = "assigned" | "pending" | "interest";

/**
 * What a member's claim does under the current claim policy:
 *  open → immediate assignment as owner (if no owner yet)
 *  approval → pending request for a lead
 *  disabled → recorded as interest only
 */
export function evaluateClaim(
  settings: Pick<AppSettings, "claimMode">,
  task: Pick<Task, "id" | "status" | "claimable" | "backlog">,
  member: Pick<Member, "id" | "role">,
  assignments: TaskAssignment[],
  claims: TaskClaim[],
  kind: TaskClaim["kind"],
): Check & { outcome?: ClaimOutcome } {
  if (member.role === "viewer") return { ok: false, reason: "Viewers cannot claim tasks." };
  if (assignments.some((a) => a.taskId === task.id && a.memberId === member.id)) {
    return { ok: false, reason: "You are already assigned to this task." };
  }
  if (claims.some((c) => c.taskId === task.id && c.memberId === member.id && c.status === "pending")) {
    return { ok: false, reason: "You already have a pending request for this task." };
  }
  if (kind === "interest") return { ok: true, outcome: "interest" };
  if (!task.claimable) return { ok: false, reason: "This task is assigned by leads only." };
  if (task.status !== "available") return { ok: false, reason: "Only Available tasks can be claimed or requested." };
  if (settings.claimMode === "disabled") return { ok: true, outcome: "interest" };
  if (settings.claimMode === "approval" || kind === "request") return { ok: true, outcome: "pending" };
  if (owners(assignments, task.id).length > 0) return { ok: true, outcome: "pending" };
  return { ok: true, outcome: "assigned" };
}

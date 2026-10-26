import type { Check } from "./status";
import type { Member, Role, Task, TaskAssignment } from "./types";

export type Action =
  | "task.create"
  | "task.edit"
  | "task.delete"
  | "task.move"
  | "task.assign"
  | "task.claim"
  | "task.decideClaim"
  | "task.checklist"
  | "task.comment"
  | "task.progress"
  | "task.submit"
  | "task.requestReview"
  | "task.review"
  | "task.dependency"
  | "task.github"
  | "task.blocker"
  | "sprint.manage"
  | "milestone.manage"
  | "resource.add"
  | "resource.manage"
  | "doc.edit"
  | "doc.manage"
  | "experiment.create"
  | "experiment.manage"
  | "member.manage"
  | "settings.manage"
  | "track.manage"
  | "learning.progress"
  | "readiness.record"
  | "external.manage"
  | "analytics.view";

export type Actor = Pick<Member, "id" | "role" | "leadTrackIds" | "active">;

export interface PermissionContext {
  task?: Pick<Task, "id" | "trackId">;
  assignments?: TaskAssignment[];
  /** owner of a record such as a comment, document or experiment */
  recordOwnerId?: string | null;
}

const RANK: Record<Role, number> = { viewer: 0, member: 1, track_lead: 2, autonomy_lead: 3, admin: 4 };

export function atLeast(role: Role, min: Role) {
  return RANK[role] >= RANK[min];
}

export function isLead(actor: Actor) {
  return atLeast(actor.role, "autonomy_lead");
}

export function leadsTrack(actor: Actor, trackId: string | undefined) {
  if (!trackId) return false;
  if (isLead(actor)) return true;
  return actor.role === "track_lead" && actor.leadTrackIds.includes(trackId as never);
}

export function isAssigned(actor: Actor, ctx: PermissionContext) {
  return !!ctx.task && !!ctx.assignments?.some((a) => a.taskId === ctx.task!.id && a.memberId === actor.id);
}

const ok: Check = { ok: true };
const deny = (reason: string): Check => ({ ok: false, reason });

/**
 * Single source of truth for authorization. Called by every server command;
 * the UI uses it only to decide what to show.
 */
export function authorize(actor: Actor | null, action: Action, ctx: PermissionContext = {}): Check {
  if (!actor) return deny("Sign in required.");
  if (!actor.active) return deny("Your account is deactivated.");
  const role = actor.role;
  if (role === "admin") return ok;

  const scoped = leadsTrack(actor, ctx.task?.trackId);
  const assigned = isAssigned(actor, ctx);
  const member = atLeast(role, "member");

  switch (action) {
    case "learning.progress":
      return ok;
    case "settings.manage":
    case "member.manage":
    case "track.manage":
      return deny("Administrator only.");
    case "sprint.manage":
    case "milestone.manage":
    case "readiness.record":
    case "resource.manage":
    case "doc.manage":
    case "experiment.manage":
      return isLead(actor) ? ok : deny("Autonomy Lead or Administrator only.");
    case "analytics.view":
    case "external.manage":
      return atLeast(role, "track_lead") ? ok : deny("Leads only.");
    case "task.create":
    case "task.edit":
    case "task.assign":
    case "task.decideClaim":
    case "task.dependency":
    case "task.review":
      return scoped ? ok : deny(role === "track_lead" ? "Outside your track." : "Lead permission required.");
    case "task.delete":
      return isLead(actor) ? ok : deny("Autonomy Lead or Administrator only.");
    case "task.claim":
      return member ? ok : deny("Viewers cannot claim tasks.");
    case "task.comment":
    case "resource.add":
    case "doc.edit":
    case "experiment.create":
      return member ? ok : deny("Viewers have read-only access.");
    case "task.move":
    case "task.checklist":
    case "task.progress":
    case "task.submit":
    case "task.requestReview":
    case "task.github":
    case "task.blocker":
      if (!member) return deny("Viewers have read-only access.");
      return scoped || assigned ? ok : deny("Only assignees or track leads can update this task.");
  }
}

export function can(actor: Actor | null, action: Action, ctx?: PermissionContext) {
  return authorize(actor, action, ctx).ok;
}

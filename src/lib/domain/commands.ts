import { z } from "zod";
import { canAssignMember, evaluateClaim, owners } from "./assignment";
import { canToggle, toggleEffects } from "./checklist";
import { unmetBlockingPrereqs, wouldCreateCycle } from "./dependencies";
import type { Op } from "./ops";
import { authorize, isLead, leadsTrack, type Action, type PermissionContext } from "./permissions";
import { findDuplicate, resourceInput } from "./resources";
import { canRequestReview, canReview, definitionOfDone, validateDecision } from "./review";
import { canTransition, unblockTarget, type Check } from "./status";
import {
  DIFFICULTIES,
  EXTERNAL_TEAMS,
  NOTIFICATION_KINDS,
  PRIORITIES,
  REVIEW_DIMENSIONS,
  ROLES,
  TASK_RESOURCE_CATEGORIES,
  TASK_STATUSES,
  TRACK_IDS,
  type Database,
  type Member,
  type NotificationKind,
  type Task,
  type TaskSpec,
  type TaskStatus,
} from "./types";

const id = z.string().min(1).max(64);
const text = (max = 4000) => z.string().trim().max(max);
const trackId = z.enum(TRACK_IDS as [string, ...string[]]);
const emailAddress = z.union([z.literal(""), z.string().trim().toLowerCase().email("That doesn't look like an email address").max(200)]);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}/, "Expected YYYY-MM-DD").nullable();
const ratings = z.object(Object.fromEntries(REVIEW_DIMENSIONS.map((d) => [d, z.enum(["pass", "concern", "fail", "na"])])) as Record<
  (typeof REVIEW_DIMENSIONS)[number],
  z.ZodEnum<{ pass: "pass"; concern: "concern"; fail: "fail"; na: "na" }>
>);

export const commandSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("task.create"),
    title: text(160).min(4),
    trackId,
    subtrackId: id.nullable().default(null),
    priority: z.enum(PRIORITIES),
    difficulty: z.enum(DIFFICULTIES),
    estimateHours: z.number().int().min(1).max(400),
    backlog: z.enum(["initial", "advanced"]).default("initial"),
    problem: text().min(10),
    goal: text().min(10),
  }),
  z.object({
    type: z.literal("task.update"),
    taskId: id,
    patch: z
      .object({
        title: text(160).min(4),
        priority: z.enum(PRIORITIES),
        difficulty: z.enum(DIFFICULTIES),
        estimateHours: z.number().int().min(1).max(400),
        subtrackId: id.nullable(),
        sprintId: id.nullable(),
        milestoneId: id.nullable(),
        startDate: isoDate,
        dueDate: isoDate,
        reviewerId: id.nullable(),
        requiresIndependentReview: z.boolean(),
        claimable: z.boolean(),
        labels: z.array(text(30)).max(10),
      })
      .partial(),
    spec: z
      .object({ problem: text(), goal: text(), background: text(8000), design: text(8000), integrate: text() })
      .partial()
      .optional(),
  }),
  z.object({ type: z.literal("task.delete"), taskId: id }),
  z.object({ type: z.literal("task.archive"), taskId: id, archived: z.boolean(), externalTeam: z.enum(EXTERNAL_TEAMS).nullable().default(null), reason: text(1000).default("") }),
  z.object({
    type: z.literal("externalDep.update"),
    dependencyId: id,
    patch: z.object({ status: z.enum(["not_requested", "requested", "in_progress", "delivered", "blocked"]), contact: text(120), notes: text(4000), workaround: text(1000) }).partial(),
  }),
  z.object({ type: z.literal("task.move"), taskId: id, status: z.enum(TASK_STATUSES), note: text(500).default("") }),
  z.object({ type: z.literal("task.block"), taskId: id, description: text(2000).min(5) }),
  z.object({ type: z.literal("blocker.resolve"), blockerId: id, resolution: text(2000).default("") }),
  z.object({ type: z.literal("task.assign"), taskId: id, memberId: id, role: z.enum(["owner", "contributor"]), responsibility: text(200).default("") }),
  z.object({ type: z.literal("task.unassign"), assignmentId: id }),
  z.object({ type: z.literal("task.claim"), taskId: id, kind: z.enum(["interest", "request", "claim"]), message: text(1000).default("") }),
  z.object({ type: z.literal("claim.decide"), claimId: id, approve: z.boolean() }),
  z.object({ type: z.literal("claim.withdraw"), claimId: id }),
  z.object({ type: z.literal("checklist.toggle"), itemId: id, done: z.boolean() }),
  z.object({ type: z.literal("checklist.add"), taskId: id, parentId: id.nullable().default(null), text: text(300).min(3), required: z.boolean().default(true) }),
  z.object({ type: z.literal("checklist.update"), itemId: id, ownerId: id.nullable().optional(), evidence: text(1000).optional(), text: text(300).min(3).optional() }),
  z.object({ type: z.literal("checklist.delete"), itemId: id }),
  z.object({ type: z.literal("dependency.add"), fromTaskId: id, toTaskId: id, kind: z.enum(["blocks", "integrates"]), note: text(300).default("") }),
  z.object({ type: z.literal("dependency.remove"), dependencyId: id }),
  z.object({ type: z.literal("comment.add"), taskId: id, parentId: id.nullable().default(null), kind: z.enum(["discussion", "question", "review", "blocker"]), body: text(10000).min(1) }),
  z.object({
    type: z.literal("progress.add"),
    taskId: id,
    checklistItemId: id.nullable().default(null),
    workedOn: text(2000).min(3),
    changed: text(2000).default(""),
    problems: text(2000).default(""),
    experiments: text(2000).default(""),
    learned: text(2000).default(""),
    nextSteps: text(2000).default(""),
    hours: z.number().min(0).max(24).nullable().default(null),
  }),
  z.object({ type: z.literal("deliverable.submit"), taskId: id, deliverableId: id, url: z.string().trim().url(), note: text(1000).default("") }),
  z.object({ type: z.literal("github.link"), taskId: id, url: z.string().trim().url(), title: text(200).default("") }),
  z.object({ type: z.literal("github.unlink"), linkId: id }),
  z.object({ type: z.literal("review.request"), taskId: id, reviewerId: id.nullable().default(null) }),
  z.object({ type: z.literal("review.submit"), taskId: id, decision: z.enum(["approved", "changes_requested"]), ratings, summary: text(5000).min(5) }),
  z.object({ type: z.literal("acceptance.verify"), criterionId: id, verified: z.boolean() }),
  z.object({ type: z.literal("sprint.create"), name: text(80).min(3), goal: text(1000), startDate: z.string(), endDate: z.string(), capacityHours: z.number().min(0).max(5000) }),
  z.object({
    type: z.literal("sprint.update"),
    sprintId: id,
    patch: z.object({ name: text(80), goal: text(1000), startDate: z.string(), endDate: z.string(), capacityHours: z.number().min(0).max(5000), memberIds: z.array(id) }).partial(),
  }),
  z.object({ type: z.literal("sprint.start"), sprintId: id }),
  z.object({ type: z.literal("sprint.close"), sprintId: id, rolloverToSprintId: id.nullable() }),
  z.object({ type: z.literal("sprint.retro"), sprintId: id, wentWell: text(4000), improve: text(4000), actions: text(4000) }),
  z.object({ type: z.literal("sprint.setTask"), taskId: id, sprintId: id.nullable() }),
  z.object({ type: z.literal("milestone.create"), name: text(120).min(3), description: text(1000), targetDate: z.string(), trackIds: z.array(trackId) }),
  z.object({
    type: z.literal("resource.add"),
    resource: z.unknown(),
    taskId: id.nullable().default(null),
    category: z.enum(TASK_RESOURCE_CATEGORIES).default("text_tutorial"),
  }),
  z.object({ type: z.literal("resource.verify"), resourceId: id }),
  z.object({ type: z.literal("resource.delete"), resourceId: id }),
  z.object({ type: z.literal("researchTodo.add"), topic: text(200).min(3), note: text(1000).default(""), trackId: trackId.nullable().default(null), taskId: id.nullable().default(null) }),
  z.object({ type: z.literal("researchTodo.toggle"), todoId: id }),
  z.object({
    type: z.literal("doc.create"),
    title: text(160).min(3),
    category: z.enum(["onboarding", "standards", "architecture", "decision", "operations", "competition"]),
    body: text(100000),
    tags: z.array(text(30)).max(10).default([]),
  }),
  z.object({ type: z.literal("doc.update"), docId: id, title: text(160).min(3), body: text(100000), tags: z.array(text(30)).max(10), summary: text(300).default("") }),
  z.object({ type: z.literal("doc.restore"), revisionId: id }),
  z.object({
    type: z.literal("experiment.save"),
    experimentId: id.nullable(),
    name: text(160).min(3),
    trackId,
    taskId: id.nullable(),
    hypothesis: text(2000),
    environment: text(1000),
    commit: text(80),
    dataset: text(300),
    parameters: z.record(z.string(), z.string()),
    metrics: z.array(z.object({ metricKey: text(60), value: z.number(), note: text(300).optional() })),
    results: text(5000),
    notes: text(5000),
    conclusions: text(5000),
    artifacts: z.array(z.object({ label: text(120), url: z.string().url() })),
    status: z.enum(["planned", "running", "complete", "invalid"]),
  }),
  z.object({ type: z.literal("learning.toggle"), moduleId: id, done: z.boolean() }),
  z.object({ type: z.literal("notification.read"), notificationId: id.nullable() }),
  z.object({ type: z.literal("notification.prefs"), disabledKinds: z.array(z.enum(NOTIFICATION_KINDS)) }),
  z.object({ type: z.literal("view.save"), name: text(60).min(1), view: z.enum(["kanban", "table", "list", "calendar", "timeline", "assignee", "track"]), filters: z.record(z.string(), z.unknown()) }),
  z.object({ type: z.literal("view.delete"), viewId: id }),
  z.object({
    type: z.literal("profile.update"),
    memberId: id,
    patch: z
      .object({
        name: text(80).min(2),
        primaryTrackId: trackId.nullable(),
        secondaryTrackId: trackId.nullable(),
        githubUsername: z.string().trim().regex(/^[A-Za-z0-9-]{1,39}$/).nullable(),
        discordHandle: text(40).nullable(),
        skills: z.array(text(40)).max(20),
        experience: z.enum(["new", "some", "experienced"]),
        availabilityHours: z.number().min(0).max(60),
        bio: text(1000),
        email: emailAddress,
      })
      .partial(),
  }),
  z.object({
    type: z.literal("member.create"),
    name: z.string().trim().min(2).max(80),
    role: z.enum(ROLES).default("member"),
    primaryTrackId: trackId.nullable().default(null),
    leadTrackIds: z.array(trackId).default([]),
    discordHandle: text(40).nullable().default(null),
    githubUsername: z.string().trim().regex(/^[A-Za-z0-9-]{1,39}$/).nullable().default(null),
    email: emailAddress.default(""),
  }),
  z.object({ type: z.literal("member.setRole"), memberId: id, role: z.enum(ROLES), leadTrackIds: z.array(trackId).default([]) }),
  z.object({ type: z.literal("member.setActive"), memberId: id, active: z.boolean() }),
  z.object({
    type: z.literal("settings.update"),
    patch: z.object({ claimMode: z.enum(["open", "approval", "disabled"]), allowSelfRegistration: z.boolean(), organization: text(120), team: text(120) }).partial(),
  }),
  z.object({ type: z.literal("readiness.recordE2E"), demonstrated: z.boolean(), evidenceUrl: z.string().url().nullable() }),
]);

export type Command = z.input<typeof commandSchema>;

export class CommandError extends Error {}

export interface Ctx {
  db: Database;
  actor: Member;
  now: string;
  newId: () => string;
}

export interface Outcome {
  ops: Op[];
  message?: string;
  data?: Record<string, unknown>;
}

function must(check: Check) {
  if (!check.ok) throw new CommandError(check.reason);
}

function findTask(db: Database, taskId: string) {
  const t = db.tasks.find((x) => x.id === taskId || x.key === taskId);
  if (!t) throw new CommandError("Task not found.");
  return t;
}

/** Archived tasks are history: they cannot be claimed, assigned or worked on. */
function assertActive(t: Task) {
  if (t.archived) {
    throw new CommandError(`${t.key} is archived${t.externalTeam ? ` (owned by ${t.externalTeam})` : ""}. A lead can restore it if autonomy needs it.`);
  }
}

/**
 * Executes a validated command against a database snapshot and returns the
 * storage operations. Pure: no I/O, so it is fully unit-testable and identical
 * for the file and Supabase adapters.
 */
export function handleCommand(ctx: Ctx, raw: unknown): Outcome {
  const parsed = commandSchema.safeParse(raw);
  if (!parsed.success) {
    throw new CommandError(parsed.error.issues.map((i) => `${i.path.join(".") || "input"}: ${i.message}`).join("; "));
  }
  const cmd = parsed.data;
  const { db, actor, now } = ctx;
  const ops: Op[] = [];
  const allow = (action: Action, pc: PermissionContext = {}) => must(authorize(actor, action, { assignments: db.assignments, ...pc }));

  const notify = (memberId: string | null | undefined, kind: NotificationKind, title: string, body: string, href: string) => {
    if (!memberId || memberId === actor.id) return;
    const prefs = db.notificationPreferences.find((p) => p.memberId === memberId);
    if (prefs?.disabledKinds.includes(kind)) return;
    ops.push({ op: "insert", c: "notifications", row: { id: ctx.newId(), memberId, kind, title, body, href, read: false, createdAt: now } });
  };
  const audit = (action: string, entity: string, entityId: string, summary: string, href: string | null = null) =>
    ops.push({ op: "insert", c: "auditEvents", row: { id: ctx.newId(), actorId: actor.id, action, entity, entityId, summary, href, createdAt: now } });
  const setStatus = (task: Task, to: TaskStatus, note = "") => {
    const patch: Partial<Task> = { status: to, statusChangedAt: now, updatedAt: now };
    if (to === "blocked") patch.statusBeforeBlocked = task.status;
    ops.push({ op: "update", c: "tasks", id: task.id, patch });
    ops.push({ op: "insert", c: "statusHistory", row: { id: ctx.newId(), taskId: task.id, from: task.status, to, changedBy: actor.id, note, createdAt: now } });
  };
  const teamOf = (taskId: string) => db.assignments.filter((a) => a.taskId === taskId).map((a) => a.memberId);
  const href = (t: Task) => `/tasks/${t.key}`;

  switch (cmd.type) {
    case "task.create": {
      allow("task.create", { task: { id: "", trackId: cmd.trackId as Task["trackId"] } });
      const prefix = cmd.trackId;
      // Never reuse a key that is, or was, assigned to another task (old links must stay unambiguous).
      const used = db.tasks.flatMap((t) => [t.key, ...(t.legacyKeys ?? [])]);
      const nums = used.filter((k) => k.startsWith(prefix + "-")).map((k) => parseInt(k.split("-")[1], 10) || 0);
      const key = `${prefix}-${String(Math.max(0, ...nums) + 1).padStart(2, "0")}`;
      const taskId = ctx.newId();
      const spec: TaskSpec = {
        problem: cmd.problem,
        goal: cmd.goal,
        why: { need: "", contribution: "", failureImpact: "", consumers: [] },
        background: "",
        prerequisites: [],
        readFirst: [],
        references: [],
        analyze: [],
        design: "",
        guidance: { packageStructure: "", files: [], inputs: [], outputs: [], parameters: [], snippets: [], expectedBehavior: "", pitfalls: [] },
        testPlan: [],
        measure: [],
        document: [],
        integrate: "",
        researchNeeded: ["Specification drafted in-app; references and steps still need research."],
      };
      const task: Task = {
        id: taskId,
        key,
        title: cmd.title,
        trackId: cmd.trackId as Task["trackId"],
        subtrackId: cmd.subtrackId,
        priority: cmd.priority,
        difficulty: cmd.difficulty,
        estimateHours: cmd.estimateHours,
        status: "backlog",
        statusBeforeBlocked: null,
        backlog: cmd.backlog,
        sprintId: null,
        milestoneId: null,
        startDate: null,
        dueDate: null,
        reviewerId: null,
        requiresIndependentReview: true,
        claimable: true,
        labels: [],
        spec,
        legacyKeys: [],
        archived: false,
        externalTeam: null,
        archivedReason: "",
        createdBy: actor.id,
        createdAt: now,
        updatedAt: now,
        statusChangedAt: now,
      };
      ops.push({ op: "insert", c: "tasks", row: task as never });
      ops.push({ op: "insert", c: "statusHistory", row: { id: ctx.newId(), taskId, from: null, to: "backlog", changedBy: actor.id, note: "Created", createdAt: now } });
      audit("task.create", "task", taskId, `created ${key} ${cmd.title}`, `/tasks/${key}`);
      return { ops, message: `Created ${key}`, data: { key } };
    }

    case "task.update": {
      const task = findTask(db, cmd.taskId);
      allow("task.edit", { task });
      if (cmd.patch.subtrackId && !db.subtracks.some((s) => s.id === cmd.patch.subtrackId && s.trackId === task.trackId)) {
        throw new CommandError("Subtrack does not belong to this track.");
      }
      if (cmd.patch.reviewerId && !db.members.some((m) => m.id === cmd.patch.reviewerId && m.role !== "viewer")) {
        throw new CommandError("Reviewer must be an active member.");
      }
      const patch: Record<string, unknown> = { ...cmd.patch, updatedAt: now };
      if (cmd.spec) patch.spec = { ...task.spec, ...cmd.spec };
      ops.push({ op: "update", c: "tasks", id: task.id, patch });
      if (cmd.patch.reviewerId && cmd.patch.reviewerId !== task.reviewerId && task.status === "in_review") {
        notify(cmd.patch.reviewerId, "review_request", `Review requested: ${task.key}`, task.title, href(task));
      }
      if (cmd.patch.sprintId !== undefined && cmd.patch.sprintId !== task.sprintId) {
        for (const m of teamOf(task.id)) notify(m, "sprint_change", `${task.key} sprint changed`, task.title, href(task));
      }
      audit("task.update", "task", task.id, `updated ${task.key} (${Object.keys(cmd.patch).concat(cmd.spec ? Object.keys(cmd.spec) : []).join(", ")})`, href(task));
      return { ops, message: "Task updated" };
    }

    case "task.delete": {
      const task = findTask(db, cmd.taskId);
      allow("task.delete", { task });
      // Children cascade in SQL; mirror that here for the file adapter.
      const cascade: [keyof Database, (r: { taskId?: string; fromTaskId?: string; toTaskId?: string }) => boolean][] = [
        ["assignments", (r) => r.taskId === task.id],
        ["checklistItems", (r) => r.taskId === task.id],
        ["dependencies", (r) => r.fromTaskId === task.id || r.toTaskId === task.id],
        ["deliverables", (r) => r.taskId === task.id],
        ["submissions", (r) => r.taskId === task.id],
        ["acceptanceCriteria", (r) => r.taskId === task.id],
        ["reviews", (r) => r.taskId === task.id],
        ["comments", (r) => r.taskId === task.id],
        ["progressLogs", (r) => r.taskId === task.id],
        ["blockers", (r) => r.taskId === task.id],
        ["statusHistory", (r) => r.taskId === task.id],
        ["claims", (r) => r.taskId === task.id],
        ["githubLinks", (r) => r.taskId === task.id],
        ["taskResources", (r) => r.taskId === task.id],
      ];
      for (const [c, pred] of cascade) {
        for (const row of db[c] as unknown as { id: string; taskId?: string; fromTaskId?: string; toTaskId?: string }[]) if (pred(row)) ops.push({ op: "delete", c, id: row.id });
      }
      ops.push({ op: "delete", c: "tasks", id: task.id });
      audit("task.delete", "task", task.id, `deleted ${task.key} ${task.title}`);
      return { ops, message: `Deleted ${task.key}` };
    }

    case "task.archive": {
      const task = findTask(db, cmd.taskId);
      allow("task.delete", { task });
      if (cmd.archived && !cmd.reason.trim()) throw new CommandError("Explain why the task is out of autonomy scope.");
      ops.push({
        op: "update",
        c: "tasks",
        id: task.id,
        patch: { archived: cmd.archived, externalTeam: cmd.archived ? cmd.externalTeam : null, archivedReason: cmd.archived ? cmd.reason : "", claimable: cmd.archived ? false : task.claimable, sprintId: cmd.archived ? null : task.sprintId, updatedAt: now },
      });
      for (const c of db.claims.filter((c) => c.taskId === task.id && c.status === "pending")) ops.push({ op: "update", c: "claims", id: c.id, patch: { status: "declined", decidedBy: actor.id, decidedAt: now } });
      audit("task.archive", "task", task.id, `${cmd.archived ? "archived" : "restored"} ${task.key}${cmd.archived && cmd.externalTeam ? ` (owned by ${cmd.externalTeam})` : ""}`, href(task));
      return { ops, message: cmd.archived ? `${task.key} archived` : `${task.key} restored` };
    }

    case "externalDep.update": {
      allow("external.manage");
      const dep = db.externalDependencies.find((d) => d.id === cmd.dependencyId);
      if (!dep) throw new CommandError("External dependency not found.");
      ops.push({ op: "update", c: "externalDependencies", id: dep.id, patch: { ...cmd.patch, updatedAt: now } });
      if (cmd.patch.status && cmd.patch.status !== dep.status) {
        const affected = db.tasks.filter((t) => dep.taskIds.includes(t.id));
        const notifyKind: NotificationKind = cmd.patch.status === "blocked" ? "blocker_new" : cmd.patch.status === "delivered" ? "dependency_complete" : "sprint_change";
        for (const t of affected) for (const m of teamOf(t.id)) notify(m, notifyKind, `${dep.team}: ${dep.title} → ${cmd.patch.status.replace("_", " ")}`, `Affects ${t.key}`, href(t));
      }
      audit("externalDep.update", "externalDependency", dep.id, `updated external dependency “${dep.title}” (${dep.team})${cmd.patch.status ? ` → ${cmd.patch.status}` : ""}`, "/tracks/AG#external");
      return { ops, message: "External dependency updated" };
    }

    case "task.move": {
      const task = findTask(db, cmd.taskId);
      allow("task.move", { task });
      assertActive(task);
      if (cmd.status === "blocked") throw new CommandError("Describe the blocker to block a task.");
      if (task.status === "blocked" && db.blockers.some((b) => b.taskId === task.id && !b.resolvedAt)) {
        throw new CommandError("Resolve open blockers before moving this task.");
      }
      must(
        canTransition(task, cmd.status, {
          hasOwner: owners(db.assignments, task.id).length > 0,
          unmetBlockingDeps: unmetBlockingPrereqs(db.tasks, db.dependencies, task.id),
          actorIsLead: leadsTrack(actor, task.trackId),
        }),
      );
      setStatus(task, cmd.status, cmd.note);
      audit("task.move", "task", task.id, `moved ${task.key} to ${cmd.status}`, href(task));
      return { ops, message: `${task.key} → ${cmd.status}` };
    }

    case "task.block": {
      const task = findTask(db, cmd.taskId);
      allow("task.blocker", { task });
      const blockerId = ctx.newId();
      ops.push({ op: "insert", c: "blockers", row: { id: blockerId, taskId: task.id, description: cmd.description, raisedBy: actor.id, createdAt: now, resolvedAt: null, resolvedBy: null, resolution: "" } });
      if (task.status !== "blocked") {
        must(canTransition(task, "blocked", { hasOwner: true, unmetBlockingDeps: [], actorIsLead: leadsTrack(actor, task.trackId) }));
        setStatus(task, "blocked", cmd.description);
      }
      const leads = db.members.filter((m) => m.active && (m.role === "autonomy_lead" || (m.role === "track_lead" && m.leadTrackIds.includes(task.trackId))));
      for (const m of new Set([...teamOf(task.id), ...leads.map((l) => l.id)])) notify(m, "blocker_new", `Blocker on ${task.key}`, cmd.description, href(task));
      audit("task.block", "task", task.id, `raised a blocker on ${task.key}`, href(task));
      return { ops, message: "Blocker recorded" };
    }

    case "blocker.resolve": {
      const blocker = db.blockers.find((b) => b.id === cmd.blockerId);
      if (!blocker) throw new CommandError("Blocker not found.");
      if (blocker.resolvedAt) throw new CommandError("Blocker already resolved.");
      const task = findTask(db, blocker.taskId);
      allow("task.blocker", { task });
      ops.push({ op: "update", c: "blockers", id: blocker.id, patch: { resolvedAt: now, resolvedBy: actor.id, resolution: cmd.resolution } });
      const stillOpen = db.blockers.filter((b) => b.taskId === task.id && !b.resolvedAt && b.id !== blocker.id);
      if (!stillOpen.length && task.status === "blocked") setStatus(task, unblockTarget(task), "Blockers resolved");
      for (const m of teamOf(task.id)) notify(m, "blocker_resolved", `Blocker resolved on ${task.key}`, cmd.resolution || blocker.description, href(task));
      audit("blocker.resolve", "task", task.id, `resolved a blocker on ${task.key}`, href(task));
      return { ops, message: "Blocker resolved" };
    }

    case "task.assign": {
      const task = findTask(db, cmd.taskId);
      allow("task.assign", { task });
      assertActive(task);
      const member = db.members.find((m) => m.id === cmd.memberId);
      if (!member) throw new CommandError("Member not found.");
      must(canAssignMember(actor, task, member));
      const existing = db.assignments.find((a) => a.taskId === task.id && a.memberId === member.id);
      if (existing) {
        ops.push({ op: "update", c: "assignments", id: existing.id, patch: { role: cmd.role, responsibility: cmd.responsibility || existing.responsibility } });
      } else {
        ops.push({ op: "insert", c: "assignments", row: { id: ctx.newId(), taskId: task.id, memberId: member.id, role: cmd.role, responsibility: cmd.responsibility, assignedBy: actor.id, createdAt: now } });
      }
      if (cmd.role === "owner") {
        for (const o of owners(db.assignments, task.id)) if (o.memberId !== member.id) ops.push({ op: "update", c: "assignments", id: o.id, patch: { role: "contributor" } });
      }
      if (cmd.role === "owner" && (task.status === "available" || task.status === "backlog")) {
        const deps = unmetBlockingPrereqs(db.tasks, db.dependencies, task.id);
        if (!deps.length) setStatus(task, "assigned", `Assigned to ${member.name}`);
      }
      for (const c of db.claims.filter((c) => c.taskId === task.id && c.memberId === member.id && c.status === "pending")) {
        ops.push({ op: "update", c: "claims", id: c.id, patch: { status: "approved", decidedBy: actor.id, decidedAt: now } });
      }
      notify(member.id, "assignment", `Assigned: ${task.key}`, `${cmd.role === "owner" ? "Primary owner" : "Contributor"} — ${task.title}`, href(task));
      audit("task.assign", "task", task.id, `assigned ${member.name} to ${task.key} as ${cmd.role}`, href(task));
      return { ops, message: `${member.name} assigned` };
    }

    case "task.unassign": {
      const a = db.assignments.find((x) => x.id === cmd.assignmentId);
      if (!a) throw new CommandError("Assignment not found.");
      const task = findTask(db, a.taskId);
      if (a.memberId !== actor.id) allow("task.assign", { task });
      ops.push({ op: "delete", c: "assignments", id: a.id });
      const remainingOwners = owners(db.assignments, task.id).filter((o) => o.id !== a.id);
      if (a.role === "owner" && !remainingOwners.length && ["assigned", "researching", "designing", "implementing", "testing"].includes(task.status)) {
        setStatus(task, "available", "Owner unassigned");
      }
      audit("task.unassign", "task", task.id, `removed an assignee from ${task.key}`, href(task));
      return { ops, message: "Assignment removed" };
    }

    case "task.claim": {
      const task = findTask(db, cmd.taskId);
      allow("task.claim", { task });
      assertActive(task);
      const settings = db.settings[0];
      const res = evaluateClaim(settings, task, actor, db.assignments, db.claims, cmd.kind);
      must(res);
      if (res.outcome === "assigned") {
        ops.push({ op: "insert", c: "assignments", row: { id: ctx.newId(), taskId: task.id, memberId: actor.id, role: "owner", responsibility: "Primary owner (claimed)", assignedBy: actor.id, createdAt: now } });
        ops.push({ op: "insert", c: "claims", row: { id: ctx.newId(), taskId: task.id, memberId: actor.id, kind: "claim", message: cmd.message, status: "approved", decidedBy: null, createdAt: now, decidedAt: now } });
        setStatus(task, "assigned", "Claimed");
        audit("task.claim", "task", task.id, `claimed ${task.key}`, href(task));
        return { ops, message: `You now own ${task.key}`, data: { outcome: res.outcome } };
      }
      const kind = res.outcome === "interest" ? "interest" : cmd.kind === "claim" ? "request" : cmd.kind;
      ops.push({ op: "insert", c: "claims", row: { id: ctx.newId(), taskId: task.id, memberId: actor.id, kind, message: cmd.message, status: res.outcome === "interest" ? "pending" : "pending", decidedBy: null, createdAt: now, decidedAt: null } });
      audit("task.claim", "task", task.id, `${kind === "interest" ? "expressed interest in" : "requested"} ${task.key}`, href(task));
      return { ops, message: kind === "interest" ? "Interest recorded" : "Request sent to leads", data: { outcome: res.outcome } };
    }

    case "claim.decide": {
      const claim = db.claims.find((c) => c.id === cmd.claimId);
      if (!claim || claim.status !== "pending") throw new CommandError("No pending request found.");
      const task = findTask(db, claim.taskId);
      allow("task.decideClaim", { task });
      ops.push({ op: "update", c: "claims", id: claim.id, patch: { status: cmd.approve ? "approved" : "declined", decidedBy: actor.id, decidedAt: now } });
      if (cmd.approve && !db.assignments.some((a) => a.taskId === task.id && a.memberId === claim.memberId)) {
        const role = owners(db.assignments, task.id).length ? "contributor" : "owner";
        ops.push({ op: "insert", c: "assignments", row: { id: ctx.newId(), taskId: task.id, memberId: claim.memberId, role, responsibility: role === "owner" ? "Primary owner" : "Contributor", assignedBy: actor.id, createdAt: now } });
        if (role === "owner" && (task.status === "available" || task.status === "backlog") && !unmetBlockingPrereqs(db.tasks, db.dependencies, task.id).length) {
          setStatus(task, "assigned", "Request approved");
        }
      }
      notify(claim.memberId, "claim_decision", `${cmd.approve ? "Approved" : "Declined"}: ${task.key}`, task.title, href(task));
      audit("claim.decide", "task", task.id, `${cmd.approve ? "approved" : "declined"} a request for ${task.key}`, href(task));
      return { ops, message: cmd.approve ? "Request approved" : "Request declined" };
    }

    case "claim.withdraw": {
      const claim = db.claims.find((c) => c.id === cmd.claimId);
      if (!claim || claim.memberId !== actor.id) throw new CommandError("Request not found.");
      ops.push({ op: "update", c: "claims", id: claim.id, patch: { status: "withdrawn", decidedAt: now } });
      return { ops, message: "Request withdrawn" };
    }

    case "checklist.toggle": {
      const item = db.checklistItems.find((i) => i.id === cmd.itemId);
      if (!item) throw new CommandError("Checklist item not found.");
      const task = findTask(db, item.taskId);
      allow("task.checklist", { task });
      const items = db.checklistItems.filter((i) => i.taskId === task.id);
      must(canToggle(items, item.id, cmd.done));
      for (const ch of toggleEffects(items, item.id, cmd.done)) {
        ops.push({ op: "update", c: "checklistItems", id: ch.id, patch: { done: ch.done, doneBy: ch.done ? actor.id : null, doneAt: ch.done ? now : null } });
      }
      return { ops, message: cmd.done ? "Step completed" : "Step reopened" };
    }

    case "checklist.add": {
      const task = findTask(db, cmd.taskId);
      allow("task.checklist", { task });
      const siblings = db.checklistItems.filter((i) => i.taskId === task.id && i.parentId === cmd.parentId);
      if (cmd.parentId && !db.checklistItems.some((i) => i.id === cmd.parentId && i.taskId === task.id)) throw new CommandError("Parent step not found.");
      const row = { id: ctx.newId(), taskId: task.id, parentId: cmd.parentId, order: siblings.length, text: cmd.text, detail: "", required: cmd.required, done: false, doneBy: null, doneAt: null, ownerId: null, evidence: "", resourceIds: [] };
      ops.push({ op: "insert", c: "checklistItems", row });
      if (cmd.parentId) ops.push({ op: "update", c: "checklistItems", id: cmd.parentId, patch: { done: false, doneBy: null, doneAt: null } });
      return { ops, message: "Step added" };
    }

    case "checklist.update": {
      const item = db.checklistItems.find((i) => i.id === cmd.itemId);
      if (!item) throw new CommandError("Checklist item not found.");
      const task = findTask(db, item.taskId);
      allow("task.checklist", { task });
      if (cmd.ownerId && !db.assignments.some((a) => a.taskId === task.id && a.memberId === cmd.ownerId)) {
        throw new CommandError("Step owners must be assigned to the task.");
      }
      const patch: Record<string, unknown> = {};
      if (cmd.ownerId !== undefined) patch.ownerId = cmd.ownerId;
      if (cmd.evidence !== undefined) patch.evidence = cmd.evidence;
      if (cmd.text !== undefined) patch.text = cmd.text;
      ops.push({ op: "update", c: "checklistItems", id: item.id, patch });
      return { ops, message: "Step updated" };
    }

    case "checklist.delete": {
      const item = db.checklistItems.find((i) => i.id === cmd.itemId);
      if (!item) throw new CommandError("Checklist item not found.");
      const task = findTask(db, item.taskId);
      allow("task.edit", { task });
      const doomed = [item.id];
      for (let i = 0; i < doomed.length; i++) for (const c of db.checklistItems.filter((x) => x.parentId === doomed[i])) doomed.push(c.id);
      for (const d of doomed) ops.push({ op: "delete", c: "checklistItems", id: d });
      return { ops, message: "Step removed" };
    }

    case "dependency.add": {
      const from = findTask(db, cmd.fromTaskId);
      const to = findTask(db, cmd.toTaskId);
      allow("task.dependency", { task: to });
      if (db.dependencies.some((d) => d.fromTaskId === from.id && d.toTaskId === to.id)) throw new CommandError("Dependency already exists.");
      if (wouldCreateCycle(db.dependencies, from.id, to.id)) throw new CommandError(`Rejected: ${from.key} → ${to.key} would create a dependency cycle.`);
      ops.push({ op: "insert", c: "dependencies", row: { id: ctx.newId(), fromTaskId: from.id, toTaskId: to.id, kind: cmd.kind, note: cmd.note, createdAt: now } });
      audit("dependency.add", "task", to.id, `${to.key} now depends on ${from.key}`, href(to));
      return { ops, message: `${to.key} depends on ${from.key}` };
    }

    case "dependency.remove": {
      const dep = db.dependencies.find((d) => d.id === cmd.dependencyId);
      if (!dep) throw new CommandError("Dependency not found.");
      const to = findTask(db, dep.toTaskId);
      allow("task.dependency", { task: to });
      ops.push({ op: "delete", c: "dependencies", id: dep.id });
      audit("dependency.remove", "task", to.id, `removed a dependency from ${to.key}`, href(to));
      return { ops, message: "Dependency removed" };
    }

    case "comment.add": {
      const task = findTask(db, cmd.taskId);
      allow("task.comment", { task });
      if (cmd.parentId && !db.comments.some((c) => c.id === cmd.parentId && c.taskId === task.id)) throw new CommandError("Parent comment not found.");
      const mentions = parseMentions(cmd.body, db.members);
      const commentId = ctx.newId();
      ops.push({ op: "insert", c: "comments", row: { id: commentId, taskId: task.id, authorId: actor.id, parentId: cmd.parentId, kind: cmd.kind, body: cmd.body, mentions, createdAt: now, editedAt: null } });
      for (const m of mentions) notify(m, "mention", `${actor.name} mentioned you on ${task.key}`, cmd.body.slice(0, 140), `${href(task)}#comment-${commentId}`);
      if (cmd.parentId) {
        const parent = db.comments.find((c) => c.id === cmd.parentId)!;
        if (!mentions.includes(parent.authorId)) notify(parent.authorId, "mention", `${actor.name} replied on ${task.key}`, cmd.body.slice(0, 140), `${href(task)}#comment-${commentId}`);
      }
      audit("comment.add", "task", task.id, `commented on ${task.key}`, `${href(task)}#comment-${commentId}`);
      return { ops, message: "Comment posted" };
    }

    case "progress.add": {
      const task = findTask(db, cmd.taskId);
      allow("task.progress", { task });
      const { type: _t, taskId: _id, ...log } = cmd;
      void _t;
      void _id;
      ops.push({ op: "insert", c: "progressLogs", row: { id: ctx.newId(), taskId: task.id, memberId: actor.id, ...log, createdAt: now } });
      audit("progress.add", "task", task.id, `logged progress on ${task.key}`, href(task));
      return { ops, message: "Progress logged" };
    }

    case "deliverable.submit": {
      const task = findTask(db, cmd.taskId);
      allow("task.submit", { task });
      const d = db.deliverables.find((x) => x.id === cmd.deliverableId && x.taskId === task.id);
      if (!d) throw new CommandError("Deliverable not found on this task.");
      ops.push({ op: "insert", c: "submissions", row: { id: ctx.newId(), taskId: task.id, deliverableId: d.id, memberId: actor.id, url: cmd.url, note: cmd.note, createdAt: now } });
      audit("deliverable.submit", "task", task.id, `submitted “${d.title}” for ${task.key}`, href(task));
      return { ops, message: "Deliverable submitted" };
    }

    case "github.link": {
      const task = findTask(db, cmd.taskId);
      allow("task.github", { task });
      const parsedLink = parseGithubUrl(cmd.url);
      if (!parsedLink) throw new CommandError("Not a recognised GitHub PR, issue, commit or branch URL.");
      if (db.githubLinks.some((g) => g.taskId === task.id && g.url === parsedLink.url)) throw new CommandError("Already linked.");
      ops.push({
        op: "insert",
        c: "githubLinks",
        row: { id: ctx.newId(), taskId: task.id, ...parsedLink, title: cmd.title || parsedLink.title, state: "unknown", checks: "unknown", addedBy: actor.id, createdAt: now, syncedAt: null },
      });
      audit("github.link", "task", task.id, `linked ${parsedLink.kind} ${parsedLink.repo}${parsedLink.number ? "#" + parsedLink.number : ""} to ${task.key}`, href(task));
      return { ops, message: "GitHub link added" };
    }

    case "github.unlink": {
      const link = db.githubLinks.find((g) => g.id === cmd.linkId);
      if (!link) throw new CommandError("Link not found.");
      allow("task.github", { task: findTask(db, link.taskId) });
      ops.push({ op: "delete", c: "githubLinks", id: link.id });
      return { ops, message: "Link removed" };
    }

    case "review.request": {
      const task = findTask(db, cmd.taskId);
      allow("task.requestReview", { task });
      assertActive(task);
      const dod = definitionOfDone({ task, checklist: db.checklistItems, deliverables: db.deliverables, submissions: db.submissions, githubLinks: db.githubLinks, approved: false });
      must(canRequestReview(dod, task.status));
      const reviewerId = cmd.reviewerId ?? task.reviewerId;
      if (reviewerId && task.requiresIndependentReview && db.assignments.some((a) => a.taskId === task.id && a.memberId === reviewerId)) {
        throw new CommandError("Choose a reviewer who is not assigned to this task.");
      }
      if (reviewerId !== task.reviewerId) ops.push({ op: "update", c: "tasks", id: task.id, patch: { reviewerId } });
      must(canTransition(task, "in_review", { hasOwner: true, unmetBlockingDeps: [], viaReview: "request_review", actorIsLead: false }));
      setStatus(task, "in_review", "Review requested");
      const targets = reviewerId ? [reviewerId] : db.members.filter((m) => m.active && leadsTrack(m, task.trackId) && m.role !== "admin").map((m) => m.id);
      for (const m of targets) notify(m, "review_request", `Review requested: ${task.key}`, task.title, href(task));
      audit("review.request", "task", task.id, `requested review of ${task.key}`, href(task));
      return { ops, message: "Review requested" };
    }

    case "review.submit": {
      const task = findTask(db, cmd.taskId);
      allow("task.review", { task });
      must(canReview(actor.id, task, db.assignments));
      must(validateDecision(cmd.decision, cmd.ratings));
      ops.push({ op: "insert", c: "reviews", row: { id: ctx.newId(), taskId: task.id, reviewerId: actor.id, decision: cmd.decision, ratings: cmd.ratings, summary: cmd.summary, createdAt: now } });
      if (cmd.decision === "approved") {
        must(canTransition(task, "completed", { hasOwner: true, unmetBlockingDeps: [], viaReview: "approve", actorIsLead: true }));
        setStatus(task, "completed", "Approved by review");
        for (const m of teamOf(task.id)) notify(m, "approved", `Approved: ${task.key}`, cmd.summary.slice(0, 140), href(task));
        for (const dep of db.dependencies.filter((d) => d.fromTaskId === task.id)) {
          const down = db.tasks.find((t) => t.id === dep.toTaskId);
          if (!down) continue;
          for (const m of teamOf(down.id)) notify(m, "dependency_complete", `${task.key} complete — unblocks ${down.key}`, down.title, href(down));
        }
      } else {
        setStatus(task, "implementing", "Changes requested");
        for (const m of teamOf(task.id)) notify(m, "changes_requested", `Changes requested: ${task.key}`, cmd.summary.slice(0, 140), href(task));
      }
      audit("review.submit", "task", task.id, `${cmd.decision === "approved" ? "approved" : "requested changes on"} ${task.key}`, href(task));
      return { ops, message: cmd.decision === "approved" ? `${task.key} approved and completed` : "Changes requested" };
    }

    case "acceptance.verify": {
      const ac = db.acceptanceCriteria.find((a) => a.id === cmd.criterionId);
      if (!ac) throw new CommandError("Criterion not found.");
      const task = findTask(db, ac.taskId);
      allow("task.review", { task });
      ops.push({ op: "update", c: "acceptanceCriteria", id: ac.id, patch: { verified: cmd.verified, verifiedBy: cmd.verified ? actor.id : null } });
      return { ops, message: cmd.verified ? "Criterion verified" : "Verification cleared" };
    }

    case "sprint.create": {
      allow("sprint.manage");
      if (cmd.endDate < cmd.startDate) throw new CommandError("Sprint must end after it starts.");
      const sid = ctx.newId();
      ops.push({ op: "insert", c: "sprints", row: { id: sid, name: cmd.name, goal: cmd.goal, startDate: cmd.startDate, endDate: cmd.endDate, status: "planned", capacityHours: cmd.capacityHours, memberIds: [], retrospective: null, isProposed: true, createdAt: now, updatedAt: now } });
      audit("sprint.create", "sprint", sid, `created sprint ${cmd.name}`, "/sprints");
      return { ops, message: "Sprint created", data: { sprintId: sid } };
    }

    case "sprint.update": {
      allow("sprint.manage");
      const s = db.sprints.find((x) => x.id === cmd.sprintId);
      if (!s) throw new CommandError("Sprint not found.");
      const start = cmd.patch.startDate ?? s.startDate;
      const end = cmd.patch.endDate ?? s.endDate;
      if (end < start) throw new CommandError("Sprint must end after it starts.");
      ops.push({ op: "update", c: "sprints", id: s.id, patch: { ...cmd.patch, updatedAt: now } });
      audit("sprint.update", "sprint", s.id, `updated sprint ${s.name}`, "/sprints");
      return { ops, message: "Sprint updated" };
    }

    case "sprint.start": {
      allow("sprint.manage");
      const s = db.sprints.find((x) => x.id === cmd.sprintId);
      if (!s) throw new CommandError("Sprint not found.");
      if (s.status !== "planned") throw new CommandError("Only planned sprints can be started.");
      if (db.sprints.some((x) => x.status === "active")) throw new CommandError("Close the active sprint first.");
      ops.push({ op: "update", c: "sprints", id: s.id, patch: { status: "active", updatedAt: now } });
      for (const t of db.tasks.filter((t) => t.sprintId === s.id)) for (const m of teamOf(t.id)) notify(m, "sprint_change", `${s.name} started`, `${t.key} is in this sprint.`, "/sprints");
      audit("sprint.start", "sprint", s.id, `started ${s.name}`, "/sprints");
      return { ops, message: `${s.name} started` };
    }

    case "sprint.close": {
      allow("sprint.manage");
      const s = db.sprints.find((x) => x.id === cmd.sprintId);
      if (!s || s.status !== "active") throw new CommandError("Only the active sprint can be closed.");
      if (cmd.rolloverToSprintId) {
        const target = db.sprints.find((x) => x.id === cmd.rolloverToSprintId);
        if (!target || target.status === "completed") throw new CommandError("Rollover target must be a planned or active sprint.");
      }
      const incomplete = db.tasks.filter((t) => t.sprintId === s.id && t.status !== "completed");
      for (const t of incomplete) ops.push({ op: "update", c: "tasks", id: t.id, patch: { sprintId: cmd.rolloverToSprintId, updatedAt: now } });
      ops.push({ op: "update", c: "sprints", id: s.id, patch: { status: "completed", updatedAt: now } });
      audit("sprint.close", "sprint", s.id, `closed ${s.name}; ${incomplete.length} task(s) ${cmd.rolloverToSprintId ? "rolled over" : "returned to backlog"}`, "/sprints");
      return { ops, message: `${s.name} closed`, data: { rolledOver: incomplete.map((t) => t.key) } };
    }

    case "sprint.retro": {
      allow("sprint.manage");
      const s = db.sprints.find((x) => x.id === cmd.sprintId);
      if (!s) throw new CommandError("Sprint not found.");
      ops.push({ op: "update", c: "sprints", id: s.id, patch: { retrospective: { wentWell: cmd.wentWell, improve: cmd.improve, actions: cmd.actions }, updatedAt: now } });
      return { ops, message: "Retrospective saved" };
    }

    case "sprint.setTask": {
      const task = findTask(db, cmd.taskId);
      if (cmd.sprintId) assertActive(task);
      if (!isLead(actor)) allow("task.edit", { task });
      if (cmd.sprintId) {
        const s = db.sprints.find((x) => x.id === cmd.sprintId);
        if (!s || s.status === "completed") throw new CommandError("Choose a planned or active sprint.");
      }
      ops.push({ op: "update", c: "tasks", id: task.id, patch: { sprintId: cmd.sprintId, updatedAt: now } });
      for (const m of teamOf(task.id)) notify(m, "sprint_change", `${task.key} ${cmd.sprintId ? "added to a sprint" : "removed from sprint"}`, task.title, "/sprints");
      return { ops, message: cmd.sprintId ? "Added to sprint" : "Removed from sprint" };
    }

    case "milestone.create": {
      allow("milestone.manage");
      const mid = ctx.newId();
      ops.push({ op: "insert", c: "milestones", row: { id: mid, name: cmd.name, description: cmd.description, targetDate: cmd.targetDate, trackIds: cmd.trackIds, status: "proposed", createdAt: now } });
      audit("milestone.create", "milestone", mid, `created milestone ${cmd.name}`, "/roadmap");
      return { ops, message: "Milestone created" };
    }

    case "resource.add": {
      allow("resource.add");
      const r = resourceInput.safeParse(cmd.resource);
      if (!r.success) throw new CommandError(r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
      const dup = findDuplicate(db.resources, r.data.url);
      let resourceId = dup?.id;
      if (!dup) {
        resourceId = ctx.newId();
        // Lead-added links are marked verified on entry; member suggestions await lead verification.
        ops.push({ op: "insert", c: "resources", row: { id: resourceId, ...r.data, lastVerified: isLead(actor) ? now.slice(0, 10) : null, addedBy: actor.id, createdAt: now } });
      }
      if (cmd.taskId) {
        const task = findTask(db, cmd.taskId);
        if (db.taskResources.some((tr) => tr.taskId === task.id && tr.resourceId === resourceId)) throw new CommandError("Resource is already attached to this task.");
        ops.push({ op: "insert", c: "taskResources", row: { id: ctx.newId(), taskId: task.id, resourceId: resourceId!, category: cmd.category, order: 99, why: r.data.why, stepRefs: [] } });
      } else if (dup) {
        throw new CommandError(`Already in the library: “${dup.title}”.`);
      }
      audit("resource.add", "resource", resourceId!, `added resource “${r.data.title}”`, "/resources");
      return { ops, message: dup ? "Existing resource attached" : "Resource added" };
    }

    case "resource.verify": {
      allow("resource.manage");
      const r = db.resources.find((x) => x.id === cmd.resourceId);
      if (!r) throw new CommandError("Resource not found.");
      ops.push({ op: "update", c: "resources", id: r.id, patch: { lastVerified: now.slice(0, 10) } });
      return { ops, message: "Marked verified today" };
    }

    case "resource.delete": {
      allow("resource.manage");
      const r = db.resources.find((x) => x.id === cmd.resourceId);
      if (!r) throw new CommandError("Resource not found.");
      for (const tr of db.taskResources.filter((x) => x.resourceId === r.id)) ops.push({ op: "delete", c: "taskResources", id: tr.id });
      ops.push({ op: "delete", c: "resources", id: r.id });
      audit("resource.delete", "resource", r.id, `removed resource “${r.title}”`, "/resources");
      return { ops, message: "Resource removed" };
    }

    case "researchTodo.add": {
      allow("resource.add");
      ops.push({ op: "insert", c: "researchTodos", row: { id: ctx.newId(), topic: cmd.topic, note: cmd.note, trackId: cmd.trackId, taskId: cmd.taskId, status: "open", createdAt: now } });
      return { ops, message: "Research TODO added" };
    }

    case "researchTodo.toggle": {
      allow("resource.add");
      const todo = db.researchTodos.find((t) => t.id === cmd.todoId);
      if (!todo) throw new CommandError("TODO not found.");
      ops.push({ op: "update", c: "researchTodos", id: todo.id, patch: { status: todo.status === "open" ? "done" : "open" } });
      return { ops, message: "Updated" };
    }

    case "doc.create": {
      allow("doc.edit");
      const slugBase = cmd.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      let slug = slugBase || "doc";
      for (let i = 2; db.documents.some((d) => d.slug === slug); i++) slug = `${slugBase}-${i}`;
      const docId = ctx.newId();
      ops.push({ op: "insert", c: "documents", row: { id: docId, slug, title: cmd.title, category: cmd.category, tags: cmd.tags, ownerId: actor.id, body: cmd.body, status: "draft", adr: null, createdAt: now, updatedAt: now } });
      ops.push({ op: "insert", c: "documentRevisions", row: { id: ctx.newId(), documentId: docId, body: cmd.body, title: cmd.title, authorId: actor.id, summary: "Created", createdAt: now } });
      audit("doc.create", "document", docId, `created “${cmd.title}”`, `/docs/${slug}`);
      return { ops, message: "Document created", data: { slug } };
    }

    case "doc.update": {
      allow("doc.edit");
      const doc = db.documents.find((d) => d.id === cmd.docId);
      if (!doc) throw new CommandError("Document not found.");
      ops.push({ op: "update", c: "documents", id: doc.id, patch: { title: cmd.title, body: cmd.body, tags: cmd.tags, updatedAt: now } });
      ops.push({ op: "insert", c: "documentRevisions", row: { id: ctx.newId(), documentId: doc.id, body: cmd.body, title: cmd.title, authorId: actor.id, summary: cmd.summary || "Edited", createdAt: now } });
      audit("doc.update", "document", doc.id, `edited “${cmd.title}”`, `/docs/${doc.slug}`);
      return { ops, message: "Saved new revision" };
    }

    case "doc.restore": {
      allow("doc.edit");
      const rev = db.documentRevisions.find((r) => r.id === cmd.revisionId);
      if (!rev) throw new CommandError("Revision not found.");
      const doc = db.documents.find((d) => d.id === rev.documentId)!;
      ops.push({ op: "update", c: "documents", id: doc.id, patch: { title: rev.title, body: rev.body, updatedAt: now } });
      ops.push({ op: "insert", c: "documentRevisions", row: { id: ctx.newId(), documentId: doc.id, body: rev.body, title: rev.title, authorId: actor.id, summary: `Restored revision from ${rev.createdAt.slice(0, 16).replace("T", " ")}`, createdAt: now } });
      return { ops, message: "Revision restored" };
    }

    case "experiment.save": {
      allow("experiment.create");
      for (const m of cmd.metrics) if (!db.metricDefinitions.some((d) => d.key === m.metricKey)) throw new CommandError(`Unknown metric “${m.metricKey}”. Metrics need a definition first.`);
      if (cmd.taskId) findTask(db, cmd.taskId);
      const { type: _type, experimentId, ...fields } = cmd;
      void _type;
      if (experimentId) {
        const ex = db.experiments.find((e) => e.id === experimentId);
        if (!ex) throw new CommandError("Experiment not found.");
        if (ex.createdBy !== actor.id) allow("experiment.manage");
        ops.push({ op: "update", c: "experiments", id: ex.id, patch: { ...fields, updatedAt: now } });
        return { ops, message: "Experiment updated", data: { id: ex.id } };
      }
      const eid = ctx.newId();
      ops.push({ op: "insert", c: "experiments", row: { id: eid, ...fields, isDemo: false, createdBy: actor.id, createdAt: now, updatedAt: now } });
      audit("experiment.create", "experiment", eid, `recorded experiment “${cmd.name}”`, `/experiments/${eid}`);
      return { ops, message: "Experiment recorded", data: { id: eid } };
    }

    case "learning.toggle": {
      allow("learning.progress");
      if (!db.learningModules.some((m) => m.id === cmd.moduleId)) throw new CommandError("Module not found.");
      const existing = db.learningProgress.find((p) => p.memberId === actor.id && p.moduleId === cmd.moduleId);
      if (cmd.done && !existing) ops.push({ op: "insert", c: "learningProgress", row: { id: ctx.newId(), memberId: actor.id, moduleId: cmd.moduleId, completedAt: now } });
      if (!cmd.done && existing) ops.push({ op: "delete", c: "learningProgress", id: existing.id });
      return { ops };
    }

    case "notification.read": {
      const mine = db.notifications.filter((n) => n.memberId === actor.id && !n.read && (!cmd.notificationId || n.id === cmd.notificationId));
      for (const n of mine) ops.push({ op: "update", c: "notifications", id: n.id, patch: { read: true } });
      return { ops };
    }

    case "notification.prefs": {
      const existing = db.notificationPreferences.find((p) => p.memberId === actor.id);
      if (existing) ops.push({ op: "update", c: "notificationPreferences", id: existing.id, patch: { disabledKinds: cmd.disabledKinds } });
      else ops.push({ op: "insert", c: "notificationPreferences", row: { id: ctx.newId(), memberId: actor.id, disabledKinds: cmd.disabledKinds } });
      return { ops, message: "Preferences saved" };
    }

    case "view.save": {
      if (actor.role === "viewer") {
        // viewers may save personal views; nothing else to check
      }
      ops.push({ op: "insert", c: "savedViews", row: { id: ctx.newId(), memberId: actor.id, name: cmd.name, view: cmd.view, filters: cmd.filters, createdAt: now } });
      return { ops, message: "View saved" };
    }

    case "view.delete": {
      const v = db.savedViews.find((x) => x.id === cmd.viewId);
      if (!v || v.memberId !== actor.id) throw new CommandError("View not found.");
      ops.push({ op: "delete", c: "savedViews", id: v.id });
      return { ops, message: "View deleted" };
    }

    case "profile.update": {
      if (cmd.memberId !== actor.id) allow("member.manage");
      if (!db.members.some((m) => m.id === cmd.memberId)) throw new CommandError("Member not found.");
      ops.push({ op: "update", c: "members", id: cmd.memberId, patch: { ...cmd.patch, updatedAt: now } });
      return { ops, message: "Profile saved" };
    }

    case "member.create": {
      allow("member.manage");
      if (db.members.some((m) => m.active && m.name.toLowerCase() === cmd.name.toLowerCase())) throw new CommandError("A member with that name already exists.");
      const memberId = ctx.newId();
      const palette = ["#38bdf8", "#a78bfa", "#34d399", "#f59e0b", "#f472b6", "#22d3ee", "#84cc16", "#fb923c"];
      const color = palette[[...memberId].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0) % palette.length];
      ops.push({
        op: "insert",
        c: "members",
        row: {
          id: memberId, name: cmd.name, email: cmd.email, passwordHash: null, role: cmd.role, isDemo: false, primaryTrackId: cmd.primaryTrackId, secondaryTrackId: null,
          leadTrackIds: cmd.role === "track_lead" ? cmd.leadTrackIds : [], githubUsername: cmd.githubUsername, discordHandle: cmd.discordHandle, skills: [], experience: "new",
          availabilityHours: 5, bio: "", avatarColor: color, active: true, createdAt: now, updatedAt: now,
        } as never,
      });
      audit("member.create", "member", memberId, `added ${cmd.name} as ${cmd.role}`, `/team/${memberId}`);
      return { ops, message: `${cmd.name} added` };
    }

    case "member.setRole": {
      allow("member.manage");
      const m = db.members.find((x) => x.id === cmd.memberId);
      if (!m) throw new CommandError("Member not found.");
      if (m.id === actor.id && cmd.role !== "admin" && db.members.filter((x) => x.role === "admin" && x.active).length <= 1) {
        throw new CommandError("You are the last administrator; promote someone else first.");
      }
      ops.push({ op: "update", c: "members", id: m.id, patch: { role: cmd.role, leadTrackIds: cmd.role === "track_lead" ? cmd.leadTrackIds : [], updatedAt: now } });
      audit("member.setRole", "member", m.id, `set ${m.name}'s role to ${cmd.role}`, `/team/${m.id}`);
      return { ops, message: "Role updated" };
    }

    case "member.setActive": {
      allow("member.manage");
      const m = db.members.find((x) => x.id === cmd.memberId);
      if (!m) throw new CommandError("Member not found.");
      if (m.id === actor.id) throw new CommandError("You cannot deactivate yourself.");
      ops.push({ op: "update", c: "members", id: m.id, patch: { active: cmd.active, updatedAt: now } });
      audit("member.setActive", "member", m.id, `${cmd.active ? "reactivated" : "deactivated"} ${m.name}`, `/team/${m.id}`);
      return { ops, message: cmd.active ? "Member reactivated" : "Member deactivated" };
    }

    case "settings.update": {
      allow("settings.manage");
      const s = db.settings[0];
      ops.push({ op: "update", c: "settings", id: s.id, patch: { ...cmd.patch, updatedAt: now } });
      audit("settings.update", "settings", s.id, `updated settings (${Object.keys(cmd.patch).join(", ")})`, "/admin");
      return { ops, message: "Settings saved" };
    }

    case "readiness.recordE2E": {
      allow("readiness.record");
      if (cmd.demonstrated && !cmd.evidenceUrl) throw new CommandError("An end-to-end demonstration needs an evidence link (recording, bag or report).");
      const s = db.settings[0];
      ops.push({
        op: "update",
        c: "settings",
        id: s.id,
        patch: { e2eDemonstration: { demonstrated: cmd.demonstrated, evidenceUrl: cmd.evidenceUrl, recordedBy: actor.id, recordedAt: now }, updatedAt: now },
      });
      audit("readiness.recordE2E", "settings", s.id, cmd.demonstrated ? "recorded an end-to-end autonomous simulation demonstration" : "cleared the end-to-end demonstration flag", "/readiness");
      return { ops, message: "Readiness updated" };
    }
  }
}

export function parseMentions(body: string, members: Pick<Member, "id" | "name" | "githubUsername" | "active">[]): string[] {
  const handles = new Set([...body.matchAll(/(^|\s)@([A-Za-z0-9._-]{2,39})/g)].map((m) => m[2].toLowerCase()));
  return members
    .filter((m) => m.active && (handles.has((m.githubUsername ?? "").toLowerCase()) || handles.has(mentionHandle(m.name))))
    .map((m) => m.id);
}

export function mentionHandle(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "");
}

export function parseGithubUrl(url: string): { kind: "pr" | "issue" | "commit" | "branch"; repo: string; number: number | null; ref: string | null; url: string; title: string } | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.hostname !== "github.com") return null;
  const [owner, name, kind, ...rest] = u.pathname.split("/").filter(Boolean);
  if (!owner || !name || !kind) return null;
  const repo = `${owner}/${name}`;
  const clean = `https://github.com/${repo}/${kind}/${rest.join("/")}`;
  if (kind === "pull" && /^\d+$/.test(rest[0] ?? "")) return { kind: "pr", repo, number: +rest[0], ref: null, url: `https://github.com/${repo}/pull/${rest[0]}`, title: `${repo}#${rest[0]}` };
  if (kind === "issues" && /^\d+$/.test(rest[0] ?? "")) return { kind: "issue", repo, number: +rest[0], ref: null, url: `https://github.com/${repo}/issues/${rest[0]}`, title: `${repo}#${rest[0]}` };
  if (kind === "commit" && /^[0-9a-f]{7,40}$/.test(rest[0] ?? "")) return { kind: "commit", repo, number: null, ref: rest[0], url: clean, title: `${repo}@${rest[0].slice(0, 7)}` };
  if (kind === "tree" && rest.length) return { kind: "branch", repo, number: null, ref: rest.join("/"), url: clean, title: `${repo}:${rest.join("/")}` };
  return null;
}

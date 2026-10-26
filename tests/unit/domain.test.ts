import { describe, expect, it } from "vitest";
import { evaluateClaim } from "@/lib/domain/assignment";
import { canToggle, checklistProgress, nextIncomplete, toggleEffects } from "@/lib/domain/checklist";
import { layers, unmetBlockingPrereqs, wouldCreateCycle } from "@/lib/domain/dependencies";
import { authorize, type Actor } from "@/lib/domain/permissions";
import { computeReadiness } from "@/lib/domain/readiness";
import { findDuplicate, resourceInput, youTubeId } from "@/lib/domain/resources";
import { canRequestReview, canReview, definitionOfDone, validateDecision } from "@/lib/domain/review";
import { burndown, memberCapacity, rolloverCandidates, sprintStats } from "@/lib/domain/sprint";
import { canTransition, unblockTarget } from "@/lib/domain/status";
import type { ChecklistItem, Sprint, Task } from "@/lib/domain/types";
import { buildSeedDatabase } from "@/lib/seed/build";

const actor = (role: Actor["role"], leadTrackIds: Actor["leadTrackIds"] = [], id = "a1"): Actor => ({ id, role, leadTrackIds, active: true });
const sfTask = { id: "t1", trackId: "SF" as const };

describe("status transitions", () => {
  const base = { status: "available" as const, statusBeforeBlocked: null };
  const ctx = { hasOwner: true, unmetBlockingDeps: [], actorIsLead: false };

  it("requires an owner before active work", () => {
    expect(canTransition(base, "researching", { ...ctx, hasOwner: false }).ok).toBe(false);
    expect(canTransition(base, "researching", ctx).ok).toBe(true);
  });
  it("blocks Available/active states while hard prerequisites are incomplete", () => {
    const r = canTransition({ status: "backlog", statusBeforeBlocked: null }, "available", { ...ctx, unmetBlockingDeps: ["SF-01"] });
    expect(r).toEqual({ ok: false, reason: "Prerequisites not complete: SF-01" });
  });
  it("only reaches Completed through an approving review", () => {
    expect(canTransition({ status: "in_review", statusBeforeBlocked: null }, "completed", ctx).ok).toBe(false);
    expect(canTransition({ status: "in_review", statusBeforeBlocked: null }, "completed", { ...ctx, viaReview: "approve" }).ok).toBe(true);
  });
  it("only reaches In Review through a review request", () => {
    expect(canTransition({ status: "testing", statusBeforeBlocked: null }, "in_review", ctx).ok).toBe(false);
    expect(canTransition({ status: "testing", statusBeforeBlocked: null }, "in_review", { ...ctx, viaReview: "request_review" }).ok).toBe(true);
  });
  it("prevents non-leads from reopening completed work", () => {
    expect(canTransition({ status: "completed", statusBeforeBlocked: null }, "implementing", ctx).ok).toBe(false);
    expect(canTransition({ status: "completed", statusBeforeBlocked: null }, "implementing", { ...ctx, actorIsLead: true }).ok).toBe(true);
  });
  it("returns to the pre-blocked state when unblocked", () => {
    expect(unblockTarget({ statusBeforeBlocked: "testing" })).toBe("testing");
    expect(unblockTarget({ statusBeforeBlocked: null })).toBe("assigned");
  });
});

describe("authorization", () => {
  it("viewers are read-only", () => {
    expect(authorize(actor("viewer"), "task.comment").ok).toBe(false);
    expect(authorize(actor("viewer"), "task.claim").ok).toBe(false);
    expect(authorize(actor("viewer"), "learning.progress").ok).toBe(true);
  });
  it("members can update only tasks they are assigned to", () => {
    const m = actor("member", [], "m1");
    expect(authorize(m, "task.checklist", { task: sfTask, assignments: [] }).ok).toBe(false);
    expect(authorize(m, "task.checklist", { task: sfTask, assignments: [{ id: "x", taskId: "t1", memberId: "m1", role: "owner", responsibility: "", assignedBy: null, createdAt: "" }] }).ok).toBe(true);
  });
  it("track leads are scoped to their own track", () => {
    const tl = actor("track_lead", ["SF"]);
    expect(authorize(tl, "task.assign", { task: sfTask }).ok).toBe(true);
    expect(authorize(tl, "task.assign", { task: { id: "t2", trackId: "NV" } }).ok).toBe(false);
    expect(authorize(tl, "sprint.manage").ok).toBe(false);
  });
  it("only administrators manage members and settings", () => {
    expect(authorize(actor("autonomy_lead"), "member.manage").ok).toBe(false);
    expect(authorize(actor("admin"), "member.manage").ok).toBe(true);
    expect(authorize(actor("autonomy_lead"), "sprint.manage").ok).toBe(true);
  });
  it("deactivated and anonymous users are denied", () => {
    expect(authorize({ ...actor("admin"), active: false }, "task.comment").ok).toBe(false);
    expect(authorize(null, "task.comment").ok).toBe(false);
  });
});

describe("assignment rules", () => {
  const task = { id: "t1", status: "available" as const, claimable: true, backlog: "initial" as const };
  const member = { id: "m1", role: "member" as const };
  it("open mode assigns immediately when unowned", () => {
    expect(evaluateClaim({ claimMode: "open" }, task, member, [], [], "claim").outcome).toBe("assigned");
  });
  it("approval mode creates a pending request", () => {
    expect(evaluateClaim({ claimMode: "approval" }, task, member, [], [], "claim").outcome).toBe("pending");
  });
  it("disabled mode records interest only", () => {
    expect(evaluateClaim({ claimMode: "disabled" }, task, member, [], [], "claim").outcome).toBe("interest");
  });
  it("rejects claims on non-available or lead-assigned tasks", () => {
    expect(evaluateClaim({ claimMode: "open" }, { ...task, status: "backlog" }, member, [], [], "claim").ok).toBe(false);
    expect(evaluateClaim({ claimMode: "open" }, { ...task, claimable: false }, member, [], [], "claim").ok).toBe(false);
  });
  it("rejects duplicate pending requests", () => {
    const claims = [{ id: "c", taskId: "t1", memberId: "m1", kind: "request" as const, message: "", status: "pending" as const, decidedBy: null, createdAt: "", decidedAt: null }];
    expect(evaluateClaim({ claimMode: "approval" }, task, member, [], claims, "request").ok).toBe(false);
  });
});

const item = (id: string, parentId: string | null, done = false, order = 0): ChecklistItem => ({ id, taskId: "t", parentId, order, text: id, detail: "", required: true, done, doneBy: null, doneAt: null, ownerId: null, evidence: "", resourceIds: [] });

describe("checklist completion", () => {
  const items = [item("a", null, false, 0), item("a1", "a", true, 0), item("a2", "a", false, 1), item("b", null, false, 1)];
  it("blocks completing a parent with open children", () => {
    expect(canToggle(items, "a", true).ok).toBe(false);
  });
  it("auto-completes the parent when the last child completes", () => {
    expect(toggleEffects(items, "a2", true)).toEqual([{ id: "a2", done: true }, { id: "a", done: true }]);
  });
  it("counts progress by leaves", () => {
    expect(checklistProgress(items)).toEqual({ done: 1, total: 3, pct: 33 });
  });
  it("finds the next incomplete leaf in order", () => {
    expect(nextIncomplete(items)?.id).toBe("a2");
  });
});

describe("dependency cycle prevention", () => {
  const deps = [
    { fromTaskId: "A", toTaskId: "B" },
    { fromTaskId: "B", toTaskId: "C" },
  ];
  it("detects direct and transitive cycles", () => {
    expect(wouldCreateCycle(deps, "C", "A")).toBe(true);
    expect(wouldCreateCycle(deps, "B", "A")).toBe(true);
    expect(wouldCreateCycle(deps, "A", "A")).toBe(true);
    expect(wouldCreateCycle(deps, "A", "C")).toBe(false);
  });
  it("layers tasks topologically", () => {
    const l = layers(["A", "B", "C"], deps);
    expect([l.get("A"), l.get("B"), l.get("C")]).toEqual([0, 1, 2]);
  });
  it("the seeded dependency graph is acyclic and advanced tasks have unmet hard prerequisites", () => {
    const db = buildSeedDatabase();
    for (const d of db.dependencies) {
      const others = db.dependencies.filter((x) => x !== d);
      expect(wouldCreateCycle(others, d.fromTaskId, d.toTaskId)).toBe(false);
    }
    const sf05 = db.tasks.find((t) => t.key === "SF-05")!;
    expect(unmetBlockingPrereqs(db.tasks, db.dependencies, sf05.id)).toEqual(expect.arrayContaining(["SF-01", "PM-02"]));
  });
});

describe("review rules", () => {
  const db = buildSeedDatabase();
  const t = db.tasks.find((x) => x.key === "SF-02")!;
  it("Definition of Done is unmet on a fresh task", () => {
    const dod = definitionOfDone({ task: t, checklist: db.checklistItems, deliverables: db.deliverables, submissions: [], githubLinks: [], approved: false });
    expect(dod.every((d) => !d.met)).toBe(true);
    expect(canRequestReview(dod, "testing").ok).toBe(false);
  });
  it("every seeded task can satisfy its Definition of Done (docs + testing deliverables exist)", () => {
    for (const task of db.tasks) {
      const kinds = new Set(db.deliverables.filter((d) => d.taskId === task.id && d.required).map((d) => d.kind));
      expect(["tests", "benchmark", "media"].some((k) => kinds.has(k as never)), `${task.key} testing`).toBe(true);
      expect(["docs", "notebook", "diagram"].some((k) => kinds.has(k as never)), `${task.key} docs`).toBe(true);
    }
  });
  it("prevents self-approval when independent review is required", () => {
    const a = [{ id: "x", taskId: t.id, memberId: "m1", role: "owner" as const, responsibility: "", assignedBy: null, createdAt: "" }];
    expect(canReview("m1", { ...t, status: "in_review" }, a).ok).toBe(false);
    expect(canReview("m2", { ...t, status: "in_review" }, a).ok).toBe(true);
  });
  it("requires all dimensions and forbids approving with a failure", () => {
    const pass = { functional: "pass", documentation: "pass", testing: "pass", interfaces: "pass", performance: "na", safety: "pass", integration: "concern" } as const;
    expect(validateDecision("approved", pass).ok).toBe(true);
    expect(validateDecision("approved", { ...pass, safety: "fail" }).ok).toBe(false);
    expect(validateDecision("changes_requested", { ...pass, safety: "fail" }).ok).toBe(true);
    expect(validateDecision("approved", { functional: "pass" }).ok).toBe(false);
  });
});

describe("readiness computation", () => {
  it("is not-started everywhere for the seeded workspace (no invented progress)", () => {
    const r = computeReadiness(buildSeedDatabase());
    expect(r.map((s) => s.subsystem)).toEqual(["Localization", "Perception", "Navigation", "Simulation", "Mission Logic", "Integration & Testing", "Controls Interface", "Safety Decisions"]);
    for (const s of r) for (const c of Object.values(s.cells)) expect(c.state).toBe("not_started");
  });
  it("marks Tested only for completed tasks and Integrated only when gates complete", () => {
    const db = buildSeedDatabase();
    const set = (k: string, status: Task["status"]) => (db.tasks.find((t) => t.key === k)!.status = status);
    for (const k of ["SF-01", "SF-02", "SF-03"]) set(k, "completed");
    let loc = computeReadiness(db).find((s) => s.subsystem === "Localization")!;
    expect(loc.cells.tested.state).toBe("done");
    expect(loc.cells.integrated.state).not.toBe("done");
    set("AG-04", "completed");
    set("NV-02", "completed");
    loc = computeReadiness(db).find((s) => s.subsystem === "Localization")!;
    expect(loc.cells.integrated.state).toBe("done");
  });
  it("Implemented requires code evidence, not just status", () => {
    const db = buildSeedDatabase();
    db.tasks.find((t) => t.key === "SF-01")!.status = "testing";
    const loc = computeReadiness(db).find((s) => s.subsystem === "Localization")!;
    expect(loc.cells.implemented.done).toBe(0);
  });
});

describe("resource validation", () => {
  it("parses YouTube video ids and rejects malformed ones", () => {
    expect(youTubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(youTubeId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(youTubeId("https://www.youtube.com/watch?v=short")).toBeNull();
  });
  it("requires a rationale and a valid URL", () => {
    expect(resourceInput.safeParse({ title: "ROS docs", url: "not a url", publisher: "x", type: "docs", why: "Because it is canonical" }).success).toBe(false);
    expect(resourceInput.safeParse({ title: "ROS docs", url: "https://docs.ros.org/", publisher: "x", type: "docs", why: "short" }).success).toBe(false);
    expect(resourceInput.safeParse({ title: "ROS docs", url: "https://docs.ros.org/", publisher: "Open Robotics", type: "docs", why: "Canonical reference for ROS 2" }).success).toBe(true);
  });
  it("rejects video resources on non-video hosts", () => {
    expect(resourceInput.safeParse({ title: "Video", url: "https://example.com/v", publisher: "x", type: "video", why: "A tutorial video" }).success).toBe(false);
  });
  it("detects duplicates ignoring trailing slash and case", () => {
    expect(findDuplicate([{ id: "1", url: "https://docs.nav2.org/", title: "Nav2" }], "https://DOCS.nav2.org")?.id).toBe("1");
  });
  it("every seeded video is a valid YouTube video, playlist or channel URL with a verification date", () => {
    const db = buildSeedDatabase();
    const videos = db.resources.filter((r) => r.type === "video");
    expect(videos.length).toBeGreaterThan(30);
    for (const r of videos) {
      expect(youTubeId(r.url) !== null || /youtube\.com\/(@|playlist\?list=)/.test(r.url), r.url).toBe(true);
      expect(r.lastVerified, r.title).not.toBeNull();
      expect(r.duration, "durations are never invented").toBeNull();
    }
  });
});

describe("sprint calculations", () => {
  const db = buildSeedDatabase();
  const sprint = db.sprints[0] as Sprint;
  it("sums planned hours for sprint tasks", () => {
    const s = sprintStats(sprint, db.tasks, new Date("2026-10-30T12:00:00Z"));
    expect(s.taskCount).toBe(7);
    expect(s.plannedHours).toBe(db.tasks.filter((t) => t.sprintId === sprint.id).reduce((a, t) => a + t.estimateHours, 0));
    expect(s.daysTotal).toBe(12);
    expect(s.daysElapsed).toBe(5);
  });
  it("computes capacity from participating members' availability", () => {
    const members = [
      { id: "a", availabilityHours: 7 },
      { id: "b", availabilityHours: 14 },
    ];
    expect(memberCapacity({ ...sprint, memberIds: ["a", "b"] }, members)).toBe(Math.round(21 * (12 / 7)));
  });
  it("rolls over only incomplete tasks", () => {
    const tasks = db.tasks.map((t) => (t.key === "SIM-01" ? { ...t, status: "completed" as const } : t));
    expect(rolloverCandidates(sprint, tasks).map((t) => t.key)).not.toContain("SIM-01");
    expect(rolloverCandidates(sprint, tasks)).toHaveLength(6);
  });
  it("burndown starts at total planned hours", () => {
    const b = burndown(sprint, db.tasks, db.statusHistory);
    expect(b[0].remaining).toBe(sprintStats(sprint, db.tasks, new Date()).plannedHours);
    expect(b).toHaveLength(12);
  });
});

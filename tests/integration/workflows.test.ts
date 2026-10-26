import { describe, expect, it } from "vitest";
import { CommandError } from "@/lib/domain/commands";
import { ADMIN, Harness, LEAD, MEMBER_A, MEMBER_B, TRACK_LEAD_SF, VIEWER } from "../helpers";

const ratings = { functional: "pass", documentation: "pass", testing: "pass", interfaces: "pass", performance: "pass", safety: "pass", integration: "pass" } as const;

/** Drives a task through the full member workflow up to (not including) review. */
function completeWork(h: Harness, key: string, owner: string) {
  const t = h.task(key);
  for (const c of h.db.checklistItems.filter((c) => c.taskId === t.id && !h.db.checklistItems.some((x) => x.parentId === c.id))) {
    h.run(owner, { type: "checklist.toggle", itemId: c.id, done: true });
  }
  for (const d of h.db.deliverables.filter((d) => d.taskId === t.id && d.required)) {
    h.run(owner, { type: "deliverable.submit", taskId: t.id, deliverableId: d.id, url: `https://github.com/example/repo/blob/main/${d.id}.md` });
  }
  h.run(owner, { type: "github.link", taskId: t.id, url: "https://github.com/example/repo/pull/12" });
}

describe("task creation and editing", () => {
  it("lead creates a task with the next key; track lead cannot create outside scope", () => {
    const h = new Harness();
    const out = h.run(LEAD, { type: "task.create", title: "Wheel odometry noise study", trackId: "SF", priority: "medium", difficulty: "beginner", estimateHours: 8, problem: "Wheel odometry noise is uncharacterized.", goal: "Measured noise model for wheel odometry." });
    // SF-01..SF-08 exist; SF-06/SF-07 are also legacy keys, so numbering continues past every used key.
    expect(out.data?.key).toBe("SF-09");
    expect(h.task("SF-09").status).toBe("backlog");
    expect(() => h.run(TRACK_LEAD_SF, { type: "task.create", title: "Something in NV", trackId: "NV", priority: "low", difficulty: "beginner", estimateHours: 4, problem: "Problem statement here", goal: "Goal statement here" })).toThrow(CommandError);
  });
  it("edits metadata and spec fields with validation", () => {
    const h = new Harness();
    const t = h.task("SF-01");
    h.run(TRACK_LEAD_SF, { type: "task.update", taskId: t.id, patch: { priority: "high", dueDate: "2026-11-05" }, spec: { design: "Updated design" } });
    expect(h.task("SF-01").priority).toBe("high");
    expect(h.task("SF-01").spec.design).toBe("Updated design");
    expect(h.task("SF-01").spec.problem).toBe(t.spec.problem);
    expect(() => h.run(MEMBER_A, { type: "task.update", taskId: t.id, patch: { priority: "low" } })).toThrow(/Lead permission|Outside/);
  });
});

describe("claiming and assignment", () => {
  it("approval mode: member requests, lead approves → owner + Assigned", () => {
    const h = new Harness();
    const t = h.task("PM-04");
    const out = h.run(MEMBER_A, { type: "task.claim", taskId: t.id, kind: "claim", message: "Interested in datasets" });
    expect(out.data?.outcome).toBe("pending");
    const claim = h.db.claims.find((c) => c.taskId === t.id)!;
    h.run(LEAD, { type: "claim.decide", claimId: claim.id, approve: true });
    expect(h.db.assignments.find((a) => a.taskId === t.id)?.role).toBe("owner");
    expect(h.task("PM-04").status).toBe("assigned");
    expect(h.db.notifications.some((n) => n.memberId === MEMBER_A && n.kind === "claim_decision")).toBe(true);
  });
  it("open mode: member claims directly", () => {
    const h = new Harness();
    h.run(ADMIN, { type: "settings.update", patch: { claimMode: "open" } });
    const t = h.task("PM-04");
    h.run(MEMBER_A, { type: "task.claim", taskId: t.id, kind: "claim", message: "" });
    expect(h.task("PM-04").status).toBe("assigned");
  });
  it("viewers cannot claim; advanced tasks with unmet prerequisites are not claimable", () => {
    const h = new Harness();
    expect(() => h.run(VIEWER, { type: "task.claim", taskId: h.task("PM-04").id, kind: "claim", message: "" })).toThrow(CommandError);
    expect(() => h.run(MEMBER_A, { type: "task.claim", taskId: h.task("SF-05").id, kind: "claim", message: "" })).toThrow(/assigned by leads|Available/);
  });
  it("lead assigns primary owner and contributor; promoting a new owner demotes the old one", () => {
    const h = new Harness();
    const t = h.task("NV-01");
    h.run(LEAD, { type: "task.assign", taskId: t.id, memberId: MEMBER_A, role: "owner", responsibility: "A* baseline" });
    h.run(LEAD, { type: "task.assign", taskId: t.id, memberId: MEMBER_B, role: "contributor", responsibility: "S-Theta* port" });
    expect(h.task("NV-01").status).toBe("assigned");
    h.run(LEAD, { type: "task.assign", taskId: t.id, memberId: MEMBER_B, role: "owner", responsibility: "" });
    const roles = Object.fromEntries(h.db.assignments.filter((a) => a.taskId === t.id).map((a) => [a.memberId, a.role]));
    expect(roles).toEqual({ [MEMBER_A]: "contributor", [MEMBER_B]: "owner" });
  });
  it("track lead cannot assign outside their track", () => {
    const h = new Harness();
    expect(() => h.run(TRACK_LEAD_SF, { type: "task.assign", taskId: h.task("NV-01").id, memberId: MEMBER_A, role: "owner", responsibility: "" })).toThrow(/Outside your track|within their track/);
  });
});

describe("member execution: checklist, deliverables, review", () => {
  it("completes a checklist with nested steps and computes parent completion", () => {
    const h = new Harness();
    const t = h.task("SF-01");
    h.run(LEAD, { type: "task.assign", taskId: t.id, memberId: MEMBER_A, role: "owner", responsibility: "" });
    const parent = h.db.checklistItems.find((c) => c.taskId === t.id && c.text.startsWith("Define incoming"))!;
    const kids = h.db.checklistItems.filter((c) => c.parentId === parent.id);
    expect(() => h.run(MEMBER_A, { type: "checklist.toggle", itemId: parent.id, done: true })).toThrow(/sub-step/);
    for (const k of kids) h.run(MEMBER_A, { type: "checklist.toggle", itemId: k.id, done: true });
    expect(h.db.checklistItems.find((c) => c.id === parent.id)!.done).toBe(true);
    expect(() => h.run(MEMBER_B, { type: "checklist.toggle", itemId: kids[0].id, done: false })).toThrow(/assignees/);
  });

  it("cannot request review until the Definition of Done is met", () => {
    const h = new Harness();
    const t = h.task("SF-02");
    h.run(LEAD, { type: "task.assign", taskId: t.id, memberId: MEMBER_A, role: "owner", responsibility: "" });
    h.run(MEMBER_A, { type: "task.move", taskId: t.id, status: "implementing" });
    expect(() => h.run(MEMBER_A, { type: "review.request", taskId: t.id, reviewerId: null })).toThrow(/Definition of Done/);
  });

  it("full review workflow: request → changes requested → resubmit → approve → Completed", () => {
    const h = new Harness();
    const t = h.task("SF-02");
    h.run(TRACK_LEAD_SF, { type: "task.assign", taskId: t.id, memberId: MEMBER_A, role: "owner", responsibility: "" });
    h.run(MEMBER_A, { type: "task.move", taskId: t.id, status: "implementing" });
    completeWork(h, "SF-02", MEMBER_A);
    h.run(MEMBER_A, { type: "task.move", taskId: t.id, status: "testing" });
    h.run(MEMBER_A, { type: "review.request", taskId: t.id, reviewerId: TRACK_LEAD_SF });
    expect(h.task("SF-02").status).toBe("in_review");
    expect(h.db.notifications.some((n) => n.memberId === TRACK_LEAD_SF && n.kind === "review_request")).toBe(true);

    // Members cannot drag a task out of review or into Completed.
    expect(() => h.run(MEMBER_A, { type: "task.move", taskId: t.id, status: "completed" })).toThrow();

    h.run(TRACK_LEAD_SF, { type: "review.submit", taskId: t.id, decision: "changes_requested", ratings: { ...ratings, testing: "fail" }, summary: "Add the synthetic recovery test." });
    expect(h.task("SF-02").status).toBe("implementing");
    h.run(MEMBER_A, { type: "review.request", taskId: t.id, reviewerId: null });
    h.run(TRACK_LEAD_SF, { type: "review.submit", taskId: t.id, decision: "approved", ratings, summary: "Looks good; tests pass." });
    expect(h.task("SF-02").status).toBe("completed");
    expect(h.db.reviews.filter((r) => r.taskId === t.id)).toHaveLength(2);
    expect(h.db.statusHistory.filter((s) => s.taskId === t.id).map((s) => s.to)).toEqual(["available", "assigned", "implementing", "testing", "in_review", "implementing", "in_review", "completed"]);
  });

  it("prevents self-approval by an assignee even if they are a lead", () => {
    const h = new Harness();
    const t = h.task("SF-02");
    h.run(TRACK_LEAD_SF, { type: "task.assign", taskId: t.id, memberId: TRACK_LEAD_SF, role: "owner", responsibility: "" });
    h.run(TRACK_LEAD_SF, { type: "task.move", taskId: t.id, status: "implementing" });
    completeWork(h, "SF-02", TRACK_LEAD_SF);
    h.run(TRACK_LEAD_SF, { type: "review.request", taskId: t.id, reviewerId: LEAD });
    expect(() => h.run(TRACK_LEAD_SF, { type: "review.submit", taskId: t.id, decision: "approved", ratings, summary: "Self approve" })).toThrow(/independent review/);
    h.run(LEAD, { type: "review.submit", taskId: t.id, decision: "approved", ratings, summary: "Independent approval" });
    expect(h.task("SF-02").status).toBe("completed");
  });
});

describe("blockers, dependencies, resources", () => {
  it("blocking returns to the prior state when all blockers resolve", () => {
    const h = new Harness();
    const t = h.task("AG-07");
    h.run(LEAD, { type: "task.assign", taskId: t.id, memberId: MEMBER_B, role: "owner", responsibility: "" });
    h.run(MEMBER_B, { type: "task.move", taskId: t.id, status: "designing" });
    h.run(MEMBER_B, { type: "task.block", taskId: t.id, description: "Waiting on the Controls lead to review the draft" });
    expect(h.task("AG-07").status).toBe("blocked");
    expect(() => h.run(MEMBER_B, { type: "task.move", taskId: t.id, status: "implementing" })).toThrow(/Resolve open blockers/);
    const b = h.db.blockers.find((x) => x.taskId === t.id)!;
    h.run(MEMBER_B, { type: "blocker.resolve", blockerId: b.id, resolution: "Draft reviewed" });
    expect(h.task("AG-07").status).toBe("designing");
  });
  it("rejects dependency cycles", () => {
    const h = new Harness();
    // SF-01 already depends on AG-04; adding AG-04 ← SF-01 closes a loop.
    expect(() => h.run(LEAD, { type: "dependency.add", fromTaskId: h.task("SF-01").id, toTaskId: h.task("AG-04").id, kind: "blocks", note: "" })).toThrow(/cycle/);
    h.run(LEAD, { type: "dependency.add", fromTaskId: h.task("PM-04").id, toTaskId: h.task("PM-03").id, kind: "integrates", note: "" });
  });
  it("member-suggested resources are unverified until a lead verifies them; duplicates rejected", () => {
    const h = new Harness();
    h.run(MEMBER_A, { type: "resource.add", resource: { title: "Some tutorial", url: "https://example.org/tutorial", publisher: "Example", type: "tutorial", why: "Explains costmap inflation clearly" }, taskId: null });
    const r = h.db.resources.find((x) => x.url === "https://example.org/tutorial")!;
    expect(r.lastVerified).toBeNull();
    expect(() => h.run(MEMBER_A, { type: "resource.verify", resourceId: r.id })).toThrow();
    h.run(LEAD, { type: "resource.verify", resourceId: r.id });
    expect(h.db.resources.find((x) => x.id === r.id)!.lastVerified).toBe("2026-10-27");
    expect(() => h.run(MEMBER_A, { type: "resource.add", resource: { title: "Dup", url: "https://example.org/tutorial/", publisher: "Example", type: "tutorial", why: "Duplicate of the previous link" }, taskId: null })).toThrow(/Already in the library/);
  });
});

describe("sprint state", () => {
  it("start → close with rollover of incomplete tasks", () => {
    const h = new Harness();
    const s1 = h.db.sprints[0];
    const out = h.run(LEAD, { type: "sprint.create", name: "Sprint 02", goal: "Integration", startDate: "2026-11-09", endDate: "2026-11-20", capacityHours: 100 });
    const s2 = out.data!.sprintId as string;
    expect(() => h.run(MEMBER_A, { type: "sprint.start", sprintId: s1.id })).toThrow();
    h.run(LEAD, { type: "sprint.start", sprintId: s1.id });
    expect(() => h.run(LEAD, { type: "sprint.start", sprintId: s2 })).toThrow(/Close the active sprint/);
    const close = h.run(LEAD, { type: "sprint.close", sprintId: s1.id, rolloverToSprintId: s2 });
    expect((close.data!.rolledOver as string[]).sort()).toEqual(["AG-01", "AG-04", "AG-07", "NV-01", "PM-01", "SF-01", "SIM-01"]);
    expect(h.db.tasks.filter((t) => t.sprintId === s2)).toHaveLength(7);
    expect(h.db.sprints.find((s) => s.id === s1.id)!.status).toBe("completed");
  });
  it("viewer cannot comment; member can comment and mention", () => {
    const h = new Harness();
    const t = h.task("SF-01");
    expect(() => h.run(VIEWER, { type: "comment.add", taskId: t.id, parentId: null, kind: "discussion", body: "hi" })).toThrow();
    h.run(MEMBER_A, { type: "comment.add", taskId: t.id, parentId: null, kind: "question", body: "@demo.member.b which IMU topic?" });
    expect(h.db.notifications.some((n) => n.memberId === MEMBER_B && n.kind === "mention")).toBe(true);
  });
});

describe("archived tasks and external dependencies", () => {
  it("archived (externally owned) tasks cannot be claimed, assigned or moved until a lead restores them", () => {
    const h = new Harness();
    const cs02 = h.task("CS-02");
    expect(cs02.archived).toBe(true);
    expect(() => h.run(MEMBER_A, { type: "task.claim", taskId: cs02.id, kind: "interest", message: "" })).toThrow(/archived.*Controls/);
    expect(() => h.run(LEAD, { type: "task.assign", taskId: cs02.id, memberId: MEMBER_A, role: "owner", responsibility: "" })).toThrow(/archived/);
    expect(() => h.run(MEMBER_A, { type: "task.archive", taskId: cs02.id, archived: false, externalTeam: null, reason: "" })).toThrow();
    h.run(LEAD, { type: "task.archive", taskId: cs02.id, archived: false, externalTeam: null, reason: "" });
    expect(h.task("CS-02").archived).toBe(false);
    h.run(LEAD, { type: "task.assign", taskId: cs02.id, memberId: MEMBER_A, role: "owner", responsibility: "" });
  });

  it("leads can archive a task as another team's, with a reason; pending requests are declined", () => {
    const h = new Harness();
    const t = h.task("PM-04");
    h.run(MEMBER_A, { type: "task.claim", taskId: t.id, kind: "request", message: "" });
    expect(() => h.run(LEAD, { type: "task.archive", taskId: t.id, archived: true, externalTeam: "Electrical", reason: "" })).toThrow(/Explain/);
    h.run(LEAD, { type: "task.archive", taskId: t.id, archived: true, externalTeam: "Electrical", reason: "Hypothetical: owned elsewhere" });
    expect(h.task("PM-04")).toMatchObject({ archived: true, externalTeam: "Electrical", claimable: false });
    expect(h.db.claims.find((c) => c.taskId === t.id)?.status).toBe("declined");
  });

  it("track leads update external dependency status; members cannot; affected assignees are notified", () => {
    const h = new Harness();
    const dep = h.db.externalDependencies.find((d) => d.title.startsWith("Motion command"))!;
    h.run(LEAD, { type: "task.assign", taskId: h.task("AG-07").id, memberId: MEMBER_B, role: "owner", responsibility: "" });
    expect(() => h.run(MEMBER_A, { type: "externalDep.update", dependencyId: dep.id, patch: { status: "requested" } })).toThrow(/Leads only/);
    h.run(TRACK_LEAD_SF, { type: "externalDep.update", dependencyId: dep.id, patch: { status: "blocked", contact: "Controls lead", notes: "Waiting on fault codes" } });
    expect(h.db.externalDependencies.find((d) => d.id === dep.id)).toMatchObject({ status: "blocked", contact: "Controls lead" });
    expect(h.db.notifications.some((n) => n.memberId === MEMBER_B && n.kind === "blocker_new")).toBe(true);
  });
});

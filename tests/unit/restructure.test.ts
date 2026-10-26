import { describe, expect, it } from "vitest";
import { discordSummary } from "@/lib/domain/discord";
import { buildSeedDatabase, INITIAL_TASKS } from "@/lib/seed/build";

const db = buildSeedDatabase();
const active = db.tasks.filter((t) => !t.archived);

describe("autonomy team structure", () => {
  it("has exactly the five Discord-aligned categories", () => {
    expect(db.tracks.map((t) => `${t.emoji} ${t.discordChannel}`)).toEqual(["🧠 autonomy-general", "🕸️ sensor-fusion", "📸 perception", "🗺️ navigation", "🕹️ simulations"]);
    expect(db.tracks.filter((t) => t.coordination).map((t) => t.id)).toEqual(["AG"]);
  });

  it("puts every task in exactly one of the five categories", () => {
    const ids = new Set(db.tracks.map((t) => t.id));
    for (const t of db.tasks) expect(ids.has(t.trackId), t.key).toBe(true);
    for (const t of active) expect(t.key.startsWith(`${t.trackId}-`), `${t.key} prefix matches ${t.trackId}`).toBe(true);
  });

  it("moves mission logic and ROS integration into Autonomy General", () => {
    const ag = active.filter((t) => t.trackId === "AG").map((t) => t.title);
    for (const title of ["Autonomy Mission State Machine", "Excavation Action Interface", "Deposition Action Interface", "ROS 2 Autonomy Architecture", "ROS Bag Replay and Testing", "Autonomy Operator Visualization", "Autonomy-to-Controls Interface Specification", "End-to-End Autonomous Mission Demo"]) {
      expect(ag).toContain(title);
    }
  });

  it("archives Controls-owned work with an owning team and reason", () => {
    const archived = db.tasks.filter((t) => t.archived);
    expect(archived.map((t) => t.key).sort()).toEqual(["CS-01", "CS-02", "CS-03", "CS-05", "CS-06", "IT-05"]);
    for (const t of archived) {
      expect(t.externalTeam, t.key).not.toBeNull();
      expect(t.archivedReason.length, t.key).toBeGreaterThan(20);
      expect(t.claimable).toBe(false);
      expect(t.sprintId).toBeNull();
    }
  });

  it("assigns no low-level hardware implementation to active autonomy tasks", () => {
    const forbidden = /\b(PID tuning|motor driver|firmware|CAN[- ]bus|power distribution|duty cycle)\b/i;
    for (const t of active) {
      const steps = db.checklistItems.filter((c) => c.taskId === t.id).map((c) => c.text).join(" ");
      expect(forbidden.test(`${t.title} ${t.spec.goal} ${steps}`), t.key).toBe(false);
    }
  });

  it("keeps re-keyed tasks reachable by their old keys", () => {
    const legacy = new Map(db.tasks.flatMap((t) => t.legacyKeys.map((k) => [k, t.key] as const)));
    expect(legacy.get("MS-01")).toBe("AG-01");
    expect(legacy.get("IT-06")).toBe("AG-08");
    expect(legacy.get("SF-07")).toBe("PM-09");
    // A legacy key is never claimed twice.
    const all = db.tasks.flatMap((t) => t.legacyKeys);
    expect(new Set(all).size).toBe(all.length);
  });

  it("gives every task a Discord channel and the full engineering template", () => {
    for (const s of INITIAL_TASKS) {
      const t = db.tasks.find((x) => x.key === s.key)!;
      expect(t.spec.why.need, s.key).toBeTruthy();
      expect(t.spec.prerequisites.length, s.key).toBeGreaterThan(0);
      expect(t.spec.references.length, `${s.key} source references`).toBeGreaterThan(0);
      expect(t.spec.guidance.inputs.length + t.spec.guidance.outputs.length, `${s.key} ROS I/O`).toBeGreaterThan(0);
      expect(t.spec.testPlan.length, s.key).toBeGreaterThan(0);
      expect(t.spec.measure.length, s.key).toBeGreaterThan(0);
      const videos = db.taskResources.filter((r) => r.taskId === t.id && db.resources.find((x) => x.id === r.resourceId)?.type === "video");
      expect(videos.length, `${s.key} verified video`).toBeGreaterThan(0);
    }
  });

  it("links external dependencies to existing autonomy tasks", () => {
    const ids = new Set(db.tasks.map((t) => t.id));
    expect(db.externalDependencies.map((d) => d.team).sort()).toEqual(["Controls", "Controls", "Controls", "Electrical", "Hardware", "Mechanical"]);
    for (const d of db.externalDependencies) for (const id of d.taskIds) expect(ids.has(id)).toBe(true);
  });
});

describe("Discord summary", () => {
  const t = db.tasks.find((x) => x.key === "SF-01")!;
  const track = db.tracks.find((x) => x.id === "SF")!;
  const text = discordSummary(t, track, db.deliverables.filter((d) => d.taskId === t.id), db.acceptanceCriteria.filter((a) => a.taskId === t.id), "https://example.org/tasks/SF-01");

  it("follows the agreed format and fits Discord's limit", () => {
    expect(text.startsWith("**[SF-01] Rover Pose Estimation and Sensor Fusion**")).toBe(true);
    expect(text).toContain("Track: 🕸️ sensor-fusion");
    expect(text).toContain("Priority: Critical");
    expect(text).toContain("Status: Available");
    expect(text).toContain("**Goal:**");
    expect(text).toContain("**Read first:** lunabot_ros — `lunabot_config/params/robot_localization/ukf_params.yaml`");
    expect(text).toContain("<https://example.org/tasks/SF-01>");
    expect(text).toContain("**References:**");
    expect(text.length).toBeLessThanOrEqual(2000);
  });
});

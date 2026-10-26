import { statusRank } from "./status";
import type { Database, Task } from "./types";

export type Stage = "research" | "implemented" | "tested" | "integrated";
export const STAGES: Stage[] = ["research", "implemented", "tested", "integrated"];
export type CellState = "not_started" | "in_progress" | "done";

export interface ReadinessCell {
  state: CellState;
  done: number;
  total: number;
  evidence: string[];
}

export interface SubsystemReadiness {
  subsystem: string;
  note?: string;
  taskKeys: string[];
  cells: Record<Stage, ReadinessCell>;
}

/**
 * Subsystem → initial-backlog tasks, plus the integration gate: tasks that must be
 * complete before the subsystem counts as integrated into the full stack.
 */
export const SUBSYSTEMS: { name: string; keys: string[]; gate: string[]; note?: string }[] = [
  { name: "Localization", keys: ["SF-01", "SF-02", "SF-03"], gate: ["AG-04", "NV-02"] },
  { name: "Perception", keys: ["PM-01", "PM-02", "PM-03", "PM-04"], gate: ["AG-04", "NV-02"] },
  { name: "Navigation", keys: ["NV-01", "NV-02", "NV-03"], gate: ["AG-04", "AG-05"] },
  { name: "Simulation", keys: ["SIM-01", "SIM-02", "SIM-03"], gate: ["AG-04"] },
  { name: "Mission Logic", keys: ["AG-01", "AG-02", "AG-03"], gate: ["AG-04", "NV-02", "AG-05"] },
  { name: "Integration & Testing", keys: ["AG-04", "AG-05", "AG-06"], gate: ["AG-08"] },
  { name: "Controls Interface", keys: ["AG-07"], gate: ["AG-08"], note: "Autonomy side only. Controls' implementation is tracked as an external dependency and does not count here." },
  { name: "Safety Decisions", keys: ["SF-04"], gate: ["AG-01", "AG-07"], note: "Autonomy-level decisions (detect, slow, request safe stop). Physical safety and the E-stop are Controls/Electrical." },
];

function cell(done: number, total: number, evidence: string[], anyStarted: boolean): ReadinessCell {
  const state: CellState = total > 0 && done === total ? "done" : done > 0 || anyStarted ? "in_progress" : "not_started";
  return { state, done, total, evidence };
}

/**
 * Evidence rules (shown in the UI verbatim):
 *  - Research: task has moved past Researching (Designing or later).
 *  - Implemented: a code/PR deliverable is submitted or a PR/commit is linked, and status ≥ Testing.
 *  - Tested: task approved (Completed) — approval requires test evidence by the Definition of Done.
 *  - Integrated: all subsystem tasks complete AND every integration-gate task complete.
 */
export function computeReadiness(db: Pick<Database, "tasks" | "deliverables" | "submissions" | "githubLinks">): SubsystemReadiness[] {
  const byKey = new Map(db.tasks.map((t) => [t.key, t]));
  const submitted = new Set(db.submissions.map((s) => s.deliverableId));
  const hasCode = (t: Task) =>
    db.githubLinks.some((g) => g.taskId === t.id && (g.kind === "pr" || g.kind === "commit")) ||
    db.deliverables.some((d) => d.taskId === t.id && (d.kind === "code" || d.kind === "pr") && submitted.has(d.id));

  return SUBSYSTEMS.map(({ name, keys, gate, note }) => {
    const tasks = keys.map((k) => byKey.get(k)).filter((t): t is Task => !!t && !t.archived);
    const total = tasks.length;
    const started = tasks.some((t) => statusRank(t.status) >= statusRank("researching") || t.status === "blocked");

    const researched = tasks.filter((t) => statusRank(t.status) >= statusRank("designing"));
    const implemented = tasks.filter((t) => statusRank(t.status) >= statusRank("testing") && hasCode(t));
    const tested = tasks.filter((t) => t.status === "completed");
    const gateTasks = gate.map((k) => byKey.get(k)).filter((t): t is Task => !!t);
    const gateDone = gateTasks.filter((t) => t.status === "completed");
    const allDone = tested.length === total && total > 0;
    const integratedDone = allDone && gateDone.length === gateTasks.length ? total : 0;

    return {
      subsystem: name,
      note,
      taskKeys: keys,
      cells: {
        research: cell(researched.length, total, researched.map((t) => t.key), started),
        implemented: cell(implemented.length, total, implemented.map((t) => t.key), researched.length > 0),
        tested: cell(tested.length, total, tested.map((t) => t.key), implemented.length > 0),
        integrated: {
          ...cell(integratedDone, total, gateDone.map((t) => `${t.key} ✓`), tested.length > 0 || gateDone.length > 0),
          evidence: [
            ...gateTasks.map((t) => `${t.key} ${t.status === "completed" ? "complete" : "pending"}`),
          ],
        },
      },
    };
  });
}

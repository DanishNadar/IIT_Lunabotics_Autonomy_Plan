import { wouldCreateCycle } from "../domain/dependencies";
import type {
  AcceptanceCriterion,
  ChecklistItem,
  Database,
  Deliverable,
  Experiment,
  ExternalDependency,
  Member,
  Milestone,
  Sprint,
  Task,
  TaskDependency,
  TaskResource,
} from "../domain/types";
import { emptyDatabase } from "../domain/types";
import { buildComponents, buildMetrics } from "./architecture";
import { buildDocuments } from "./documents";
import { SEED_TIME, seedId } from "./ids";
import { buildLearning } from "./learning";
import { buildRepositories, buildResearchTodos, buildResources, resourceId, RESOURCE_SEED } from "./resources";
import { ADVANCED_TASKS } from "./tasks/advanced";
import { AG_INTEGRATION_TASKS } from "./tasks/ag-integration";
import { AG_INTERFACE_TASKS } from "./tasks/ag-interfaces";
import { AG_MISSION_TASKS } from "./tasks/ag-mission";
import { ARCHIVED_CONTROLS_TASKS } from "./tasks/archived";
import type { TaskSeed } from "./tasks/define";
import { NV_TASKS } from "./tasks/nv";
import { TASK_VIDEOS } from "./tasks/videos";
import { PM_TASKS } from "./tasks/pm";
import { SF_TASKS } from "./tasks/sf";
import { SIM_TASKS } from "./tasks/sim";
import { buildTracks, subtrackId } from "./tracks";

/** Current seed/data version. Bump together with a new migration in src/lib/migrations. */
export const DATA_VERSION = 2;

const byKey = (a: TaskSeed, b: TaskSeed) => a.key.localeCompare(b.key, undefined, { numeric: true });
const AG_TASKS = [...AG_MISSION_TASKS, ...AG_INTEGRATION_TASKS, ...AG_INTERFACE_TASKS].sort(byKey);

/** Active initial-backlog tasks, by category. */
export const INITIAL_TASKS: TaskSeed[] = [...AG_TASKS, ...SF_TASKS, ...PM_TASKS, ...NV_TASKS, ...SIM_TASKS];
export const ALL_TASK_SEEDS: TaskSeed[] = [...INITIAL_TASKS, ...ADVANCED_TASKS, ...ARCHIVED_CONTROLS_TASKS];

/** Base for deterministic ids: re-keyed tasks keep their original identity. */
export const idBase = (s: Pick<TaskSeed, "key" | "origin" | "isNew">) => (s.isNew ? `v2:${s.key}` : s.origin ?? s.key);
export const taskSeedId = (s: Pick<TaskSeed, "key" | "origin" | "isNew">) => seedId(`task:${idBase(s)}`);

const SEED_BY_KEY = new Map(ALL_TASK_SEEDS.map((s) => [s.key, s]));
/** UUID of the seeded task currently holding `key`. */
export const taskIdFor = (key: string) => {
  const s = SEED_BY_KEY.get(key);
  if (!s) throw new Error(`Unknown task key ${key}`);
  return taskSeedId(s);
};

export const SPRINT_01_KEYS = ["SIM-01", "AG-04", "SF-01", "PM-01", "NV-01", "AG-07", "AG-01"];

const MILESTONES: (Omit<Milestone, "id" | "createdAt" | "status"> & { slug: string; keys: string[] })[] = [
  { slug: "m1", name: "M1 · Autonomy foundations in simulation", description: "Arena, ROS 2 architecture, the Controls interface contract, and first versions of localization, costmap, planner and mission logic. Proposed internal date — lead to confirm.", targetDate: "2026-11-06", trackIds: ["AG", "SF", "PM", "NV", "SIM"], keys: SPRINT_01_KEYS },
  { slug: "m2", name: "M2 · Autonomous navigation in simulation", description: "Nav2 integrated with estimated localization and costmaps through the mock Controls interface, with localization confidence monitoring. Proposed internal date.", targetDate: "2026-12-11", trackIds: ["SF", "PM", "NV", "SIM", "AG"], keys: ["NV-02", "SF-02", "SF-03", "SF-04", "PM-02", "PM-03", "SIM-02"] },
  { slug: "m3", name: "M3 · End-to-end autonomous mission in simulation", description: "Excavation/deposition interfaces, goal selection, replay testing, operator visualization and the AG-08 end-to-end demo. Proposed internal date.", targetDate: "2027-02-12", trackIds: ["AG", "NV", "SIM", "PM"], keys: ["AG-02", "AG-03", "NV-03", "AG-05", "AG-06", "SIM-03", "PM-04", "AG-08"] },
  { slug: "m4", name: "M4 · Robustness and benchmarks", description: "Advanced backlog: benchmarks, robustness, recovery, scenario generation, regression automation and CI. Proposed internal date.", targetDate: "2027-04-02", trackIds: ["AG", "SF", "PM", "NV", "SIM"], keys: ADVANCED_TASKS.filter((t) => !t.archived).map((t) => t.key) },
];

const DEMO_MEMBERS: Omit<Member, "id" | "createdAt" | "updatedAt" | "passwordHash" | "isDemo" | "active">[] = [
  { name: "Demo Administrator", email: "demo-admin@demo.local", role: "admin", primaryTrackId: "AG", secondaryTrackId: null, leadTrackIds: [], githubUsername: null, discordHandle: null, skills: ["administration"], experience: "experienced", availabilityHours: 4, bio: "Demo account for exploring administration features. Not a real person.", avatarColor: "#ef4444" },
  { name: "Demo Autonomy Lead", email: "demo-lead@demo.local", role: "autonomy_lead", primaryTrackId: "AG", secondaryTrackId: null, leadTrackIds: [], githubUsername: null, discordHandle: null, skills: ["ros2", "systems integration", "planning"], experience: "experienced", availabilityHours: 10, bio: "Demo account with Autonomy Lead permissions. Not a real person.", avatarColor: "#f97316" },
  { name: "Demo Track Lead (SF)", email: "demo-tracklead@demo.local", role: "track_lead", primaryTrackId: "SF", secondaryTrackId: "PM", leadTrackIds: ["SF"], githubUsername: null, discordHandle: null, skills: ["kalman filters", "ros2", "python"], experience: "experienced", availabilityHours: 8, bio: "Demo account leading 🕸️ sensor-fusion. Not a real person.", avatarColor: "#38bdf8" },
  { name: "Demo Member A", email: "demo-member-a@demo.local", role: "member", primaryTrackId: "SF", secondaryTrackId: "SIM", leadTrackIds: [], githubUsername: null, discordHandle: null, skills: ["python", "linear algebra"], experience: "some", availabilityHours: 6, bio: "Demo team member. Not a real person.", avatarColor: "#22c55e" },
  { name: "Demo Member B", email: "demo-member-b@demo.local", role: "member", primaryTrackId: "NV", secondaryTrackId: "AG", leadTrackIds: [], githubUsername: null, discordHandle: null, skills: ["c++", "algorithms"], experience: "some", availabilityHours: 8, bio: "Demo team member. Not a real person.", avatarColor: "#a78bfa" },
  { name: "Demo Member C", email: "demo-member-c@demo.local", role: "member", primaryTrackId: "SIM", secondaryTrackId: "PM", leadTrackIds: [], githubUsername: null, discordHandle: null, skills: ["cad", "gazebo"], experience: "new", availabilityHours: 5, bio: "Demo team member, new to ROS. Not a real person.", avatarColor: "#eab308" },
  { name: "Demo Viewer", email: "demo-viewer@demo.local", role: "viewer", primaryTrackId: null, secondaryTrackId: null, leadTrackIds: [], githubUsername: null, discordHandle: null, skills: [], experience: "new", availabilityHours: 0, bio: "Read-only demo account. Not a real person.", avatarColor: "#64748b" },
];

export const demoMemberId = (email: string) => seedId(`member:${email}`);

const EXTERNAL_DEPS: (Omit<ExternalDependency, "id" | "taskIds" | "createdAt" | "updatedAt" | "status" | "contact" | "notes"> & { slug: string; keys: string[] })[] = [
  { slug: "controls-motion", team: "Controls", title: "Motion command interface, status and faults", description: "Controls' side of the AG-07 contract: accept timestamped velocity requests, enforce limits, publish ControlsStatus and honor safe-stop requests.", needs: ["Accept geometry_msgs/TwistStamped on /autonomy/cmd_vel and reject requests older than the agreed validity window", "Publish ControlsStatus (mode, motion_enabled, estop_active, max velocities, faults) at ≥ 10 Hz", "Implement the safe-stop request service and report the result", "Agree fault codes"], workaround: "mock_controls.py in simulation (AG-07).", keys: ["AG-07", "NV-02", "AG-01"] },
  { slug: "controls-actions", team: "Controls", title: "Excavation and deposition action servers", description: "Real implementations of Excavate.action and Deposit.action as documented in docs/interfaces/.", needs: ["Implement the agreed action definitions", "Report reason codes for failures (stall, timeout, fault)", "Report a material estimate when available", "Honor cancellation within an agreed time"], workaround: "Mock action servers with configurable outcomes (AG-02, AG-03).", keys: ["AG-02", "AG-03"] },
  { slug: "controls-odometry", team: "Controls", title: "Wheel odometry feedback on hardware", description: "nav_msgs/Odometry from wheel encoders with covariance, published by Controls on the real rover.", needs: ["Publish /wheel/odometry with filled twist covariance", "Do not publish the odom → base_link transform (SF-01 owns it)", "Document encoder resolution and wheel geometry used"], workaround: "Simulated drivetrain plugin (SIM-02).", keys: ["SF-01"] },
  { slug: "mechanical-geometry", team: "Mechanical", title: "Rover dimensions, mass properties and mechanism constraints", description: "Authoritative geometry for the simulation model, costmap footprint and deposition alignment.", needs: ["Overall dimensions and footprint", "Mass and inertia estimates", "Wheel radius, track width, wheelbase", "Joint axes and limits of the excavation/deposition mechanism", "Sensor mounting positions", "Deposition approach direction and alignment tolerance"], workaround: "Clearly labeled approximations in SIM-02 (config/approximations.yaml).", keys: ["SIM-02", "PM-01", "AG-03"] },
  { slug: "electrical-sensors", team: "Electrical", title: "Sensor power and communication requirements", description: "How sensors connect and are synchronized, so simulation and drivers match reality.", needs: ["Interface per sensor (Ethernet/USB/serial) and data rates", "Time synchronization approach", "Radar detection output format if radar is adopted"], workaround: "Documented assumptions in SIM-04 and SF-05.", keys: ["SF-05", "SIM-04", "PM-09"] },
  { slug: "hardware-sensor-specs", team: "Hardware", title: "Sensor specifications and mounting", description: "Exact sensor models and mounting poses for calibration and simulation fidelity.", needs: ["LiDAR, camera and IMU models with datasheets", "Mounting positions and orientations (from CAD)", "Field of view and update rates"], workaround: "Nominal CAD values; recalibrate with SF-02 once hardware exists.", keys: ["SF-02", "SIM-04"] },
];

/** Rows introduced by the v2 restructure — the migration inserts these only if missing. */
export const NEW_IN_V2 = {
  taskIds: new Set(ALL_TASK_SEEDS.filter((s) => s.isNew).map(taskSeedId)),
  resourceIds: new Set(Object.entries(RESOURCE_SEED).filter(([, r]) => (r.since ?? 1) >= 2).map(([slug]) => resourceId(slug))),
  documentSlugs: new Set(["autonomy-team-structure", "external-team-interfaces"]),
  learningPathSlugs: new Set(["mission-integration"]),
  componentKeys: new Set(["loc-confidence", "ctl-interface"]),
  researchTodoTopics: new Set(["Find a verified SLAM lecture series", "Obtain the Controls team's motion command contract", "Verified videos for remaining advanced tasks"]),
  externalDependencyIds: new Set(EXTERNAL_DEPS.map((d) => seedId(`extdep:${d.slug}`))),
};

function expandTask(seed: TaskSeed, milestoneId: string | null, sprintId: string | null) {
  const id = taskSeedId(seed);
  const base = idBase(seed);
  const task: Task = {
    id,
    key: seed.key,
    title: seed.title,
    trackId: seed.track,
    subtrackId: subtrackId(seed.track, seed.subtrack),
    priority: seed.priority,
    difficulty: seed.difficulty,
    estimateHours: seed.estimate,
    status: seed.status ?? "available",
    statusBeforeBlocked: null,
    backlog: seed.backlog ?? "initial",
    sprintId,
    milestoneId,
    startDate: null,
    dueDate: null,
    reviewerId: null,
    requiresIndependentReview: true,
    claimable: seed.claimable ?? true,
    labels: seed.labels ?? [],
    spec: {
      problem: seed.problem,
      goal: seed.goal,
      why: seed.why,
      background: seed.background,
      prerequisites: seed.prerequisites.map(([concept, why, res]) => ({ concept, why, resourceIds: res.map(resourceId) })),
      readFirst: seed.readFirst,
      references: seed.references,
      analyze: seed.analyze,
      design: seed.design,
      guidance: seed.guidance,
      testPlan: seed.testPlan,
      measure: seed.measure,
      document: seed.document,
      integrate: seed.integrate,
      researchNeeded: seed.researchNeeded,
    },
    legacyKeys: seed.origin && seed.origin !== seed.key ? [seed.origin] : [],
    archived: seed.archived ?? false,
    externalTeam: seed.externalTeam ?? null,
    archivedReason: seed.archivedReason ?? "",
    createdBy: null,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
    statusChangedAt: SEED_TIME,
  };

  const checklist: ChecklistItem[] = [];
  seed.steps.forEach((step, i) => {
    const s = typeof step === "string" ? { text: step } : step;
    const itemId = seedId(`check:${base}:${i}`);
    checklist.push({ id: itemId, taskId: id, parentId: null, order: i, text: s.text, detail: s.detail ?? "", required: true, done: false, doneBy: null, doneAt: null, ownerId: null, evidence: "", resourceIds: (s.resources ?? []).map(resourceId) });
    (s.sub ?? []).forEach((sub, j) => {
      checklist.push({ id: seedId(`check:${base}:${i}:${j}`), taskId: id, parentId: itemId, order: j, text: sub, detail: "", required: true, done: false, doneBy: null, doneAt: null, ownerId: null, evidence: "", resourceIds: [] });
    });
  });

  const deliverables: Deliverable[] = seed.deliverables.map(([kind, title, required], i) => ({ id: seedId(`deliv:${base}:${i}`), taskId: id, order: i, title, kind, required: required ?? true }));
  // The Definition of Done requires documentation and testing evidence, so every
  // task must carry a required deliverable of each kind.
  const has = (kinds: Deliverable["kind"][]) => deliverables.some((d) => d.required && kinds.includes(d.kind));
  if (!has(["tests", "benchmark", "media"])) {
    deliverables.push({ id: seedId(`deliv:${base}:testing`), taskId: id, order: deliverables.length, title: "Testing evidence (test output, benchmark results or recording)", kind: "tests", required: true });
  }
  if (!has(["docs", "notebook", "diagram"])) {
    deliverables.push({ id: seedId(`deliv:${base}:docs`), taskId: id, order: deliverables.length, title: "README / documentation", kind: "docs", required: true });
  }
  const acceptance: AcceptanceCriterion[] = seed.acceptance.map((a, i) => {
    const o = typeof a === "string" ? { text: a, target: null, rationale: null } : a;
    return { id: seedId(`ac:${base}:${i}`), taskId: id, order: i, text: o.text, target: o.target, rationale: o.rationale, verified: false, verifiedBy: null };
  });
  const resourceRows: TaskSeed["resources"] = [...seed.resources];
  for (const [slug, why, steps] of TASK_VIDEOS[seed.key] ?? []) {
    if (!resourceRows.some(([s]) => s === slug)) resourceRows.push([slug, "video_tutorial", why, steps]);
  }
  const taskResources: TaskResource[] = resourceRows.map(([slug, category, why, steps], i) => ({ id: seedId(`tr:${base}:${slug}`), taskId: id, resourceId: resourceId(slug), category, order: i, why, stepRefs: steps ?? [] }));
  const history = { id: seedId(`hist:${base}`), taskId: id, from: null, to: task.status, changedBy: null, note: "Seeded", createdAt: SEED_TIME };
  return { task, checklist, deliverables, acceptance, taskResources, history };
}

/** Deterministic seed database. Contains no real people, progress or measured results. */
export function buildSeedDatabase(): Database {
  const db = emptyDatabase();
  db.settings.push({
    id: seedId("settings"),
    dataVersion: DATA_VERSION,
    organization: "Illinois Tech Robotics — NASA Lunabotics 2027",
    team: "Autonomy Team",
    claimMode: "approval",
    allowSelfRegistration: true,
    e2eDemonstration: { demonstrated: false, evidenceUrl: null, recordedBy: null, recordedAt: null },
    updatedAt: SEED_TIME,
  });

  db.members = DEMO_MEMBERS.map((m) => ({ ...m, id: demoMemberId(m.email), passwordHash: null, isDemo: true, active: true, createdAt: SEED_TIME, updatedAt: SEED_TIME }));

  const { tracks, subtracks } = buildTracks();
  db.tracks = tracks;
  db.subtracks = subtracks;
  db.resources = buildResources();
  db.repositories = buildRepositories();
  db.researchTodos = buildResearchTodos();

  const sprint: Sprint = {
    id: seedId("sprint:01"),
    name: "Sprint 01 — Autonomy Foundations",
    goal: "Stand up the simulated arena, the ROS 2 autonomy architecture and the Autonomy↔Controls interface contract, and produce first working versions of localization, the traversability costmap, global planning and the mission state machine.",
    startDate: "2026-10-26",
    endDate: "2026-11-06",
    status: "planned",
    capacityHours: 0,
    memberIds: [],
    retrospective: null,
    isProposed: true,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  };
  db.sprints.push(sprint);

  const milestoneOf = new Map<string, string>();
  for (const m of MILESTONES) {
    const id = seedId(`milestone:${m.slug}`);
    db.milestones.push({ id, name: m.name, description: m.description, targetDate: m.targetDate, trackIds: m.trackIds, status: "proposed", createdAt: SEED_TIME });
    for (const k of m.keys) milestoneOf.set(k, id);
  }

  const keys = new Set<string>();
  for (const seed of ALL_TASK_SEEDS) {
    if (keys.has(seed.key)) throw new Error(`Duplicate task key ${seed.key}`);
    keys.add(seed.key);
    const x = expandTask(seed, seed.archived ? null : milestoneOf.get(seed.key) ?? null, SPRINT_01_KEYS.includes(seed.key) ? sprint.id : null);
    db.tasks.push(x.task);
    db.checklistItems.push(...x.checklist);
    db.deliverables.push(...x.deliverables);
    db.acceptanceCriteria.push(...x.acceptance);
    db.taskResources.push(...x.taskResources);
    db.statusHistory.push(x.history);
  }
  if (new Set(db.tasks.map((t) => t.id)).size !== db.tasks.length) throw new Error("Task id collision in seed");

  const deps: TaskDependency[] = [];
  for (const seed of ALL_TASK_SEEDS) {
    for (const [from, kind, note] of seed.deps ?? []) {
      if (!keys.has(from)) throw new Error(`${seed.key} depends on unknown task ${from}`);
      const fromId = taskIdFor(from);
      const toId = taskSeedId(seed);
      if (wouldCreateCycle(deps, fromId, toId)) throw new Error(`Seed dependency cycle: ${from} → ${seed.key}`);
      deps.push({ id: seedId(`dep:${idBase(SEED_BY_KEY.get(from)!)}->${idBase(seed)}`), fromTaskId: fromId, toTaskId: toId, kind, note, createdAt: SEED_TIME });
    }
  }
  db.dependencies = deps;

  db.externalDependencies = EXTERNAL_DEPS.map(({ slug, keys: depKeys, ...d }) => ({ ...d, id: seedId(`extdep:${slug}`), taskIds: depKeys.map(taskIdFor), status: "not_requested", contact: "", notes: "", createdAt: SEED_TIME, updatedAt: SEED_TIME }));

  const learning = buildLearning();
  db.learningPaths = learning.paths;
  db.learningModules = learning.modules;
  const docs = buildDocuments();
  db.documents = docs.documents;
  db.documentRevisions = docs.revisions;
  db.components = buildComponents();
  db.metricDefinitions = buildMetrics();
  db.experiments = demoExperiments();
  db.auditEvents.push({ id: seedId("audit:seed"), actorId: null, action: "system.seed", entity: "workspace", entityId: seedId("settings"), summary: "Workspace seeded with the autonomy team's five categories, engineering tasks, resources, learning paths and starter docs", href: "/", createdAt: SEED_TIME });
  return db;
}

function demoExperiments(): Experiment[] {
  const base = { createdBy: null, createdAt: SEED_TIME, updatedAt: SEED_TIME, isDemo: true, status: "complete" as const, artifacts: [] };
  return [
    {
      ...base,
      id: seedId("exp:demo-1"),
      name: "DEMO — Wheel-only odometry on square path",
      trackId: "SF",
      taskId: taskIdFor("SF-01"),
      hypothesis: "Synthetic demonstration record showing how a baseline is logged.",
      environment: "DEMONSTRATION DATA — not a real run",
      commit: "demo",
      dataset: "synthetic",
      parameters: { config: "ekf_wheel_only.yaml", slip: "20% left side" },
      metrics: [{ metricKey: "ate_rmse", value: 0.42 }, { metricKey: "final_drift", value: 0.61 }, { metricKey: "loc_rate", value: 30 }],
      results: "Synthetic values for UI demonstration only.",
      notes: "Delete this record once real experiments exist.",
      conclusions: "None — synthetic.",
    },
    {
      ...base,
      id: seedId("exp:demo-2"),
      name: "DEMO — Wheel + IMU EKF on square path",
      trackId: "SF",
      taskId: taskIdFor("SF-01"),
      hypothesis: "Synthetic demonstration record paired with the baseline to show comparisons.",
      environment: "DEMONSTRATION DATA — not a real run",
      commit: "demo",
      dataset: "synthetic",
      parameters: { config: "ekf.yaml", slip: "20% left side" },
      metrics: [{ metricKey: "ate_rmse", value: 0.18 }, { metricKey: "final_drift", value: 0.22 }, { metricKey: "loc_rate", value: 30 }],
      results: "Synthetic values for UI demonstration only.",
      notes: "Delete this record once real experiments exist.",
      conclusions: "None — synthetic.",
    },
  ];
}

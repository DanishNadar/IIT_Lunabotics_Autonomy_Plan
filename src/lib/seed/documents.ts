import type { Document, DocumentRevision } from "../domain/types";
import { SEED_TIME, seedId } from "./ids";

type D = Pick<Document, "slug" | "title" | "category" | "tags" | "body"> & { adr?: Document["adr"]; status?: Document["status"]; since?: number };

const DOCS: D[] = [
  {
    slug: "autonomy-team-structure",
    title: "Autonomy Team Structure & Discord Channels",
    category: "onboarding",
    tags: ["start-here", "discord", "scope"],
    since: 2,
    body: `# Autonomy Team Structure & Discord Channels

We are the **Illinois Tech NASA Lunabotics 2027 Autonomy Team** — not the whole robotics organization. Every task belongs to exactly one of these five categories, each mapped to a Discord channel:

| Discord channel | Category | Task prefix | Role |
|---|---|---|---|
| 🧠 autonomy-general | Autonomy General | AG | Coordination: ROS 2 architecture, mission logic, systems integration, testing & validation, interfaces to other teams |
| 🕸️ sensor-fusion | Sensor Fusion & Localization | SF | Pose, velocity, orientation and confidence |
| 📸 perception | Perception & Mapping | PM | Obstacles, terrain, maps and costmaps |
| 🗺️ navigation | Navigation & Planning | NV | Goals, paths, Nav2, recovery |
| 🕹️ simulations | Simulation & Digital Twin | SIM | Arena, rover model, sensors, scenarios, automation |

Autonomy General is a coordination category, not a fifth technical subteam.

## What autonomy owns

Sensing and estimation, mapping, obstacle detection, path planning, autonomous navigation, mission decisions, **high-level** excavation and deposition requests, simulation environments, ROS 2 integration and end-to-end testing in simulation.

## What we do not build

| Function | Owner |
|---|---|
| Motor PID, actuator control loops | Controls |
| Motor drivers and firmware, CAN | Controls / Electrical |
| Wiring and power distribution | Electrical |
| Physical emergency-stop hardware | Controls / Electrical |
| Excavation motor implementation | Controls |
| Digging mechanism, drivetrain design | Mechanical |

We specify **interfaces** to these teams (see [External Team Interfaces](/docs/external-team-interfaces)) and use mocks until their parts exist. Former Control & Safety tasks (CS-01…CS-06, IT-05) are archived for history; their autonomy-side pieces moved to AG-07 and SF-06.

## Old task IDs

Tasks keep their history when re-keyed, and old links redirect: MS-01→AG-01, MS-02→AG-02, MS-03→AG-03, IT-01→AG-04, IT-02→AG-05, IT-03→AG-06, IT-06→AG-08, MS-04→AG-09, MS-05→AG-10, MS-06→AG-11, CS-04→AG-12, IT-04→AG-13, SF-06→SF-08, SF-07→PM-09, PM-07↔PM-08 (swapped), NV-06→NV-08, NV-07→NV-06, SIM-04→SIM-06, SIM-05→SIM-04, SIM-06→SIM-05. Where an old key now names a different task (e.g. SF-06), the task page says so.`,
  },
  {
    slug: "external-team-interfaces",
    title: "External Team Interfaces",
    category: "architecture",
    tags: ["interfaces", "controls", "electrical", "mechanical"],
    since: 2,
    body: `# External Team Interfaces

Autonomy depends on other teams for interfaces and data, never for us to build their systems. Each dependency is tracked on the 🧠 Autonomy General page with a status, a contact and our workaround.

| Team | Provides to autonomy | Autonomy task | Workaround until delivered |
|---|---|---|---|
| Controls | Motion command interface, enforced limits, status and faults (AG-07 contract) | AG-07, NV-02, AG-01 | Mock Controls node in simulation |
| Controls | Excavation / deposition action servers | AG-02, AG-03 | Mock action servers |
| Controls | Wheel odometry on hardware | SF-01 | Simulated drivetrain plugin |
| Electrical | Sensor power and communication requirements; radar detection format | SF-05, SIM-04, PM-09 | Labeled assumptions |
| Mechanical | Rover dimensions, mass properties, joints, mechanism constraints | SIM-02, PM-01, AG-03 | Clearly labeled approximations |
| Hardware teams | Sensor specifications and mounting positions | SF-02, SIM-04 | Nominal CAD values, re-calibrated later |

## Rules

1. Autonomy never publishes motor-level commands (duty cycles, currents, actuator positions).
2. Every motion request is timestamped; Controls rejects stale ones.
3. Safe stop is a *request*; Controls executes it and re-enables motion.
4. Interface documents live in \`docs/interfaces/\` and are versioned and reviewed by both teams.
5. Autonomy completion metrics never count external work; external blockers are shown separately.`,
  },
  {
    slug: "team-onboarding",
    title: "Team Onboarding",
    category: "onboarding",
    tags: ["start-here"],
    body: `# Team Onboarding

Welcome to the Illinois Tech Lunabotics **Autonomy Team**. Start with [Autonomy Team Structure & Discord Channels](/docs/autonomy-team-structure).

## Your first week
1. Sign in to the Command Center and fill in your profile (skills, availability, GitHub username).
2. Start the **Beginner to ROS 2 Contributor** learning path. You can claim a beginner task after module 5 — you don't need to finish every path first.
3. Read [Development Environment Setup](/docs/development-environment-setup) and [Git Workflow](/docs/git-workflow).
4. Browse **Task Board → Available** and express interest in tasks that fit your track.

## How work flows here
- Every task is a guided assignment: read the *Why this matters*, study the referenced code, then work through the checklist.
- Log progress after each work session — it helps reviewers and the next person.
- A task is done only when a reviewer approves it against its Definition of Done. Merged PRs alone do not complete tasks.

## Where to ask
Use task discussions for technical questions so answers stay with the work.`,
  },
  {
    slug: "development-environment-setup",
    title: "Development Environment Setup",
    category: "onboarding",
    tags: ["setup", "ros2"],
    status: "needs_review",
    body: `# Development Environment Setup

> **Status:** draft. The ROS 2 distribution and Gazebo version are an open decision (see ADR "Why ROS 2?"). Update this page once decided.

## Baseline (proposed)
- Ubuntu LTS matching the chosen ROS 2 distribution
- ROS 2 (Humble or Jazzy — decision pending)
- Gazebo version paired with the ROS 2 distribution
- colcon, rosdep, vcstool

## Verify your install
\`\`\`bash
ros2 doctor
ros2 run demo_nodes_cpp talker
\`\`\`

## Workspace
\`\`\`bash
mkdir -p ~/lunabot_ws/src && cd ~/lunabot_ws
colcon build --symlink-install
source install/setup.bash
\`\`\`

Windows/macOS members: document your working setup (VM, WSL2, container) here once verified.`,
  },
  {
    slug: "git-workflow",
    title: "Git Workflow",
    category: "standards",
    tags: ["git", "github"],
    body: `# Git Workflow

- Branch from \`main\`: \`feature/<TASK-ID>-<short-slug>\` — e.g. \`feature/SF-01-sensor-fusion\`.
- Small, focused commits with imperative messages.
- Open a PR titled \`[TASK-ID] Summary\` — e.g. \`[SF-01] Implement initial localization estimator\`.
- Link the PR on the task page (GitHub section) so reviewers find it.
- Rebase or merge \`main\` before requesting review; CI must pass.`,
  },
  {
    slug: "pull-request-standards",
    title: "Pull Request Standards",
    category: "standards",
    tags: ["review", "github"],
    body: `# Pull Request Standards

Every PR description includes:
1. **Task** — link to the Command Center task.
2. **What changed** — packages, nodes, parameters.
3. **How to test** — exact commands.
4. **Evidence** — plots, recordings, test output.
5. **Interfaces** — any topic/message/frame changes (update the topic table).

Reviewers check functional correctness, documentation, tests, interface compatibility, performance, safety and integration readiness — the same dimensions used in task reviews.`,
  },
  {
    slug: "ros2-package-conventions",
    title: "ROS 2 Package Conventions",
    category: "standards",
    tags: ["ros2", "conventions"],
    body: `# ROS 2 Package Conventions (proposed — finalized by IT-01)

- Package names: \`lunabot_<area>\` (snake_case).
- Interfaces only in \`lunabot_interfaces\`.
- Every tunable is a parameter; defaults live in \`config/*.yaml\`.
- Pure logic in modules without ROS imports so it can be unit-tested.
- Launch files in Python; accept \`use_sim_time\`.
- Topics under subsystem namespaces: \`/localization/*\`, \`/perception/*\`, \`/navigation/*\`, \`/mission/*\`, \`/autonomy/*\` (requests to Controls). Controls-owned topics live under \`/controls/*\`.
- QoS: SensorDataQoS for high-rate sensors; reliable + transient-local for state and health topics.`,
  },
  {
    slug: "coordinate-frame-conventions",
    title: "Coordinate Frame Conventions",
    category: "standards",
    tags: ["tf", "frames"],
    body: `# Coordinate Frame Conventions

Follow REP-103 (units, axes) and REP-105 (mobile platform frames).

\`\`\`
map ──► odom ──► base_link ──► lidar_link
                         ├──► imu_link
                         ├──► camera_link ──► camera_optical_frame
                         └──► (radar_link)
\`\`\`

| Transform | Owner (proposed) |
|---|---|
| map → odom | Absolute localization (AprilTag/SLAM) or static identity in early sim |
| odom → base_link | SF-01 EKF (drivetrain controller must NOT publish it) |
| base_link → sensors | URDF (SIM-02) using calibration values (SF-02) |`,
  },
  {
    slug: "sensor-interfaces",
    title: "Sensor Interfaces",
    category: "architecture",
    tags: ["sensors", "topics"],
    body: `# Sensor Interfaces (illustrative)

| Topic | Type | Frame | Notes |
|---|---|---|---|
| /lidar/points | sensor_msgs/msg/PointCloud2 | lidar_link | Per-point time needed for LIO de-skew |
| /imu/data | sensor_msgs/msg/Imu | imu_link | Covariances must be filled |
| /wheel/odometry | nav_msgs/msg/Odometry | odom → base_link | From Controls feedback on hardware (AG-07); from the drivetrain plugin in simulation |
| /camera/image_raw | sensor_msgs/msg/Image | camera_optical_frame | |

These become verified once IT-01's topic table is approved and matching code is merged.`,
  },
  { slug: "localization-architecture", title: "Localization Architecture", category: "architecture", tags: ["localization"], body: `# Localization Architecture\n\nWheel odometry + IMU (+ LIO, SF-03) → EKF/UKF (SF-01) → /odometry/filtered and odom → base_link.\nSF-04 monitors health and publishes OK/DEGRADED/LOST to mission logic and the arbiter.\n\nOpen question: absolute map anchoring (AprilTags vs SLAM vs known start pose) — see ADR "Which localization algorithm?".` },
  { slug: "perception-architecture", title: "Perception Architecture", category: "architecture", tags: ["perception"], body: `# Perception Architecture\n\nLiDAR → PM-02 preprocessing (filter, crop, voxel, accumulate) → PM-01 terrain grid (elevation, slope, roughness) → traversability OccupancyGrid → Nav2 costmaps.\nCameras → AprilTags (PM-03), optionally rock detection (PM-05).` },
  { slug: "navigation-architecture", title: "Navigation Architecture", category: "architecture", tags: ["navigation", "nav2"], body: `# Navigation Architecture\n\nNav2 bt_navigator executes a behavior tree that plans (NV-01 planner) on the traversability costmap and follows with a local controller. Velocity output goes through the AG-07 adapter to /autonomy/cmd_vel; Controls (mock Controls in simulation) executes it. Recovery follows NV-06's BT.` },
  { slug: "simulation-setup", title: "Simulation Setup", category: "operations", tags: ["gazebo", "simulation"], body: `# Simulation Setup\n\n\`\`\`bash\nros2 launch lunabot_sim arena.launch.py scenario:=rocks seed:=42\n\`\`\`\n(Illustrative — the package is delivered by SIM-01.)\n\nScenarios are seeded YAML files so results are reproducible. Use the lite world on laptops and in CI.` },
  { slug: "control-safety-architecture", title: "Autonomy ↔ Controls Boundary", category: "architecture", tags: ["safety", "controls", "interfaces"], body: `# Autonomy ↔ Controls Boundary\n\nAutonomy publishes **timestamped motion requests** on /autonomy/cmd_vel through the AG-07 adapter, sends **safe-stop requests**, and reads **ControlsStatus** (mode, motion enabled, E-stop active, enforced limits, faults).\n\nControls owns teleoperation, command arbitration, watchdogs, motor control, firmware and the physical emergency stop. Former tasks CS-01…CS-06 are archived for that reason.\n\n**Software stops never replace the hardware E-stop.** The hardware E-stop cuts actuator power independently of any computer and is Controls/Electrical-owned.\n\nSee [External Team Interfaces](/docs/external-team-interfaces) and AG-07.` },
  { slug: "testing-standards", title: "Testing Standards", category: "standards", tags: ["testing"], body: `# Testing Standards\n\n- Pure logic has unit tests (\`colcon test\`).\n- Nodes have at least one launch/integration test or a documented replay test.\n- Benchmarks state machine, commit, scenario, seed and command.\n- Never report metrics without provenance; synthetic demo values must be labeled as such.` },
  {
    slug: "competition-requirements",
    title: "Competition Requirements and Verification",
    category: "competition",
    tags: ["rules"],
    status: "needs_review",
    body: `# Competition Requirements and Verification

**Rule of this page:** only requirements quoted from the *current* official NASA Lunabotics guidebook belong here, each with a section reference and the date it was checked. Other teams' code is not a source of rules.

| Requirement | Guidebook section | Verified on | Affects tasks |
|---|---|---|---|
| _To be filled from the official guidebook_ | | | |

Internal engineering targets (e.g. localization error goals) are **not** competition requirements and are tracked on tasks with rationale.`,
  },
  { slug: "troubleshooting", title: "Troubleshooting", category: "operations", tags: ["debugging"], body: `# Troubleshooting\n\n**No data on a topic** — check \`ros2 topic info -v\` for QoS mismatch.\n\n**TF flickering** — two publishers of the same transform (often odom → base_link). \`ros2 run tf2_tools view_frames\`.\n\n**Nodes ignore bag data** — missing \`--clock\` or \`use_sim_time:=true\`.\n\n**Robot explodes in Gazebo** — zero/tiny inertias in the URDF.` },
  {
    slug: "adr-why-ros2",
    title: "ADR: Why ROS 2?",
    category: "decision",
    tags: ["adr"],
    body: "Decision record for the middleware choice.",
    adr: {
      status: "proposed",
      context: "We need a robotics framework with mature navigation, localization, simulation integration and community support. All four reference teams use ROS 2.",
      alternatives: [
        { name: "ROS 2", pros: "Nav2, robot_localization, ros2_control, Gazebo bridge; reference teams' code is reusable; large community.", cons: "Learning curve; DDS configuration issues." },
        { name: "Custom framework (e.g. Rust/iceoryx as Utah partially uses)", pros: "Performance and control.", cons: "Rebuild navigation/localization from scratch; harder onboarding." },
      ],
      evidence: "Reference repositories (Purdue, COD, GOFIRST) are ROS 2 stacks; Utah uses ROS-adjacent components and its own tooling.",
      decision: "Proposed: ROS 2. Distribution (Humble vs Jazzy) still open — pick based on Gazebo pairing and hardware OS support.",
      tradeoffs: "Faster start and reuse versus some runtime overhead and DDS tuning.",
    },
  },
  {
    slug: "adr-gazebo-baseline",
    title: "ADR: Why Gazebo as the baseline simulator?",
    category: "decision",
    tags: ["adr", "simulation"],
    body: "Decision record for the baseline simulator.",
    adr: {
      status: "proposed",
      context: "Every member must be able to run simulation; perception testing benefits from realistic rendering.",
      alternatives: [
        { name: "Gazebo", pros: "Runs on ordinary laptops; native ROS 2 bridge; ros2_control integration.", cons: "Limited rendering realism and soil physics." },
        { name: "Isaac Sim", pros: "Photoreal sensors; GPU acceleration.", cons: "Requires RTX GPU; heavier setup." },
        { name: "MuJoCo", pros: "Fast, accurate contacts.", cons: "No native ROS 2 integration; fewer sensor models." },
      ],
      evidence: "COD and GOFIRST provide Gazebo worlds; GOFIRST also targets Isaac Sim; Utah uses MuJoCo.",
      decision: "Proposed: Gazebo as baseline; evaluate Isaac Sim (SIM-04) and MuJoCo (SIM-03) for specific needs.",
      tradeoffs: "Accessibility over realism for the baseline.",
    },
  },
  { slug: "adr-localization", title: "ADR: Which localization algorithm?", category: "decision", tags: ["adr", "localization"], body: "Decision record for localization.", adr: { status: "open", context: "Wheel slip on regolith makes wheel odometry unreliable.", alternatives: [{ name: "EKF (wheel + IMU)", pros: "Simple; robot_localization.", cons: "Drifts under slip." }, { name: "LIO (Point-LIO/FAST-LIO) fused in UKF", pros: "Robust to slip (COD approach).", cons: "Compute and sensor requirements." }, { name: "SLAM (RTAB-Map/slam_toolbox)", pros: "Global consistency.", cons: "Complexity; featureless terrain." }], evidence: "Pending SF-01 and SF-03 benchmarks.", decision: "Open — decide from SF-01/SF-03 benchmark results.", tradeoffs: "Accuracy vs compute and integration effort." } },
  { slug: "adr-planner", title: "ADR: Which navigation planner?", category: "decision", tags: ["adr", "navigation"], body: "Decision record for the global planner.", adr: { status: "open", context: "Turns cost time and cause slip; paths must respect terrain.", alternatives: [{ name: "A* / NavFn", pros: "Simple, robust.", cons: "Jagged paths." }, { name: "S-Theta* (Purdue)", pros: "Any-angle, turn-aware.", cons: "Custom code to maintain." }, { name: "Nav2 Theta* / Smac", pros: "Upstream maintained.", cons: "Tuning for our terrain." }], evidence: "Pending NV-01 benchmark.", decision: "Open — decide from NV-01 results.", tradeoffs: "Path quality vs maintenance." } },
  { slug: "adr-sensors", title: "ADR: Which sensors?", category: "decision", tags: ["adr", "hardware"], body: "Decision record for the sensor suite.", adr: { status: "open", context: "Sensor choice drives localization and perception design; must be coordinated with hardware, budget and rules.", alternatives: [{ name: "3D LiDAR + IMU + wheel encoders", pros: "Geometry-based perception and LIO.", cons: "Cost; dust sensitivity." }, { name: "Stereo/RGB-D cameras + IMU", pros: "Cheaper; texture info.", cons: "Lighting sensitivity." }, { name: "Add radar", pros: "Dust robustness.", cons: "Sparse; pending SF-05." }], evidence: "Pending SF-05 and SIM-04; specifications come from Hardware/Electrical (external dependency).", decision: "Open.", tradeoffs: "Robustness vs cost/mass/power." } },
  { slug: "adr-fallback-policy", title: "ADR: What is the autonomy fallback policy?", category: "decision", tags: ["adr", "safety"], body: "Decision record for fallback behavior.", adr: { status: "proposed", context: "Faults will happen: localization loss, stalls, link loss.", alternatives: [{ name: "Stop and wait for operator", pros: "Simple, safe.", cons: "Loses autonomy time." }, { name: "Bounded autonomous recovery then stop", pros: "Keeps mission going.", cons: "More complexity (AG-10)." }], evidence: "SF-04, NV-06, AG-07 designs.", decision: "Proposed: LOST localization, a Controls fault or an E-stop reported by Controls → SAFE_STOP (a safe-stop request through AG-07; Controls executes); recoverable faults → bounded recovery (NV-06 navigation, AG-10 mission) then SAFE_STOP.", tradeoffs: "Safety first; autonomy time second." } },
  { slug: "adr-valid-demo", title: "ADR: What constitutes a valid mission demonstration?", category: "decision", tags: ["adr", "readiness"], body: "Decision record for the end-to-end demonstration criteria.", adr: { status: "proposed", context: "Leadership needs an unambiguous signal that the autonomy stack works end-to-end.", alternatives: [{ name: "Any successful run", pros: "Easy.", cons: "Cherry-picking." }, { name: "AG-08 end-to-end run with recorded evidence", pros: "Reproducible.", cons: "Requires infrastructure." }], evidence: "AG-05 and AG-08 designs.", decision: "Proposed: an AG-08 run from clean bringup in simulation, using estimated localization (no ground truth in the loop) and mock Controls/excavation/deposition, completing ≥ 1 full excavate→deposit cycle without human input, with a recording/bag linked as evidence. The readiness indicator is set only with that evidence.", tradeoffs: "Strictness over convenience." } },
];

export function buildDocuments(): { documents: Document[]; revisions: DocumentRevision[] } {
  const documents: Document[] = DOCS.map((d) => ({
    id: seedId(`doc:${d.slug}`),
    slug: d.slug,
    title: d.title,
    category: d.category,
    tags: d.tags,
    ownerId: null,
    body: d.body,
    status: d.status ?? (d.adr ? "draft" : "published"),
    adr: d.adr ?? null,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  }));
  const revisions: DocumentRevision[] = documents.map((d) => ({ id: seedId(`rev:${d.slug}:0`), documentId: d.id, body: d.body, title: d.title, authorId: null, summary: "Seeded starter content", createdAt: SEED_TIME }));
  return { documents, revisions };
}

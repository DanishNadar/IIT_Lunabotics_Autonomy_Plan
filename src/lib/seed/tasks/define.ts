import type {
  Deliverable,
  ExternalTeam,
  Difficulty,
  Priority,
  RepoReference,
  Snippet,
  TaskResourceCategory,
  TaskStatus,
  TopicContract,
  TrackId,
} from "../../domain/types";
import { VERIFIED_ON } from "../ids";

export const REPOS = {
  utah: { repo: "utahrobotics/utah-lunabotics-2027", branch: "main" },
  purdue: { repo: "PurdueLunabotics/purdue_lunabotics", branch: "master" },
  cod: { repo: "College-of-DuPage-Lunabotics/lunabot_ros", branch: "master" },
  gofirst: { repo: "GOFIRST-Robotics/Lunabotics", branch: "main" },
} as const;

type RefInput = Omit<RepoReference, "repo" | "url" | "isFolder" | "verifiedOn" | "path"> & { folder?: boolean };

/** Builds a reference to a file/folder whose existence (and listed symbols) were verified from source. */
export function ref(team: keyof typeof REPOS, path: string, r: RefInput): RepoReference {
  const { repo, branch } = REPOS[team];
  const folder = !!r.folder;
  return {
    repo,
    path,
    url: `https://github.com/${repo}/${folder ? "tree" : "blob"}/${branch}/${path}`,
    isFolder: folder,
    summary: r.summary,
    inspect: r.inspect,
    relevance: r.relevance,
    questions: r.questions,
    adaptation: r.adaptation,
    limitations: r.limitations,
    verifiedOn: VERIFIED_ON,
  };
}

export function hfRef(path: string, url: string, r: RefInput): RepoReference {
  return { repo: "huggingface:xuboluo2001/LuSNAR", path, url, isFolder: true, verifiedOn: VERIFIED_ON, summary: r.summary, inspect: r.inspect, relevance: r.relevance, questions: r.questions, adaptation: r.adaptation, limitations: r.limitations };
}

export type Step = string | { text: string; detail?: string; sub?: string[]; resources?: string[] };

export interface TaskSeed {
  key: string;
  /**
   * The key this task had before the autonomy restructure. The task keeps the UUID
   * derived from it, so existing assignments, comments and history stay attached and
   * old /tasks/<origin> links redirect. Omit for tasks introduced in the restructure.
   */
  origin?: string;
  /** Introduced by the restructure (gets a fresh UUID even if its key was used before). */
  isNew?: boolean;
  archived?: boolean;
  externalTeam?: ExternalTeam;
  archivedReason?: string;
  title: string;
  track: TrackId;
  subtrack: string;
  priority: Priority;
  difficulty: Difficulty;
  estimate: number;
  backlog?: "initial" | "advanced";
  status?: TaskStatus;
  claimable?: boolean;
  labels?: string[];
  problem: string;
  goal: string;
  why: { need: string; contribution: string; failureImpact: string; consumers: string[] };
  background: string;
  prerequisites: [concept: string, why: string, resources: string[]][];
  readFirst: string[];
  references: RepoReference[];
  analyze: string[];
  design: string;
  guidance: {
    packageStructure: string;
    files: string[];
    inputs: TopicContract[];
    outputs: TopicContract[];
    parameters: { name: string; default: string; description: string }[];
    snippets: Snippet[];
    expectedBehavior: string;
    pitfalls: string[];
  };
  steps: Step[];
  testPlan: string[];
  measure: { metric: string; definition: string; target?: string; rationale?: string }[];
  document: string[];
  integrate: string;
  deliverables: [kind: Deliverable["kind"], title: string, required?: boolean][];
  acceptance: (string | { text: string; target: string; rationale: string })[];
  resources: [slug: string, category: TaskResourceCategory, why: string, steps?: number[]][];
  deps?: [fromKey: string, kind: "blocks" | "integrates", note: string][];
  researchNeeded?: string[];
}

export const t = (topic: string, type: string, note?: string): TopicContract => ({ name: topic, type, note });
export const p = (name: string, def: string, description: string) => ({ name, default: def, description });
export const snip = (title: string, label: Snippet["label"], language: string, code: string, note?: string): Snippet => ({ title, label, language, code, note });

/** Topic names below are the team's proposed conventions (illustrative until AG-04 is approved). */
export const TOPICS = {
  wheelOdom: t("/wheel/odometry", "nav_msgs/msg/Odometry", "proposed"),
  imu: t("/imu/data", "sensor_msgs/msg/Imu", "proposed"),
  lidar: t("/lidar/points", "sensor_msgs/msg/PointCloud2", "proposed"),
  filteredOdom: t("/odometry/filtered", "nav_msgs/msg/Odometry", "robot_localization default"),
  tf: t("/tf", "tf2_msgs/msg/TFMessage"),
  tfStatic: t("/tf_static", "tf2_msgs/msg/TFMessage"),
  cmdVel: t("/cmd_vel", "geometry_msgs/msg/Twist", "Controls-owned input (external)"),
  cmdAuto: t("/autonomy/cmd_vel", "geometry_msgs/msg/TwistStamped", "autonomy motion request — AG-07 contract (proposed)"),
  cmdTeleop: t("/cmd_vel/teleop", "geometry_msgs/msg/Twist", "Controls-owned (external)"),
  estop: t("/controls/estop_state", "std_msgs/msg/Bool", "published by Controls; read-only for autonomy (proposed)"),
  controlsStatus: t("/controls/status", "lunabot_interfaces/msg/ControlsStatus", "motion enabled, limits, faults — AG-07 (proposed)"),
  safeStop: t("/autonomy/safe_stop_request", "std_msgs/msg/Bool", "autonomy asks Controls to stop — AG-07 (proposed)"),
  costmap: t("/perception/traversability", "nav_msgs/msg/OccupancyGrid", "proposed"),
  locHealth: t("/localization/health", "diagnostic_msgs/msg/DiagnosticStatus", "proposed; may become a custom msg"),
  missionState: t("/mission/state", "std_msgs/msg/String", "proposed; custom msg in AG-04"),
  camera: t("/camera/image_raw", "sensor_msgs/msg/Image", "proposed"),
  cameraInfo: t("/camera/camera_info", "sensor_msgs/msg/CameraInfo", "proposed"),
  clock: t("/clock", "rosgraph_msgs/msg/Clock", "simulation time"),
  jointStates: t("/joint_states", "sensor_msgs/msg/JointState"),
  path: t("/plan", "nav_msgs/msg/Path"),
  goal: t("/mission/goal_pose", "geometry_msgs/msg/PoseStamped", "proposed"),
};

import type { Subtrack, Track, TrackId } from "../domain/types";
import { SEED_TIME, seedId } from "./ids";

type TrackSeed = Omit<Track, "order" | "createdAt" | "updatedAt"> & { subtracks: string[] };

/** The autonomy team's five Discord channels, in navigation order. */
export const TRACK_SEED: TrackSeed[] = [
  {
    id: "AG",
    name: "Autonomy General",
    shortName: "Autonomy General",
    emoji: "🧠",
    discordChannel: "autonomy-general",
    coordination: true,
    mission:
      "Coordinate the autonomy team: ROS 2 architecture, autonomous mission logic, systems integration, testing and validation, and the software interfaces to Controls, Electrical and Mechanical.",
    color: "#e879f9",
    icon: "Brain",
    subtracks: ["ROS 2 Autonomy Architecture", "Autonomous Mission Logic", "Systems Integration", "Testing & Validation", "External Team Interfaces"],
  },
  {
    id: "SF",
    name: "Sensor Fusion & Localization",
    shortName: "Sensor Fusion",
    emoji: "🕸️",
    discordChannel: "sensor-fusion",
    coordination: false,
    mission: "Develop reliable estimation of the rover's pose, velocity, orientation and confidence from the available sensor measurements.",
    color: "#38bdf8",
    icon: "Crosshair",
    subtracks: ["Coordinate Frames & Calibration", "Wheel Odometry Integration", "IMU Processing", "EKF/UKF Localization", "LiDAR–IMU Odometry", "Radar Fusion Research", "SLAM & State Estimation", "Localization Confidence", "Sensor Failure & Fallback", "Localization Benchmarking"],
  },
  {
    id: "PM",
    name: "Perception & Mapping",
    shortName: "Perception",
    emoji: "📸",
    discordChannel: "perception",
    coordination: false,
    mission: "Turn sensor measurements into the environmental representations autonomous navigation needs.",
    color: "#a78bfa",
    icon: "ScanEye",
    subtracks: ["LiDAR Perception", "Camera Perception", "Point Cloud Processing", "Obstacle Detection", "Terrain Classification", "Elevation Mapping", "Traversability Mapping", "Costmap Generation", "Radar-Assisted Perception", "Dataset Evaluation"],
  },
  {
    id: "NV",
    name: "Navigation & Planning",
    shortName: "Navigation",
    emoji: "🗺️",
    discordChannel: "navigation",
    coordination: false,
    mission: "Enable the rover to select goals, generate safe routes, navigate around obstacles and recover when conditions change.",
    color: "#34d399",
    icon: "Route",
    subtracks: ["Global Planning", "Local Planning", "Path Optimization", "Terrain-Aware Navigation", "Costmap Integration", "Obstacle Avoidance", "Nav2 Integration", "Goal Selection", "Navigation Recovery", "Mission-Aware Navigation"],
  },
  {
    id: "SIM",
    name: "Simulation & Digital Twin",
    shortName: "Simulations",
    emoji: "🕹️",
    discordChannel: "simulations",
    coordination: false,
    mission: "Build and maintain simulation infrastructure so the whole autonomy team can develop and test software without a completed physical rover.",
    color: "#f59e0b",
    icon: "Gamepad2",
    subtracks: ["Gazebo Environment", "Lunar Arena", "Robot Description", "Sensor Simulation", "RViz", "Physics Approximation", "Isaac Sim Exploration", "MuJoCo Exploration", "Test Scenarios", "Simulation Automation"],
  },
];

export function subtrackId(trackId: TrackId, name: string) {
  return seedId(`subtrack:${trackId}:${name}`);
}

/** "🕸️ sensor-fusion" — how tasks reference their Discord channel. */
export const discordLabel = (t: Pick<Track, "emoji" | "discordChannel">) => `${t.emoji} ${t.discordChannel}`;

export function buildTracks(): { tracks: Track[]; subtracks: Subtrack[] } {
  return {
    tracks: TRACK_SEED.map(({ subtracks: _s, ...t }, i) => {
      void _s;
      return { ...t, order: i, createdAt: SEED_TIME, updatedAt: SEED_TIME };
    }),
    subtracks: TRACK_SEED.flatMap((t) => t.subtracks.map((name, order) => ({ id: subtrackId(t.id, name), trackId: t.id, name, order }))),
  };
}

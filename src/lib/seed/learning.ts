import type { LearningModule, LearningPath, TrackId } from "../domain/types";
import { seedId } from "./ids";
import { resourceId } from "./resources";

type M = [title: string, objective: string, checklist: string[], resources: string[], exercise?: string];

const PATHS: { slug: string; title: string; audience: string; summary: string; trackId: TrackId | null; prerequisites: string[]; objectives: string[]; followOn: string[]; modules: M[] }[] = [
  {
    slug: "ros2-contributor",
    title: "Beginner to ROS 2 Contributor",
    audience: "New members with programming experience but no ROS",
    summary: "From nodes and topics to your first merged contribution. You can start a real task after module 5 — the rest can be learned alongside it.",
    trackId: "AG",
    prerequisites: ["Python basics", "Command line basics", "Git basics"],
    objectives: ["Write, build and launch ROS 2 nodes", "Inspect a running system with CLI tools", "Visualize data in RViz", "Open a pull request following team standards"],
    followOn: ["PM-04", "SF-07", "AG-04"],
    modules: [
      ["Understand nodes and topics", "Explain publish/subscribe and inspect a running graph.", ["Run turtlesim and list nodes/topics", "Echo a topic", "Draw the graph you observed"], ["ros2-nodes", "ros2-topics"]],
      ["Create a publisher", "Write a Python publisher with a timer.", ["Create a package", "Publish a String at 2 Hz", "Verify with ros2 topic echo"], ["ros2-pubsub-py", "ros2-create-pkg"]],
      ["Create a subscriber", "Subscribe and process messages.", ["Subscribe to your publisher", "Log received data", "Build with colcon"], ["ros2-pubsub-py", "ros2-colcon"]],
      ["Understand ROS messages", "Read message definitions and use standard types.", ["Inspect nav_msgs/Odometry with ros2 interface show", "Explain header.stamp and frame_id"], ["ros2-interfaces"]],
      ["Learn launch files", "Start several nodes with parameters from one file.", ["Write a Python launch file", "Pass a parameter from launch", "Add a launch argument"], ["ros2-launch", "ros2-params"]],
      ["Understand TF frames", "Explain map/odom/base_link and inspect TF.", ["Run tf2 tutorial", "Use tf2_echo", "Read REP-105"], ["tf2-intro", "rep105", "v-tf2-digikey"]],
      ["Visualize sensor data in RViz", "Display TF, point clouds and odometry.", ["Open RViz with a saved config", "Add TF and Odometry displays"], ["ros2-rviz"]],
      ["Complete a small example", "Build a node that republishes odometry as a pose.", ["Subscribe to Odometry", "Publish PoseStamped", "Write a unit test"], ["ros2-testing"], "Re-implement the idea of Purdue's map_base_node using the message stamp instead of latest TF."],
      ["Contribute to a real task", "Claim a beginner-friendly task and open a PR.", ["Claim or request a task", "Create branch feature/<TASK-ID>-<slug>", "Open PR titled [TASK-ID] …"], ["repo-utah"]],
    ],
  },
  {
    slug: "localization",
    title: "Localization Engineer",
    audience: "Members joining Sensor Fusion & Localization",
    summary: "Coordinate frames through Kalman filtering to benchmarking a real estimator.",
    trackId: "SF",
    prerequisites: ["Beginner to ROS 2 Contributor modules 1–6", "Linear algebra basics"],
    objectives: ["Explain predict/update and covariance", "Configure robot_localization", "Benchmark trajectories with ATE/RPE"],
    followOn: ["SF-01", "SF-04", "SF-02"],
    modules: [
      ["Coordinate frames", "Transform points between frames.", ["Compose two transforms by hand", "Verify with tf2_echo"], ["rep105", "rep103", "tf2-concepts"]],
      ["Odometry", "Derive diff-drive odometry.", ["Write the integration equations", "Identify error sources"], ["modern-robotics", "diff-drive-controller"]],
      ["Sensor noise", "Characterize noise from a static recording.", ["Record IMU stationary", "Compute mean and std-dev"], ["labbe-kf"]],
      ["Covariance", "Interpret covariance matrices.", ["Plot a 2D covariance ellipse", "Explain what grows during dead reckoning"], ["labbe-kf"]],
      ["Bayesian filtering", "Explain prior × likelihood → posterior.", ["Work the discrete Bayes chapter"], ["labbe-kf"]],
      ["Kalman filters", "Implement a 1D Kalman filter.", ["Implement predict/update", "Tune Q and R"], ["kalmanfilter", "labbe-kf", "v-kalman-ross"], "Track a simulated cart with noisy position measurements."],
      ["EKF / UKF", "Explain linearization vs sigma points.", ["Read EKF and UKF chapters", "List when each is preferable"], ["labbe-kf"]],
      ["ROS robot_localization", "Configure ekf_node for wheel + IMU.", ["Read sensor config docs", "Study COD ukf_params.yaml"], ["robot-localization-docs", "repo-cod", "v-sensor-fusion-addison"]],
      ["Localization benchmarking", "Compute ATE/RPE with evo.", ["Export TUM trajectories", "Run evo_ape and evo_rpe"], ["evo"]],
    ],
  },
  {
    slug: "navigation",
    title: "Navigation Engineer",
    audience: "Members joining Navigation & Planning",
    summary: "From grids and graph search to Nav2 recovery behaviors.",
    trackId: "NV",
    prerequisites: ["Beginner to ROS 2 Contributor modules 1–5", "Data structures (queues, heaps)"],
    objectives: ["Implement A* and explain Theta*", "Configure Nav2 costmaps and BTs", "Design recovery behavior"],
    followOn: ["NV-01", "NV-03", "NV-02"],
    modules: [
      ["Occupancy grids", "Index cells and convert world ↔ grid.", ["Load a map YAML/PGM", "Convert a world point to a cell"], ["nav2"]],
      ["Graph representations", "Model a grid as a graph.", ["4- vs 8-connectivity", "Edge costs"], ["redblob"]],
      ["BFS / Dijkstra", "Implement both.", ["Implement BFS", "Implement Dijkstra with a heap"], ["redblob"]],
      ["A*", "Implement A* with an admissible heuristic.", ["Implement A*", "Compare node expansions with Dijkstra"], ["redblob", "v-astar-computerphile"], "Plan on a saved costmap from PM-01."],
      ["Heuristics", "Analyze admissibility and consistency.", ["Compare Manhattan/octile/Euclidean"], ["redblob"]],
      ["Theta*", "Explain line-of-sight parent updates.", ["Read Theta* paper sections 1–4", "Trace S-Theta* alpha cost"], ["theta-star-paper", "repo-purdue"]],
      ["Costmaps", "Configure layers and inflation.", ["Explain inscribed vs circumscribed radius"], ["nav2"]],
      ["Nav2", "Bring up Nav2 on a simulated robot.", ["Run Nav2 with a sample robot", "Send a goal from the CLI"], ["nav2", "articubot", "v-nav2-crash"]],
      ["Replanning and recovery", "Read and modify a Nav2 BT.", ["Study COD's BT", "Add a recovery action"], ["behaviortree", "repo-cod"]],
    ],
  },
  {
    slug: "perception",
    title: "Perception Engineer",
    audience: "Members joining Perception & Mapping",
    summary: "Sensor data formats through traversability mapping.",
    trackId: "PM",
    prerequisites: ["Beginner to ROS 2 Contributor modules 1–6", "numpy"],
    objectives: ["Parse and filter point clouds", "Build elevation/slope grids", "Evaluate perception output"],
    followOn: ["PM-04", "PM-02", "PM-01"],
    modules: [
      ["Sensor data formats", "Read Image and PointCloud2 messages.", ["Inspect fields of a PointCloud2", "Decode with sensor_msgs_py"], ["ros2-topics", "perception-pcl"]],
      ["Image fundamentals", "Color spaces, intrinsics.", ["Read a CameraInfo message"], ["opencv"]],
      ["Point clouds", "Load, visualize and downsample.", ["Open3D tutorial"], ["open3d-pcd", "v-pcl-ros2"]],
      ["Filtering", "Crop, voxel, outlier removal.", ["Apply each filter and compare point counts"], ["open3d-pcd", "pcl"]],
      ["Coordinate transforms", "Transform clouds between frames.", ["Transform a cloud into odom with TF"], ["tf2-concepts"]],
      ["Terrain representation", "Elevation grids and slope.", ["Compute slope from a synthetic heightmap"], ["grid-map"], "Reproduce GOFIRST's gradient approach on a synthetic tilted plane."],
      ["Obstacle detection", "Thresholds vs learned detectors.", ["List failure modes of slope thresholds"], ["repo-gofirst"]],
      ["Traversability mapping", "Combine layers into costs.", ["Map slope/roughness to OccupancyGrid values"], ["nav2", "grid-map"]],
    ],
  },
  {
    slug: "simulation",
    title: "Simulation Engineer",
    audience: "Members joining Simulation & Digital Twin",
    summary: "Robot descriptions, Gazebo, physics and scenario design.",
    trackId: "SIM",
    prerequisites: ["Beginner to ROS 2 Contributor modules 1–6"],
    objectives: ["Write a URDF/Xacro", "Build Gazebo worlds", "Connect ros2_control", "Design reproducible scenarios"],
    followOn: ["SIM-01", "SIM-02", "SIM-03"],
    modules: [
      ["URDF", "Links, joints, inertia.", ["Write a two-link URDF", "check_urdf"], ["urdf-tutorial", "v-urdf-articulated"]],
      ["Xacro", "Properties and macros.", ["Refactor with a wheel macro"], ["xacro-tutorial"]],
      ["ROS TF", "robot_state_publisher output.", ["Visualize TF in RViz"], ["tf2-intro"]],
      ["Gazebo", "Worlds and models.", ["Run getting started", "Write a world file"], ["gz-getstarted", "gz-sdf-worlds", "v-gazebo-mobile-addison"]],
      ["Physics", "Friction and contacts.", ["Change friction and observe slip"], ["mujoco-overview", "gz-building-robot"]],
      ["Sensors", "Simulated LiDAR/IMU/camera.", ["Add an IMU and LiDAR to a model", "Bridge to ROS 2"], ["gz-sensors", "gz-ros2"]],
      ["Simulated drivetrain", "Stand in for Controls in simulation only.", ["Run a diff-drive demo", "Drive it from the AG-07 mock topic"], ["ros2-control-demos", "gz-ros2-control", "v-ros2control-drive"]],
      ["Scenario design", "Seeded, reproducible scenarios.", ["Write a scenario YAML", "Spawn it twice and compare"], ["gz-sdf-worlds"], "Create a rock-field scenario for SIM-01."],
    ],
  },
  {
    slug: "mission-integration",
    title: "Mission Logic & Integration Engineer",
    audience: "Members joining 🧠 autonomy-general",
    summary: "ROS 2 architecture, mission state machines, action interfaces to other teams, and end-to-end testing.",
    trackId: "AG",
    prerequisites: ["Beginner to ROS 2 Contributor modules 1–6"],
    objectives: ["Design topic, message and action contracts", "Build and test a mission state machine", "Specify an interface to another team without implementing their system", "Run and evaluate an end-to-end simulated mission"],
    followOn: ["AG-04", "AG-01", "AG-07"],
    modules: [
      ["Topics, services and actions", "Choose the right communication pattern.", ["Explain when to use an action vs a topic", "Write a minimal action client"], ["ros2-topics", "ros2-actions-py"]],
      ["Interfaces and conventions", "Design shared messages and naming.", ["Create a custom msg and action", "Read REP-103/105"], ["ros2-interfaces", "rep105", "rep103"]],
      ["Launch orchestration and QoS", "Compose a stack reproducibly.", ["Write a launch file with arguments", "Pick QoS for status vs commands"], ["ros2-launch", "ros2-qos"]],
      ["State machines vs behavior trees", "Pick a mission structure.", ["Watch both behavior-tree talks", "Sketch our mission as an FSM"], ["v-bt-faconti", "v-bt-ogren", "yasmin"]],
      ["Team boundaries", "Separate decisions from hardware control.", ["Watch the ros2_control boundary video", "List what autonomy requests vs what Controls executes"], ["v-ros2control-problem", "twist-mux"], "Draft the fields of a ControlsStatus message for AG-07."],
      ["Recording and replay", "Make tests reproducible.", ["Record and replay a bag with --clock", "Compute one metric from a bag"], ["ros2-bag", "rosbag2"]],
      ["End-to-end evaluation", "Judge a whole mission run.", ["Read the valid-demonstration ADR", "Write pass criteria before running"], ["evo"]],
    ],
  },
];

export function buildLearning(): { paths: LearningPath[]; modules: LearningModule[] } {
  const paths: LearningPath[] = [];
  const modules: LearningModule[] = [];
  PATHS.forEach((p, i) => {
    const pathId = seedId(`path:${p.slug}`);
    paths.push({ id: pathId, slug: p.slug, title: p.title, audience: p.audience, summary: p.summary, prerequisites: p.prerequisites, objectives: p.objectives, followOnTaskKeys: p.followOn, trackId: p.trackId, order: i });
    p.modules.forEach(([title, objective, checklist, res, exercise], j) => {
      modules.push({ id: seedId(`module:${p.slug}:${j}`), pathId, order: j, title, objective, checklist, exercise: exercise ?? null, resourceIds: res.map(resourceId) });
    });
  });
  return { paths, modules };
}

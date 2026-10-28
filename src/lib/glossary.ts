/** Plain-language definitions for the jargon used across the board. Safe for the client. */
export interface Term {
  term: string;
  /** Other spellings people search for. */
  aka?: string[];
  meaning: string;
  group: "Board" | "Robotics" | "Software";
}

export const GLOSSARY: Term[] = [
  // How the board itself works
  { group: "Board", term: "Task code (e.g. SF-01)", aka: ["task id", "key"], meaning: "Every task has a short code: the category letters, a dash and a number. SF-01 is simply \"Sensor Fusion task number 1\". The letters tell you which category it belongs to." },
  { group: "Board", term: "Category", aka: ["track", "subteam"], meaning: "One of the five areas of the autonomy team: Autonomy General (AG), Sensor Fusion (SF), Perception (PM), Navigation (NV) and Simulation (SIM). Each has its own Discord channel." },
  { group: "Board", term: "Subtrack / area", meaning: "A smaller topic inside a category, such as \"Calibration\" inside Sensor Fusion. Used to filter tasks." },
  { group: "Board", term: "Owner", aka: ["primary owner"], meaning: "The one person responsible for getting a task finished. A task has at most one owner." },
  { group: "Board", term: "Contributor", meaning: "Someone helping on a task without being responsible for it. A task can have several." },
  { group: "Board", term: "Track lead", meaning: "The person who runs one category. Track leads can assign tasks in their own category and review the work." },
  { group: "Board", term: "Claim", meaning: "When a member asks to take a task. Depending on settings it is accepted right away or waits for a lead to approve it." },
  { group: "Board", term: "Backlog", meaning: "Tasks that exist but are not ready to start yet, usually because something they depend on is unfinished." },
  { group: "Board", term: "Available", meaning: "Ready to start and nobody owns it yet. These are the tasks to hand out." },
  { group: "Board", term: "In review", meaning: "The owner thinks it is done; a reviewer is checking the deliverables before it counts as complete." },
  { group: "Board", term: "Blocked", meaning: "Work stopped because of a problem the owner can't solve alone. The blocker explains what is needed." },
  { group: "Board", term: "Dependency", aka: ["depends on", "feeds", "prerequisite"], meaning: "Task A depends on task B when A needs B's result first. \"Feeds\" is the other direction: B's result is used by A." },
  { group: "Board", term: "Sprint", meaning: "A fixed block of time (usually two weeks) with a goal and a chosen set of tasks." },
  { group: "Board", term: "Milestone", meaning: "A dated goal for the whole team, such as \"robot drives itself in simulation\"." },
  { group: "Board", term: "Initial / Advanced backlog", meaning: "Initial tasks are needed for a working robot this season. Advanced tasks are improvements to pick up afterwards." },
  { group: "Board", term: "Archived", meaning: "Work that moved to another team (Controls, Electrical, Mechanical) or was dropped. Kept for history only." },
  { group: "Board", term: "External team interface", meaning: "Something autonomy needs from another team, like a sensor's wiring or a motor command format. We describe what we need and use a stand-in until it arrives." },
  { group: "Board", term: "Deliverable", meaning: "A concrete result you hand in for a task: a pull request, a report, a video or a data file." },
  { group: "Board", term: "Acceptance criteria", meaning: "The checklist a reviewer uses to decide whether a task is really done." },

  // Robotics terms
  { group: "Robotics", term: "Lunabotics", meaning: "NASA's university competition where teams build a robot that digs and builds on a simulated lunar surface, ideally on its own." },
  { group: "Robotics", term: "Autonomy", meaning: "The robot deciding and acting by itself, without someone driving it with a controller." },
  { group: "Robotics", term: "Localization", meaning: "Working out where the robot is and which way it faces." },
  { group: "Robotics", term: "Pose", meaning: "Position plus orientation: where the robot is and which way it points." },
  { group: "Robotics", term: "Sensor fusion", meaning: "Combining several imperfect sensors (wheels, IMU, camera) into one better estimate." },
  { group: "Robotics", term: "Odometry", meaning: "Estimating how far the robot moved, usually from wheel rotation or camera motion. It drifts over time." },
  { group: "Robotics", term: "IMU", aka: ["inertial measurement unit"], meaning: "A small sensor that measures rotation speed and acceleration." },
  { group: "Robotics", term: "LiDAR", meaning: "A laser sensor that measures distances to everything around it, producing a point cloud." },
  { group: "Robotics", term: "Point cloud", meaning: "A big set of 3D dots, each one a measured surface point. LiDAR and depth cameras produce them." },
  { group: "Robotics", term: "EKF", aka: ["extended kalman filter", "kalman"], meaning: "A standard maths method for sensor fusion that keeps a best guess plus how uncertain it is." },
  { group: "Robotics", term: "SLAM", meaning: "Simultaneous Localization And Mapping: building a map while figuring out where you are on it." },
  { group: "Robotics", term: "Costmap", meaning: "A grid map where each cell says how risky it is to drive there. Planners avoid expensive cells." },
  { group: "Robotics", term: "Path planning", aka: ["A*", "planner"], meaning: "Finding a safe route from where the robot is to where it should go." },
  { group: "Robotics", term: "Calibration", aka: ["extrinsics", "intrinsics"], meaning: "Measuring exactly how a sensor is mounted and how it distorts readings so the data lines up." },
  { group: "Robotics", term: "Fiducial / AprilTag", meaning: "A printed black-and-white marker a camera can recognise to find its exact position." },
  { group: "Robotics", term: "Digital twin", meaning: "A simulated copy of the robot and arena that behaves like the real thing." },

  // Software terms
  { group: "Software", term: "ROS 2", aka: ["ros"], meaning: "Robot Operating System 2: the software framework the robot runs on. Programs (nodes) pass messages to each other." },
  { group: "Software", term: "Node", meaning: "One small program in ROS 2 that does one job, like reading the camera." },
  { group: "Software", term: "Topic", meaning: "A named channel nodes use to stream messages to each other, like /odom." },
  { group: "Software", term: "tf2", aka: ["tf", "transform"], meaning: "The ROS 2 library that keeps track of where every part of the robot is relative to every other part." },
  { group: "Software", term: "REP", aka: ["REP 105", "REP 103"], meaning: "ROS Enhancement Proposal: an official ROS convention document, e.g. REP 105 defines the standard map/odom/base_link frames." },
  { group: "Software", term: "URDF", meaning: "A file describing the robot's parts and joints so ROS and the simulator know its shape." },
  { group: "Software", term: "Nav2", meaning: "The standard ROS 2 navigation software: planning, obstacle avoidance and recovery." },
  { group: "Software", term: "Gazebo", meaning: "The 3D robot simulator used to test software before the real robot exists." },
  { group: "Software", term: "Launch file", meaning: "A script that starts a group of ROS 2 nodes together with their settings." },
  { group: "Software", term: "Git / GitHub", meaning: "Git tracks every code change; GitHub hosts the shared copy of the code." },
  { group: "Software", term: "PR", aka: ["pull request"], meaning: "A request to merge your code changes into the main code. Teammates review it first." },
  { group: "Software", term: "E2E", aka: ["end-to-end"], meaning: "Testing the whole system from start to finish, e.g. a full autonomous run in simulation." },
  { group: "Software", term: "CI", meaning: "Continuous integration: automatic tests that run on every pull request." },
  { group: "Software", term: "ADR", meaning: "Architecture Decision Record: a short note explaining a technical choice and why it was made." },
];

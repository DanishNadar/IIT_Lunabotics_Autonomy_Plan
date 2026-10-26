/**
 * Verified tutorial videos attached to tasks (title + channel confirmed via YouTube
 * oEmbed). Kept separate so the task specs stay readable; build.ts merges these into
 * each task's resources as "video_tutorial" entries, skipping duplicates.
 */
export const TASK_VIDEOS: Record<string, [slug: string, why: string, steps?: number[]][]> = {
  "AG-04": [["v-launch-large", "Launch organization, remapping and parameters across packages.", [5, 6]], ["v-launch-construct", "First launch file, if launch is new to you.", [5]]],
  "AG-05": [["v-bag-addison", "Record, inspect and replay bags.", [1, 2]], ["v-bag-backend", "Quick ros2 bag refresher.", [1]]],
  "AG-08": [["v-bag-addison", "Recording the evidence bag.", [3]]],
  "SF-03": [["v-slam-intro", "SLAM context: why odometry drifts and how mapping helps.", [1]], ["v-slam-20min", "Pose-graph view of trajectory estimation.", [6]]],
  "SF-04": [["v-kalman-matlab-observers", "What covariance tells you about estimate confidence.", [3]]],
  "PM-01": [["v-occupancy-5min", "Occupancy grids in five minutes.", [7]], ["v-nav2-yaml", "Nav2 costmap parameters.", [7]]],
  "PM-03": [["v-apriltag-construct", "AprilTag fundamentals in ROS 2.", [1, 3]], ["v-apriltag-docking", "Marker-based positioning with Nav2 (only if rules allow markers).", [4]]],
  "PM-04": [["v-open3d", "Open3D, if the archives contain point data.", [6]]],
  "NV-03": [["v-costmap-filters", "Encoding forbidden regions with Nav2 keepout filters.", [3]], ["v-nav2-single", "Publishing a goal pose.", [7]]],
  "SIM-03": [["v-gazebo-construct", "Gazebo/ROS 2 integration for scenario variants.", [1]]],
  "SF-05": [["v-occupancy-5min", "Occupancy-level fusion background.", [5]]],
  "PM-06": [["v-occupancy-lecture", "Probabilistic mapping with uncertainty.", [2]]],
  "PM-09": [["v-occupancy-5min", "Occupancy layer background.", [4]]],
  "NV-04": [["v-astar-computerphile", "A* and how costs shape the search.", [3]]],
  "NV-08": [["v-nav2-yaml", "Nav2 planner and costmap parameters.", [3]]],
  "SIM-05": [["v-gazebo-construct", "Gazebo/ROS 2 world handling.", [1]]],
  "SIM-06": [["v-isaac-articulated", "Isaac Sim orientation.", [2, 3]]],
  "SIM-07": [["v-bag-backend", "Recording outputs for evaluation.", [4]]],
};

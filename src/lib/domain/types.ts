/**
 * Core domain model. Every collection maps 1:1 to a PostgreSQL table
 * (camelCase here, snake_case in SQL). JSON-shaped fields map to jsonb columns.
 */

export type ID = string;
export type ISODate = string;

export const ROLES = ["admin", "autonomy_lead", "track_lead", "member", "viewer"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Administrator",
  autonomy_lead: "Autonomy Lead",
  track_lead: "Track Lead",
  member: "Team Member",
  viewer: "Viewer",
};

export const TASK_STATUSES = [
  "backlog",
  "available",
  "assigned",
  "researching",
  "designing",
  "implementing",
  "testing",
  "in_review",
  "blocked",
  "completed",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const STATUS_LABEL: Record<TaskStatus, string> = {
  backlog: "Backlog",
  available: "Available",
  assigned: "Assigned",
  researching: "Researching",
  designing: "Designing",
  implementing: "Implementing",
  testing: "Testing",
  in_review: "In Review",
  blocked: "Blocked",
  completed: "Completed",
};

export const PRIORITIES = ["critical", "high", "medium", "low"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const DIFFICULTIES = ["beginner", "intermediate", "advanced", "expert"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

/** The autonomy team's five categories (one per Discord channel). */
export type TrackId = "AG" | "SF" | "PM" | "NV" | "SIM";
export const TRACK_IDS: TrackId[] = ["AG", "SF", "PM", "NV", "SIM"];
/** Pre-restructure tracks; only used by the data migration. */
export type LegacyTrackId = "MS" | "CS" | "IT";

/** Teams outside autonomy whose interfaces or deliverables we depend on. */
export const EXTERNAL_TEAMS = ["Controls", "Electrical", "Mechanical", "Hardware"] as const;
export type ExternalTeam = (typeof EXTERNAL_TEAMS)[number];

export interface Member {
  id: ID;
  name: string;
  email: string;
  /** scrypt hash for local (demo-mode) credential accounts; never sent to the client */
  passwordHash?: string | null;
  role: Role;
  isDemo: boolean;
  primaryTrackId: TrackId | null;
  secondaryTrackId: TrackId | null;
  /** tracks this member leads (track_lead scope) */
  leadTrackIds: TrackId[];
  githubUsername: string | null;
  discordHandle: string | null;
  skills: string[];
  experience: "new" | "some" | "experienced";
  availabilityHours: number;
  bio: string;
  avatarColor: string;
  active: boolean;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export type PublicMember = Omit<Member, "passwordHash" | "email"> & { email?: string };

export interface Track {
  id: TrackId;
  name: string;
  /** Short label used in navigation, e.g. "Sensor Fusion". */
  shortName: string;
  emoji: string;
  /** Discord channel name without emoji, e.g. "sensor-fusion". */
  discordChannel: string;
  /** Coordination category rather than a technical subteam (Autonomy General). */
  coordination: boolean;
  mission: string;
  color: string;
  icon: string;
  order: number;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface Subtrack {
  id: ID;
  trackId: TrackId;
  name: string;
  order: number;
}

export interface Milestone {
  id: ID;
  name: string;
  description: string;
  targetDate: ISODate;
  trackIds: TrackId[];
  /** "proposed" = internal planning date the lead may move; never an external deadline */
  status: "proposed" | "active" | "met" | "missed";
  createdAt: ISODate;
}

export interface Sprint {
  id: ID;
  name: string;
  goal: string;
  startDate: ISODate;
  endDate: ISODate;
  status: "planned" | "active" | "completed";
  capacityHours: number;
  memberIds: ID[];
  retrospective: { wentWell: string; improve: string; actions: string } | null;
  isProposed: boolean;
  createdAt: ISODate;
  updatedAt: ISODate;
}

/** Label for any command or snippet shown to students. */
export type SnippetLabel = "verified" | "illustrative" | "adapt";

export interface Snippet {
  title: string;
  label: SnippetLabel;
  language: string;
  code: string;
  note?: string;
}

export interface TopicContract {
  name: string;
  type: string;
  note?: string;
}

export interface RepoReference {
  repo: string; // owner/name
  path: string;
  url: string;
  isFolder: boolean;
  summary: string;
  /** Only symbols verified by reading the source file. */
  inspect: string[];
  relevance: string;
  questions: string[];
  adaptation: string;
  limitations: string[];
  verifiedOn: ISODate;
}

export interface Prerequisite {
  concept: string;
  why: string;
  resourceIds: ID[];
}

/**
 * Engineering task template (Section 27). Narrative content lives in a jsonb
 * `spec` column; checklist, deliverables and acceptance criteria are separate
 * tables because they carry per-row state.
 */
export interface TaskSpec {
  problem: string;
  goal: string;
  why: {
    need: string;
    contribution: string;
    failureImpact: string;
    consumers: string[];
  };
  background: string;
  prerequisites: Prerequisite[];
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
  testPlan: string[];
  measure: { metric: string; definition: string; target?: string; rationale?: string }[];
  document: string[];
  integrate: string;
  researchNeeded?: string[];
}

export interface Task {
  id: ID;
  key: string; // e.g. SF-01
  title: string;
  trackId: TrackId;
  subtrackId: ID | null;
  priority: Priority;
  difficulty: Difficulty;
  estimateHours: number;
  status: TaskStatus;
  /** status to return to when unblocked */
  statusBeforeBlocked: TaskStatus | null;
  backlog: "initial" | "advanced";
  sprintId: ID | null;
  milestoneId: ID | null;
  startDate: ISODate | null;
  dueDate: ISODate | null;
  reviewerId: ID | null;
  requiresIndependentReview: boolean;
  claimable: boolean;
  labels: string[];
  spec: TaskSpec;
  /** Keys this task used before being re-keyed; old /tasks/<key> links redirect here. */
  legacyKeys: string[];
  /** Out of autonomy scope; kept for history and excluded from boards and metrics. */
  archived: boolean;
  /** Team that owns the implementation when the work is not autonomy's. */
  externalTeam: ExternalTeam | null;
  archivedReason: string;
  createdBy: ID | null;
  createdAt: ISODate;
  updatedAt: ISODate;
  statusChangedAt: ISODate;
}

export interface TaskAssignment {
  id: ID;
  taskId: ID;
  memberId: ID;
  role: "owner" | "contributor";
  responsibility: string;
  assignedBy: ID | null;
  createdAt: ISODate;
}

export interface ChecklistItem {
  id: ID;
  taskId: ID;
  parentId: ID | null;
  order: number;
  text: string;
  detail: string;
  required: boolean;
  done: boolean;
  doneBy: ID | null;
  doneAt: ISODate | null;
  ownerId: ID | null;
  evidence: string;
  resourceIds: ID[];
}

export interface TaskDependency {
  id: ID;
  /** prerequisite */
  fromTaskId: ID;
  /** dependent */
  toTaskId: ID;
  kind: "blocks" | "integrates";
  note: string;
  createdAt: ISODate;
}

export interface Deliverable {
  id: ID;
  taskId: ID;
  order: number;
  title: string;
  kind: "code" | "launch" | "config" | "docs" | "tests" | "benchmark" | "media" | "pr" | "notebook" | "diagram";
  required: boolean;
}

export interface DeliverableSubmission {
  id: ID;
  taskId: ID;
  deliverableId: ID;
  memberId: ID;
  url: string;
  note: string;
  createdAt: ISODate;
}

export interface AcceptanceCriterion {
  id: ID;
  taskId: ID;
  order: number;
  text: string;
  /** Internal engineering target, never a competition requirement. */
  target: string | null;
  rationale: string | null;
  verified: boolean;
  verifiedBy: ID | null;
}

export const REVIEW_DIMENSIONS = [
  "functional",
  "documentation",
  "testing",
  "interfaces",
  "performance",
  "safety",
  "integration",
] as const;
export type ReviewDimension = (typeof REVIEW_DIMENSIONS)[number];
export type ReviewRating = "pass" | "concern" | "fail" | "na";

export interface TaskReview {
  id: ID;
  taskId: ID;
  reviewerId: ID;
  decision: "approved" | "changes_requested";
  ratings: Record<ReviewDimension, ReviewRating>;
  summary: string;
  createdAt: ISODate;
}

export interface TaskComment {
  id: ID;
  taskId: ID;
  authorId: ID;
  parentId: ID | null;
  kind: "discussion" | "question" | "review" | "blocker";
  body: string;
  mentions: ID[];
  createdAt: ISODate;
  editedAt: ISODate | null;
}

export interface ProgressLog {
  id: ID;
  taskId: ID;
  memberId: ID;
  checklistItemId: ID | null;
  workedOn: string;
  changed: string;
  problems: string;
  experiments: string;
  learned: string;
  nextSteps: string;
  hours: number | null;
  createdAt: ISODate;
}

export interface TaskBlocker {
  id: ID;
  taskId: ID;
  description: string;
  raisedBy: ID;
  createdAt: ISODate;
  resolvedAt: ISODate | null;
  resolvedBy: ID | null;
  resolution: string;
}

export interface StatusHistory {
  id: ID;
  taskId: ID;
  from: TaskStatus | null;
  to: TaskStatus;
  changedBy: ID | null;
  note: string;
  createdAt: ISODate;
}

export interface TaskClaim {
  id: ID;
  taskId: ID;
  memberId: ID;
  kind: "interest" | "request" | "claim";
  message: string;
  status: "pending" | "approved" | "declined" | "withdrawn";
  decidedBy: ID | null;
  createdAt: ISODate;
  decidedAt: ISODate | null;
}

export interface GithubLink {
  id: ID;
  taskId: ID;
  kind: "pr" | "issue" | "commit" | "branch";
  repo: string;
  number: number | null;
  ref: string | null;
  url: string;
  title: string;
  state: "open" | "draft" | "merged" | "closed" | "unknown";
  checks: "passing" | "failing" | "pending" | "none" | "unknown";
  addedBy: ID;
  createdAt: ISODate;
  syncedAt: ISODate | null;
}

export const RESOURCE_TYPES = [
  "source",
  "docs",
  "tutorial",
  "video",
  "paper",
  "dataset",
  "visualization",
  "architecture",
  "course",
  "tool",
] as const;
export type ResourceType = (typeof RESOURCE_TYPES)[number];

export const RESOURCE_TYPE_LABEL: Record<ResourceType, string> = {
  source: "Source implementation",
  docs: "Official documentation",
  tutorial: "Text tutorial",
  video: "Video",
  paper: "Academic paper",
  dataset: "Dataset",
  visualization: "Visualization",
  architecture: "Reference architecture",
  course: "Course",
  tool: "Tool / library",
};

export interface Resource {
  id: ID;
  title: string;
  url: string;
  publisher: string;
  type: ResourceType;
  difficulty: Difficulty | null;
  duration: string | null;
  why: string;
  topics: string[];
  trackIds: TrackId[];
  /** Date the URL was last confirmed reachable. null = unverified */
  lastVerified: ISODate | null;
  addedBy: ID | null;
  createdAt: ISODate;
}

export const TASK_RESOURCE_CATEGORIES = [
  "primary_source",
  "official_docs",
  "text_tutorial",
  "video_tutorial",
  "paper",
  "dataset",
  "visualization",
  "reference_architecture",
  "internal",
] as const;
export type TaskResourceCategory = (typeof TASK_RESOURCE_CATEGORIES)[number];

export interface TaskResource {
  id: ID;
  taskId: ID;
  resourceId: ID;
  category: TaskResourceCategory;
  order: number;
  why: string;
  stepRefs: number[];
}

export interface ResearchTodo {
  id: ID;
  topic: string;
  note: string;
  trackId: TrackId | null;
  taskId: ID | null;
  status: "open" | "done";
  createdAt: ISODate;
}

export interface Repository {
  id: ID;
  owner: string;
  name: string;
  url: string;
  team: string;
  defaultBranch: string;
  description: string;
  kind: "reference" | "team";
}

export interface LearningPath {
  id: ID;
  slug: string;
  title: string;
  audience: string;
  summary: string;
  prerequisites: string[];
  objectives: string[];
  followOnTaskKeys: string[];
  trackId: TrackId | null;
  order: number;
}

export interface LearningModule {
  id: ID;
  pathId: ID;
  order: number;
  title: string;
  objective: string;
  checklist: string[];
  exercise: string | null;
  resourceIds: ID[];
}

export interface LearningProgress {
  id: ID;
  memberId: ID;
  moduleId: ID;
  completedAt: ISODate;
}

export interface Document {
  id: ID;
  slug: string;
  title: string;
  category: "onboarding" | "standards" | "architecture" | "decision" | "operations" | "competition";
  tags: string[];
  ownerId: ID | null;
  body: string;
  status: "draft" | "published" | "needs_review";
  adr: {
    status: "proposed" | "accepted" | "superseded" | "open";
    context: string;
    alternatives: { name: string; pros: string; cons: string }[];
    evidence: string;
    decision: string;
    tradeoffs: string;
  } | null;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface DocumentRevision {
  id: ID;
  documentId: ID;
  body: string;
  title: string;
  authorId: ID | null;
  summary: string;
  createdAt: ISODate;
}

export interface MetricDefinition {
  id: ID;
  key: string;
  domain: "localization" | "navigation" | "perception" | "control" | "simulation" | "mission";
  name: string;
  unit: string;
  definition: string;
  provenance: string;
  higherIsBetter: boolean;
}

export interface Experiment {
  id: ID;
  name: string;
  trackId: TrackId;
  taskId: ID | null;
  hypothesis: string;
  environment: string;
  commit: string;
  dataset: string;
  parameters: Record<string, string>;
  metrics: { metricKey: string; value: number; note?: string }[];
  results: string;
  notes: string;
  conclusions: string;
  artifacts: { label: string; url: string }[];
  status: "planned" | "running" | "complete" | "invalid";
  /** Synthetic demonstration record, not a measured result. */
  isDemo: boolean;
  createdBy: ID | null;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface IntegrationComponent {
  id: ID;
  key: string;
  group: "sensors" | "localization" | "perception" | "navigation" | "mission" | "control" | "safety";
  name: string;
  purpose: string;
  inputs: TopicContract[];
  outputs: TopicContract[];
  parameters: string[];
  taskKeys: string[];
  /** illustrative = proposed interface; verified = matches committed code */
  interfaceStatus: "illustrative" | "verified";
  /** Who implements this component. External components appear only as interfaces. */
  ownerTeam: "Autonomy" | ExternalTeam;
  ownerId: ID | null;
}

/**
 * Something another team must provide before autonomy work can integrate.
 * Tracked separately so autonomy metrics are not penalized for it.
 */
export interface ExternalDependency {
  id: ID;
  team: ExternalTeam;
  title: string;
  description: string;
  /** What autonomy needs, concretely (fields, units, rates, formats). */
  needs: string[];
  taskIds: ID[];
  status: "not_requested" | "requested" | "in_progress" | "delivered" | "blocked";
  contact: string;
  /** How autonomy proceeds until it is delivered. */
  workaround: string;
  notes: string;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export const NOTIFICATION_KINDS = [
  "assignment",
  "claim_decision",
  "mention",
  "review_request",
  "changes_requested",
  "approved",
  "blocker_new",
  "blocker_resolved",
  "due_soon",
  "sprint_change",
  "dependency_complete",
] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export interface Notification {
  id: ID;
  memberId: ID;
  kind: NotificationKind;
  title: string;
  body: string;
  href: string;
  read: boolean;
  createdAt: ISODate;
}

export interface NotificationPreference {
  id: ID;
  memberId: ID;
  disabledKinds: NotificationKind[];
}

export interface SavedView {
  id: ID;
  memberId: ID;
  name: string;
  view: BoardView;
  filters: BoardFilters;
  createdAt: ISODate;
}

export type BoardView = "kanban" | "table" | "list" | "calendar" | "timeline" | "assignee" | "track";

export interface BoardFilters {
  q?: string;
  trackIds?: TrackId[];
  subtrackIds?: ID[];
  memberIds?: ID[];
  priorities?: Priority[];
  difficulties?: Difficulty[];
  sprintIds?: ID[];
  milestoneIds?: ID[];
  statuses?: TaskStatus[];
  /** "all" = every active task; archived tasks appear only under "archived". */
  backlog?: "initial" | "advanced" | "all" | "archived";
}

export interface AuditEvent {
  id: ID;
  actorId: ID | null;
  action: string;
  entity: string;
  entityId: ID;
  summary: string;
  href: string | null;
  createdAt: ISODate;
}

export interface Invitation {
  id: ID;
  email: string;
  role: Role;
  leadTrackIds: TrackId[];
  /** sha256 of the invite token; the raw token is shown once to the inviter */
  tokenHash: string;
  createdBy: ID;
  createdAt: ISODate;
  acceptedAt: ISODate | null;
}

export interface AppSettings {
  id: ID;
  /** Data migration version applied to this database (see src/lib/migrations). */
  dataVersion: number;
  organization: string;
  team: string;
  claimMode: "open" | "approval" | "disabled";
  allowSelfRegistration: boolean;
  /** Set only by an explicit lead action backed by an IT-06 / IT-02 evidence link. */
  e2eDemonstration: { demonstrated: boolean; evidenceUrl: string | null; recordedBy: ID | null; recordedAt: ISODate | null };
  updatedAt: ISODate;
}

export interface Database {
  settings: AppSettings[];
  members: Member[];
  tracks: Track[];
  subtracks: Subtrack[];
  milestones: Milestone[];
  sprints: Sprint[];
  tasks: Task[];
  assignments: TaskAssignment[];
  checklistItems: ChecklistItem[];
  dependencies: TaskDependency[];
  deliverables: Deliverable[];
  submissions: DeliverableSubmission[];
  acceptanceCriteria: AcceptanceCriterion[];
  reviews: TaskReview[];
  comments: TaskComment[];
  progressLogs: ProgressLog[];
  blockers: TaskBlocker[];
  statusHistory: StatusHistory[];
  claims: TaskClaim[];
  githubLinks: GithubLink[];
  resources: Resource[];
  taskResources: TaskResource[];
  researchTodos: ResearchTodo[];
  repositories: Repository[];
  learningPaths: LearningPath[];
  learningModules: LearningModule[];
  learningProgress: LearningProgress[];
  documents: Document[];
  documentRevisions: DocumentRevision[];
  metricDefinitions: MetricDefinition[];
  experiments: Experiment[];
  components: IntegrationComponent[];
  notifications: Notification[];
  notificationPreferences: NotificationPreference[];
  savedViews: SavedView[];
  auditEvents: AuditEvent[];
  invitations: Invitation[];
  externalDependencies: ExternalDependency[];
}

export type Collection = keyof Database;

/** Collection → SQL table name. */
export const TABLES: Record<Collection, string> = {
  settings: "app_settings",
  members: "profiles",
  tracks: "tracks",
  subtracks: "subtracks",
  milestones: "milestones",
  sprints: "sprints",
  tasks: "tasks",
  assignments: "task_assignments",
  checklistItems: "task_checklist_items",
  dependencies: "task_dependencies",
  deliverables: "task_deliverables",
  submissions: "deliverable_submissions",
  acceptanceCriteria: "task_acceptance_criteria",
  reviews: "task_reviews",
  comments: "task_comments",
  progressLogs: "task_progress_logs",
  blockers: "task_blockers",
  statusHistory: "task_status_history",
  claims: "task_claims",
  githubLinks: "github_links",
  resources: "resources",
  taskResources: "task_resources",
  researchTodos: "research_todos",
  repositories: "repositories",
  learningPaths: "learning_paths",
  learningModules: "learning_modules",
  learningProgress: "learning_progress",
  documents: "documents",
  documentRevisions: "document_revisions",
  metricDefinitions: "metric_definitions",
  experiments: "experiments",
  components: "integration_components",
  notifications: "notifications",
  notificationPreferences: "notification_preferences",
  savedViews: "saved_views",
  auditEvents: "audit_events",
  invitations: "invitations",
  externalDependencies: "external_dependencies",
};

export function emptyDatabase(): Database {
  return Object.fromEntries(Object.keys(TABLES).map((k) => [k, []])) as unknown as Database;
}

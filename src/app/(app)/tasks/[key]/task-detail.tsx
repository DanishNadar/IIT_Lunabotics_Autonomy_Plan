"use client";

import type {
  AcceptanceCriterion,
  ChecklistItem,
  Deliverable,
  DeliverableSubmission,
  ExternalDependency,
  GithubLink,
  ProgressLog,
  Resource,
  StatusHistory,
  Task,
  TaskAssignment,
  TaskBlocker,
  TaskClaim,
  TaskComment,
  TaskDependency,
  TaskResource,
  TaskReview,
} from "@/lib/domain/types";
import type { DoDItem } from "@/lib/domain/review";
import type { TaskSummary } from "@/lib/domain/views";
import { cn } from "@/lib/utils";
import { TaskNotices } from "./notices";
import { ChecklistSection } from "./checklist";
import { DeliverablesSection, AcceptanceSection } from "./deliverables";
import { DiscussionSection } from "./discussion";
import { TaskHeader } from "./header";
import { ProgressLogSection } from "./progress-log";
import { RelatedSection } from "./related";
import { ReviewSection } from "./review";
import { TaskSidebar } from "./sidebar";
import { GuidanceSection, PrerequisitesSection, ReferencesSection, ResourcesSection, TemplateSection, WhySection } from "./spec-sections";

export interface TaskDetailData {
  task: Task;
  summary: TaskSummary;
  assignments: TaskAssignment[];
  checklist: ChecklistItem[];
  deliverables: Deliverable[];
  submissions: DeliverableSubmission[];
  acceptance: AcceptanceCriterion[];
  reviews: TaskReview[];
  comments: TaskComment[];
  logs: ProgressLog[];
  blockers: TaskBlocker[];
  history: StatusHistory[];
  claims: TaskClaim[];
  links: GithubLink[];
  resources: (TaskResource & { resource: Resource })[];
  resourceIndex: Record<string, Resource>;
  prereqs: { dep: TaskDependency; task: TaskSummary }[];
  dependents: { dep: TaskDependency; task: TaskSummary }[];
  sameSubtrack: TaskSummary[];
  sameTrack: TaskSummary[];
  allTasks: { id: string; key: string; title: string }[];
  experiments: { id: string; name: string; status: string; isDemo: boolean }[];
  dod: DoDItem[];
  claimMode: "open" | "approval" | "disabled";
  keyHistory: { key: string; title: string }[];
  externalDependencies: ExternalDependency[];
}

const NAV = [
  ["why", "B · Why this matters"],
  ["prereqs", "C · Understand first"],
  ["references", "D · Study implementations"],
  ["steps", "E · Implementation steps"],
  ["guidance", "F · Practical guidance"],
  ["resources", "G · Resources"],
  ["deliverables", "H · Deliverables"],
  ["acceptance", "I · Acceptance criteria"],
  ["test", "Test · Measure · Document"],
  ["review", "J · Review & Definition of Done"],
  ["discussion", "K · Discussion"],
  ["log", "L · Progress log"],
  ["related", "M · Related tasks"],
] as const;

export function TaskDetailClient({ data }: { data: TaskDetailData }) {
  return (
    <div>
      <TaskHeader data={data} />
      <div className="mx-auto grid max-w-[1500px] gap-4 px-4 py-4 xl:grid-cols-[180px_minmax(0,1fr)_320px] lg:grid-cols-[minmax(0,1fr)_300px]">
        <nav aria-label="Task sections" className="sticky top-[120px] hidden max-h-[calc(100vh-140px)] self-start overflow-y-auto xl:block">
          <ul className="space-y-0.5 text-[11px]">
            {NAV.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} className={cn("block rounded px-2 py-1 text-muted hover:bg-panel-3 hover:text-fg")}>
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="min-w-0 space-y-4">
          <TaskNotices data={data} />
          {data.task.spec.researchNeeded?.length ? (
            <div className="rounded-lg border border-warn/30 bg-warn-soft px-3 py-2 text-xs text-warn">
              <strong className="font-semibold">Research needed:</strong>
              <ul className="mt-1 list-disc pl-4">
                {data.task.spec.researchNeeded.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <WhySection data={data} />
          <PrerequisitesSection data={data} />
          <ReferencesSection data={data} />
          <ChecklistSection data={data} />
          <GuidanceSection data={data} />
          <ResourcesSection data={data} />
          <DeliverablesSection data={data} />
          <AcceptanceSection data={data} />
          <TemplateSection data={data} />
          <ReviewSection data={data} />
          <DiscussionSection data={data} />
          <ProgressLogSection data={data} />
          <RelatedSection data={data} />
        </div>
        <TaskSidebar data={data} />
      </div>
    </div>
  );
}

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
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { GuidedWalkthrough } from "./guided-walkthrough";
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
  ["why", "Why this matters"],
  ["prereqs", "Understand first"],
  ["references", "Study implementations"],
  ["steps", "Implementation steps"],
  ["guidance", "Practical guidance"],
  ["resources", "Resources"],
  ["deliverables", "Deliverables"],
  ["acceptance", "Acceptance criteria"],
  ["test", "Test · Measure · Document"],
  ["review", "Review & Definition of Done"],
  ["discussion", "Discussion"],
  ["log", "Progress log"],
  ["related", "Related tasks"],
] as const;

/** Highlights the section currently in view. */
function useActiveSection() {
  const [active, setActive] = useState<string>(NAV[0][0]);
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-90px 0px -60% 0px" },
    );
    for (const [id] of NAV) {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    }
    return () => obs.disconnect();
  }, []);
  return active;
}

export function TaskDetailClient({ data }: { data: TaskDetailData }) {
  const activeSection = useActiveSection();
  return (
    <div>
      <TaskHeader data={data} />
      <div className="mx-auto grid max-w-[1500px] gap-6 px-4 py-6 sm:px-8 xl:grid-cols-[220px_minmax(0,1fr)_340px] lg:grid-cols-[minmax(0,1fr)_320px]">
        <nav aria-label="Task sections" className="sticky top-24 hidden max-h-[calc(100vh-120px)] self-start overflow-y-auto xl:block">
          <div className="mb-2 px-3 text-xs font-semibold tracking-wider text-faint uppercase">On this page</div>
          <ul className="space-y-0.5 border-l-2 border-line text-[14px]">
            {NAV.map(([id, label]) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className={cn("-ml-0.5 block border-l-2 px-3 py-1.5 transition-colors", activeSection === id ? "border-accent font-medium text-fg" : "border-transparent text-muted hover:border-line-strong hover:text-fg")}
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="min-w-0 space-y-6">
          <TaskNotices data={data} />
          {!data.task.archived && <GuidedWalkthrough data={data} />}
          {data.task.spec.researchNeeded?.length ? (
            <div className="rounded-lg border border-warn/30 bg-warn-soft px-3 py-2 text-[13px] text-warn">
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

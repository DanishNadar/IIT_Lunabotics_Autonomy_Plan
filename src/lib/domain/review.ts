import type { Check } from "./status";
import type {
  ChecklistItem,
  Deliverable,
  DeliverableSubmission,
  GithubLink,
  ReviewDimension,
  ReviewRating,
  Task,
  TaskAssignment,
} from "./types";
import { REVIEW_DIMENSIONS } from "./types";

export interface DoDItem {
  key: "checklist" | "source" | "testing" | "docs" | "deliverables" | "review";
  label: string;
  met: boolean;
  detail: string;
}

interface DoDInput {
  task: Pick<Task, "id" | "status">;
  checklist: ChecklistItem[];
  deliverables: Deliverable[];
  submissions: DeliverableSubmission[];
  githubLinks: GithubLink[];
  approved: boolean;
}

/** Definition of Done (Section 7J). Evaluated from stored evidence only. */
export function definitionOfDone({ task, checklist, deliverables, submissions, githubLinks, approved }: DoDInput): DoDItem[] {
  const items = checklist.filter((c) => c.taskId === task.id && c.required);
  const doneItems = items.filter((c) => c.done).length;
  const subs = submissions.filter((s) => s.taskId === task.id);
  const submitted = new Set(subs.map((s) => s.deliverableId));
  const dels = deliverables.filter((d) => d.taskId === task.id);
  const required = dels.filter((d) => d.required);
  const missing = required.filter((d) => !submitted.has(d.id));
  const hasKind = (kinds: Deliverable["kind"][]) => dels.some((d) => kinds.includes(d.kind) && submitted.has(d.id));
  const links = githubLinks.filter((g) => g.taskId === task.id && (g.kind === "pr" || g.kind === "commit"));

  return [
    {
      key: "checklist",
      label: "Required implementation steps complete",
      met: items.length > 0 && doneItems === items.length,
      detail: `${doneItems}/${items.length} required steps`,
    },
    {
      key: "source",
      label: "Source committed (PR or commit linked)",
      met: links.length > 0 || hasKind(["code", "pr"]),
      detail: links.length ? `${links.length} linked` : "Link a PR/commit or submit the code deliverable",
    },
    {
      key: "testing",
      label: "Testing evidence submitted",
      met: hasKind(["tests", "benchmark", "media"]),
      detail: hasKind(["tests", "benchmark", "media"]) ? "Evidence on file" : "Submit a test, benchmark or recording deliverable",
    },
    {
      key: "docs",
      label: "Documentation submitted",
      met: hasKind(["docs", "notebook", "diagram"]),
      detail: hasKind(["docs", "notebook", "diagram"]) ? "Documentation on file" : "Submit README / docs deliverable",
    },
    {
      key: "deliverables",
      label: "All required deliverables submitted",
      met: missing.length === 0 && required.length > 0,
      detail: missing.length ? `Missing: ${missing.map((d) => d.title).join(", ")}` : `${required.length} submitted`,
    },
    {
      key: "review",
      label: "Reviewer approval",
      met: approved,
      detail: approved ? "Approved" : "Pending review",
    },
  ];
}

/** Everything except the final review must hold before a review can be requested. */
export function canRequestReview(dod: DoDItem[], status: Task["status"]): Check {
  if (status === "in_review") return { ok: false, reason: "Review already requested." };
  if (status === "completed") return { ok: false, reason: "Task is already completed." };
  if (status === "backlog" || status === "available") return { ok: false, reason: "Task has not been started." };
  const gaps = dod.filter((d) => d.key !== "review" && !d.met);
  return gaps.length ? { ok: false, reason: `Definition of Done incomplete: ${gaps.map((g) => g.label).join("; ")}` } : { ok: true };
}

export function canReview(
  reviewerId: string,
  task: Pick<Task, "id" | "status" | "requiresIndependentReview">,
  assignments: TaskAssignment[],
): Check {
  if (task.status !== "in_review") return { ok: false, reason: "Task is not awaiting review." };
  const isAssignee = assignments.some((a) => a.taskId === task.id && a.memberId === reviewerId);
  if (task.requiresIndependentReview && isAssignee) {
    return { ok: false, reason: "This task requires independent review; assignees cannot approve their own work." };
  }
  return { ok: true };
}

export function validateDecision(decision: "approved" | "changes_requested", ratings: Partial<Record<ReviewDimension, ReviewRating>>): Check {
  for (const d of REVIEW_DIMENSIONS) if (!ratings[d]) return { ok: false, reason: `Rate every dimension (missing: ${d}).` };
  if (decision === "approved" && Object.values(ratings).includes("fail")) {
    return { ok: false, reason: "Cannot approve with a failing dimension; request changes instead." };
  }
  return { ok: true };
}

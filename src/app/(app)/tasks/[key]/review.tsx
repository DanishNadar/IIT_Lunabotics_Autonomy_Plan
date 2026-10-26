"use client";

import { Ago } from "@/components/ui/time";
import { CheckCircle2, Circle, ClipboardCheck, Send, XCircle } from "lucide-react";
import { useState } from "react";
import { Avatar, Badge, Button, Field, Select, Textarea } from "@/components/ui/primitives";
import { useCommand } from "@/components/use-command";
import { useCan, useLookup, useWorkspace } from "@/components/workspace";
import { canRequestReview, canReview } from "@/lib/domain/review";
import { REVIEW_DIMENSIONS, type ReviewDimension, type ReviewRating } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import { Section } from "./section";
import type { TaskDetailData } from "./task-detail";

const DIM_LABEL: Record<ReviewDimension, string> = {
  functional: "Functional correctness",
  documentation: "Documentation",
  testing: "Testing",
  interfaces: "Interface compatibility",
  performance: "Performance",
  safety: "Safety considerations",
  integration: "Integration readiness",
};
const RATING_TONE: Record<ReviewRating, "ok" | "warn" | "danger" | "neutral"> = { pass: "ok", concern: "warn", fail: "danger", na: "neutral" };

export function ReviewSection({ data }: { data: TaskDetailData }) {
  const { task, assignments, dod } = data;
  const { actor, members } = useWorkspace();
  const { member } = useLookup();
  const can = useCan();
  const { run, pending } = useCommand();
  const requestCheck = canRequestReview(dod, task.status);
  const canRequest = can("task.requestReview", { task, assignments });
  const reviewCheck = canReview(actor.id, task, assignments);
  const canSubmitReview = can("task.review", { task, assignments }) && reviewCheck.ok;
  const [reviewer, setReviewer] = useState(task.reviewerId ?? "");
  const eligibleReviewers = members.filter((m) => m.active && m.role !== "viewer" && m.role !== "member" && !(task.requiresIndependentReview && assignments.some((a) => a.memberId === m.id)));

  return (
    <Section id="review" letter="J" title="Review & Definition of Done" subtitle="A task cannot be approved until every item holds. Merged PRs alone never complete a task.">
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <h3 className="mb-1.5 text-[11px] font-semibold tracking-wider text-muted uppercase">Definition of Done</h3>
          <ul className="space-y-1">
            {dod.map((d) => (
              <li key={d.key} className="flex items-start gap-2 text-xs">
                {d.met ? <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-ok" /> : <Circle className="mt-0.5 size-3.5 shrink-0 text-faint" />}
                <div>
                  <span className={d.met ? "text-fg" : "text-fg-2"}>{d.label}</span>
                  <span className="block text-[11px] text-muted">{d.detail}</span>
                </div>
              </li>
            ))}
          </ul>
          {task.requiresIndependentReview && <p className="mt-2 text-[11px] text-muted">Independent review required — assignees cannot approve this task.</p>}
        </div>
        <div>
          {task.status !== "in_review" && task.status !== "completed" && canRequest && (
            <div className="space-y-2 rounded-md border border-line bg-panel-2 p-3">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold"><Send className="size-3.5" /> Request review</h3>
              <Field label="Reviewer">
                <Select value={reviewer} onChange={(e) => setReviewer(e.target.value)}>
                  <option value="">Any lead for this track</option>
                  {eligibleReviewers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </Select>
              </Field>
              {!requestCheck.ok && <p className="text-[11px] text-warn">{requestCheck.reason}</p>}
              <Button variant="primary" disabled={!requestCheck.ok || pending} onClick={() => run({ type: "review.request", taskId: task.id, reviewerId: reviewer || null })}>
                Request review
              </Button>
            </div>
          )}
          {task.status === "in_review" && (
            canSubmitReview ? (
              <ReviewForm taskId={task.id} />
            ) : (
              <div className="rounded-md border border-info/30 bg-info-soft p-3 text-xs">
                <p className="font-medium text-fg">Awaiting review{task.reviewerId ? ` by ${member.get(task.reviewerId)?.name}` : " by a track lead"}.</p>
                {!reviewCheck.ok && can("task.review", { task, assignments }) && <p className="mt-1 text-warn">{reviewCheck.reason}</p>}
              </div>
            )
          )}
          {task.status === "completed" && (
            <div className="rounded-md border border-ok/30 bg-ok-soft p-3 text-xs text-ok">
              <ClipboardCheck className="mr-1 inline size-3.5" /> Approved and completed.
            </div>
          )}
        </div>
      </div>
      {data.reviews.length > 0 && (
        <div className="mt-4 border-t border-line pt-3">
          <h3 className="mb-2 text-[11px] font-semibold tracking-wider text-muted uppercase">Review history</h3>
          <div className="space-y-2">
            {data.reviews.map((r) => {
              const rv = member.get(r.reviewerId);
              return (
                <div key={r.id} className="rounded-md border border-line bg-panel-2 p-3">
                  <div className="mb-1.5 flex items-center gap-2 text-xs">
                    {rv && <Avatar name={rv.name} color={rv.avatarColor} size={18} />}
                    <span className="font-medium">{rv?.name}</span>
                    {r.decision === "approved" ? <Badge tone="ok"><CheckCircle2 /> Approved</Badge> : <Badge tone="warn"><XCircle /> Changes requested</Badge>}
                    <span className="ml-auto text-[11px] text-muted"><Ago iso={r.createdAt} /></span>
                  </div>
                  <div className="mb-1.5 flex flex-wrap gap-1">
                    {REVIEW_DIMENSIONS.map((d) => <Badge key={d} tone={RATING_TONE[r.ratings[d]]}>{DIM_LABEL[d]}: {r.ratings[d]}</Badge>)}
                  </div>
                  <p className="text-xs whitespace-pre-wrap text-fg-2">{r.summary}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Section>
  );
}

function ReviewForm({ taskId }: { taskId: string }) {
  const { run, pending } = useCommand();
  const [ratings, setRatings] = useState<Partial<Record<ReviewDimension, ReviewRating>>>({});
  const [summary, setSummary] = useState("");
  const complete = REVIEW_DIMENSIONS.every((d) => ratings[d]);
  const hasFail = Object.values(ratings).includes("fail");
  const submit = (decision: "approved" | "changes_requested") => run({ type: "review.submit", taskId, decision, ratings: ratings as Record<ReviewDimension, ReviewRating>, summary });
  return (
    <div className="space-y-2 rounded-md border border-line bg-panel-2 p-3">
      <h3 className="text-xs font-semibold">Structured review</h3>
      <div className="space-y-1">
        {REVIEW_DIMENSIONS.map((d) => (
          <div key={d} className="flex items-center gap-2 text-xs">
            <span className="w-40 shrink-0 text-fg-2">{DIM_LABEL[d]}</span>
            <div className="flex gap-0.5" role="radiogroup" aria-label={DIM_LABEL[d]}>
              {(["pass", "concern", "fail", "na"] as const).map((r) => (
                <button key={r} role="radio" aria-checked={ratings[d] === r} onClick={() => setRatings({ ...ratings, [d]: r })} className={cn("rounded border px-1.5 py-0.5 text-[10px] uppercase", ratings[d] === r ? { pass: "border-ok bg-ok-soft text-ok", concern: "border-warn bg-warn-soft text-warn", fail: "border-danger bg-danger-soft text-danger", na: "border-line-strong bg-panel-3 text-fg" }[r] : "border-line text-muted hover:text-fg")}>
                  {r}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Summary: what was verified, what must change, how acceptance criteria were checked" />
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" disabled={!complete || hasFail || summary.length < 5 || pending} onClick={() => submit("approved")}><CheckCircle2 /> Approve & complete</Button>
        <Button variant="danger" disabled={!complete || summary.length < 5 || pending} onClick={() => submit("changes_requested")}><XCircle /> Request changes</Button>
      </div>
      {hasFail && <p className="text-[11px] text-warn">A failing dimension means changes must be requested.</p>}
    </div>
  );
}

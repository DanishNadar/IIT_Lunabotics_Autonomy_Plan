"use client";

import { Ago } from "@/components/ui/time";
import { CheckCircle2, Circle, ExternalLink, ShieldCheck, Upload } from "lucide-react";
import { useState } from "react";
import { Dialog } from "@/components/ui/overlay";
import { Badge, Button, Field, Input, Textarea } from "@/components/ui/primitives";
import { useCommand } from "@/components/use-command";
import { useCan, useLookup } from "@/components/workspace";
import type { Deliverable } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import { Section } from "./section";
import type { TaskDetailData } from "./task-detail";

const KIND_LABEL: Record<Deliverable["kind"], string> = { code: "Code", launch: "Launch", config: "Config", docs: "Docs", tests: "Tests", benchmark: "Benchmark", media: "Recording", pr: "Pull request", notebook: "Notebook", diagram: "Diagram" };

export function DeliverablesSection({ data }: { data: TaskDetailData }) {
  const can = useCan();
  const { member } = useLookup();
  const canSubmit = can("task.submit", { task: data.task, assignments: data.assignments });
  const required = data.deliverables.filter((d) => d.required);
  const submittedIds = new Set(data.submissions.map((s) => s.deliverableId));
  return (
    <Section id="deliverables" letter="H" title="Deliverables" subtitle={`${required.filter((d) => submittedIds.has(d.id)).length}/${required.length} required submitted · evidence links are stored with the task`}>
      <ul className="space-y-1.5">
        {data.deliverables.map((d) => {
          const subs = data.submissions.filter((s) => s.deliverableId === d.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
          return (
            <li key={d.id} className="rounded-md border border-line bg-panel-2 px-3 py-2">
              <div className="flex items-center gap-2">
                {subs.length ? <CheckCircle2 className="size-4 text-ok" /> : <Circle className="size-4 text-faint" />}
                <span className="flex-1 text-[15px] text-fg">{d.title}</span>
                <Badge>{KIND_LABEL[d.kind]}</Badge>
                {!d.required && <Badge tone="neutral">optional</Badge>}
                {canSubmit && <SubmitDialog taskId={data.task.id} deliverable={d} />}
              </div>
              {subs.length > 0 && (
                <ul className="mt-1.5 space-y-0.5 pl-6">
                  {subs.map((s) => (
                    <li key={s.id} className="flex flex-wrap items-center gap-2 text-[13px]">
                      <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 truncate text-info hover:underline"><ExternalLink className="size-3" />{s.url.replace(/^https?:\/\//, "").slice(0, 70)}</a>
                      <span className="text-muted">{member.get(s.memberId)?.name} · <Ago iso={s.createdAt} /></span>
                      {s.note && <span className="text-fg-2">— {s.note}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

function SubmitDialog({ taskId, deliverable }: { taskId: string; deliverable: Deliverable }) {
  const [open, setOpen] = useState(false);
  const { run, pending } = useCommand();
  return (
    <Dialog open={open} onOpenChange={setOpen} title={`Submit: ${deliverable.title}`} description="Link to the artifact (PR, file in the repo, recording, report). Reviewers open these links." trigger={<Button size="xs"><Upload /> Submit</Button>}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          void run({ type: "deliverable.submit", taskId, deliverableId: deliverable.id, url: String(f.get("url")), note: String(f.get("note") ?? "") }, { onSuccess: () => setOpen(false) });
        }}
      >
        <Field label="Link"><Input name="url" type="url" required placeholder="https://github.com/…" /></Field>
        <Field label="Note (optional)"><Textarea name="note" placeholder="What's included, how to run it, known gaps" /></Field>
        <div className="flex justify-end"><Button type="submit" variant="primary" disabled={pending}>Submit</Button></div>
      </form>
    </Dialog>
  );
}

export function AcceptanceSection({ data }: { data: TaskDetailData }) {
  const can = useCan();
  const { run } = useCommand();
  const { member } = useLookup();
  const canVerify = can("task.review", { task: data.task, assignments: data.assignments });
  return (
    <Section id="acceptance" letter="I" title="Acceptance criteria" subtitle="Measurable conditions a reviewer checks. Numeric targets are internal engineering goals with stated rationale.">
      <ul className="space-y-1.5">
        {data.acceptance.map((a) => (
          <li key={a.id} className="flex items-start gap-2.5 rounded-md border border-line bg-panel-2 px-3 py-2">
            <button
              disabled={!canVerify}
              onClick={() => run({ type: "acceptance.verify", criterionId: a.id, verified: !a.verified }, { quiet: true })}
              className={cn("mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border", a.verified ? "border-ok bg-ok text-bg" : "border-line-strong", !canVerify && "cursor-default")}
              aria-label={a.verified ? "Verified by reviewer" : canVerify ? "Mark verified" : "Not yet verified"}
              title={canVerify ? "Reviewer: toggle verification" : undefined}
            >
              {a.verified && <ShieldCheck className="size-3" />}
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] text-fg">{a.text}</p>
              {a.target && (
                <p className="mt-0.5 text-[13px]">
                  <span className="text-info">Internal target: {a.target}</span>
                  {a.rationale && <span className="text-muted"> — {a.rationale}</span>}
                </p>
              )}
              {a.verified && a.verifiedBy && <p className="text-xs text-ok">Verified by {member.get(a.verifiedBy)?.name}</p>}
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}

"use client";

import { Ago, When } from "@/components/ui/time";
import { NotebookPen } from "lucide-react";
import { useState } from "react";
import { LogSessionDialog } from "@/components/tasks/log-session-dialog";
import { Avatar, Button } from "@/components/ui/primitives";
import { useCan, useLookup } from "@/components/workspace";
import { STATUS_LABEL } from "@/lib/domain/types";

import { Section } from "./section";
import type { TaskDetailData } from "./task-detail";

export function ProgressLogSection({ data }: { data: TaskDetailData }) {
  const can = useCan();
  const { member } = useLookup();
  const [open, setOpen] = useState(false);
  const canLog = can("task.progress", { task: data.task, assignments: data.assignments });
  type Entry = { at: string; node: React.ReactNode };
  const entries: Entry[] = [
    ...data.logs.map((l) => {
      const m = member.get(l.memberId);
      const step = l.checklistItemId ? data.checklist.find((c) => c.id === l.checklistItemId) : null;
      return {
        at: l.createdAt,
        node: (
          <div className="rounded-md border border-line bg-panel-2 p-3 text-[13px]">
            <div className="mb-1.5 flex items-center gap-2">
              {m && <Avatar name={m.name} color={m.avatarColor} size={18} />}
              <span className="font-medium text-fg">{m?.name}</span>
              <span className="text-faint">logged a work session{l.hours ? ` · ${l.hours}h` : ""}</span>
              <span className="ml-auto text-[13px] text-muted" title={l.createdAt}><When iso={l.createdAt} pattern="MMM d, HH:mm" /></span>
            </div>
            {step && <p className="mb-1 text-[13px] text-info">Step: {step.text}</p>}
            <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-[110px_1fr]">
              {([["Worked on", l.workedOn], ["What changed", l.changed], ["Problems", l.problems], ["Experiments", l.experiments], ["Learned", l.learned], ["Next steps", l.nextSteps]] as const).filter(([, v]) => v).map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-muted">{k}</dt>
                  <dd className="whitespace-pre-wrap text-fg-2">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        ),
      };
    }),
    ...data.history.map((h) => ({
      at: h.createdAt,
      node: (
        <div className="flex items-center gap-2 px-1 text-[13px] text-muted">
          <span className="size-1.5 rounded-full bg-line-strong" />
          {h.changedBy ? member.get(h.changedBy)?.name : "System"} {h.from ? <>moved {STATUS_LABEL[h.from]} → <span className="text-fg-2">{STATUS_LABEL[h.to]}</span></> : <>created as {STATUS_LABEL[h.to]}</>}
          {h.note && h.note !== "Seeded" && <span className="text-faint">· {h.note}</span>}
          <span className="ml-auto"><Ago iso={h.createdAt} /></span>
        </div>
      ),
    })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <Section id="log" letter="L" title="Engineering progress log" subtitle="Work sessions and status history, newest first" actions={canLog ? <Button size="xs" onClick={() => setOpen(true)}><NotebookPen /> Log session</Button> : null}>
      {entries.length === 0 ? <p className="text-[13px] text-muted">No activity yet.</p> : <div className="space-y-2">{entries.map((e, i) => <div key={i}>{e.node}</div>)}</div>}
      {open && <LogSessionDialog taskId={data.task.id} taskKey={data.task.key} steps={data.checklist} open onOpenChange={setOpen} />}
    </Section>
  );
}

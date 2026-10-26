"use client";

import { differenceInCalendarDays } from "date-fns";
import { Flag, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Dialog } from "@/components/ui/overlay";
import { Badge, Button, Field, Input, Panel, Progress, Textarea } from "@/components/ui/primitives";
import { useCommand } from "@/components/use-command";
import { useCan, useWorkspace } from "@/components/workspace";
import { parseDay } from "@/lib/domain/sprint";
import type { Milestone, Sprint, TrackId } from "@/lib/domain/types";
import type { TaskSummary } from "@/lib/domain/views";
import { STATUS_DOT } from "@/lib/ui-meta";
import { cn, day, pct } from "@/lib/utils";

export function RoadmapClient({ milestones, tasks, sprints }: { milestones: Milestone[]; tasks: TaskSummary[]; sprints: Sprint[] }) {
  const { tracks } = useWorkspace();
  const can = useCan();
  const today = new Date();
  const dates = [...milestones.map((m) => parseDay(m.targetDate)), ...sprints.flatMap((s) => [parseDay(s.startDate), parseDay(s.endDate)]), today];
  const min = new Date(Math.min(...dates.map((d) => d.getTime())) - 7 * 864e5);
  const max = new Date(Math.max(...dates.map((d) => d.getTime())) + 7 * 864e5);
  const span = differenceInCalendarDays(max, min);
  const x = (d: Date) => `${(differenceInCalendarDays(d, min) / span) * 100}%`;

  return (
    <div className="mx-auto max-w-[1500px] space-y-4 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <h1 className="text-xl font-semibold">Technical roadmap</h1>
          <p className="text-[13px] text-muted">Milestone dates are proposed internal plans that leads can move — not external deadlines. Completion counts review-approved tasks only.</p>
        </div>
        {can("milestone.manage") && <CreateMilestone />}
      </div>

      <Panel className="overflow-x-auto p-4">
        <div className="relative h-24 min-w-[800px]">
          <div className="absolute top-12 right-0 left-0 h-px bg-line-strong" />
          {sprints.map((s) => (
            <div key={s.id} className="absolute top-9 h-6 rounded bg-info-soft ring-1 ring-info/30" style={{ left: x(parseDay(s.startDate)), width: `calc(${x(parseDay(s.endDate))} - ${x(parseDay(s.startDate))})` }} title={s.name}>
              <span className="absolute -top-5 left-0 text-xs whitespace-nowrap text-info">{s.name.split("—")[0]}</span>
            </div>
          ))}
          {milestones.map((m) => (
            <div key={m.id} className="absolute top-10" style={{ left: x(parseDay(m.targetDate)) }}>
              <div className="-ml-1.5 size-3 rotate-45 border-2 border-accent bg-bg" />
              <div className="mt-2 -ml-6 w-28 text-xs leading-tight"><div className="font-semibold text-fg">{m.name.split("·")[0]}</div><div className="text-muted">{day(m.targetDate)}</div></div>
            </div>
          ))}
          <div className="absolute top-6 bottom-0 w-px bg-accent/60" style={{ left: x(today) }}><span className="absolute -top-4 -left-3 text-[11px] text-accent">today</span></div>
        </div>
      </Panel>

      <div className="space-y-3">
        {milestones.map((m) => {
          const mt = tasks.filter((t) => t.milestoneId === m.id);
          const done = mt.filter((t) => t.status === "completed").length;
          return (
            <Panel key={m.id}>
              <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-2.5">
                <Flag className="size-4 text-accent" />
                <div className="min-w-0 flex-1">
                  <h2 className="text-[15px] font-semibold">{m.name}</h2>
                  <p className="text-[13px] text-muted">{m.description}</p>
                </div>
                <Badge tone="warn">{m.status}</Badge>
                <span className="font-mono text-[13px] text-muted">{day(m.targetDate, "MMM d, yyyy")}</span>
                <div className="flex w-40 items-center gap-2"><Progress value={pct(done, mt.length)} tone="ok" /><span className="font-mono text-xs text-muted">{done}/{mt.length}</span></div>
              </div>
              <div className="grid gap-px bg-line md:grid-cols-7">
                {tracks.map((tr) => {
                  const list = mt.filter((t) => t.trackId === (tr.id as TrackId));
                  return (
                    <div key={tr.id} className="bg-panel p-2">
                      <div className="mb-1 font-mono text-xs font-semibold" style={{ color: tr.color }}>{tr.id}</div>
                      <div className="flex flex-wrap gap-1">
                        {list.map((t) => (
                          <Link key={t.id} href={`/tasks/${t.key}`} title={`${t.key} ${t.title} — ${t.status}`} className="inline-flex items-center gap-1 rounded border border-line bg-panel-2 px-1.5 py-0.5 font-mono text-xs text-fg-2 hover:border-line-strong">
                            <span className={cn("size-1.5 rounded-full", STATUS_DOT[t.status])} />{t.key}
                          </Link>
                        ))}
                        {!list.length && <span className="text-xs text-faint">—</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}

function CreateMilestone() {
  const [open, setOpen] = useState(false);
  const { run, pending } = useCommand();
  const { tracks } = useWorkspace();
  return (
    <Dialog open={open} onOpenChange={setOpen} title="Create milestone" trigger={<Button variant="primary"><Plus /> New milestone</Button>}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); void run({ type: "milestone.create", name: String(f.get("name")), description: String(f.get("desc")), targetDate: String(f.get("date")), trackIds: f.getAll("tracks") as TrackId[] }, { onSuccess: () => setOpen(false) }); }}>
        <Field label="Name"><Input name="name" required /></Field>
        <Field label="Target date (proposed)"><Input name="date" type="date" required /></Field>
        <Field label="Description"><Textarea name="desc" /></Field>
        <fieldset className="flex flex-wrap gap-2 text-[13px]">{tracks.map((t) => <label key={t.id} className="flex items-center gap-1"><input type="checkbox" name="tracks" value={t.id} /> {t.id}</label>)}</fieldset>
        <div className="flex justify-end"><Button type="submit" variant="primary" disabled={pending}>Create</Button></div>
      </form>
    </Dialog>
  );
}

"use client";

import { BookMarked, Check, Dumbbell, Target } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { StatusBadge, TaskLink, TrackChip } from "@/components/tasks/bits";
import { Panel, PanelHeader, Progress } from "@/components/ui/primitives";
import { useCommand } from "@/components/use-command";
import { RESOURCE_TYPE_LABEL, type LearningModule, type LearningPath, type Resource } from "@/lib/domain/types";
import type { TaskSummary } from "@/lib/domain/views";
import { cn, pct } from "@/lib/utils";

export function PathClient({ path, modules, resources, done, followOn }: { path: LearningPath; modules: LearningModule[]; resources: Record<string, Resource>; done: string[]; followOn: TaskSummary[] }) {
  const { run } = useCommand();
  const [local, setLocal] = useState(new Set(done));
  useEffect(() => setLocal(new Set(done)), [done]);
  const count = modules.filter((m) => local.has(m.id)).length;
  const toggle = (id: string) => {
    const on = !local.has(id);
    setLocal((s) => { const n = new Set(s); if (on) n.add(id); else n.delete(id); return n; });
    void run({ type: "learning.toggle", moduleId: id, done: on }, { quiet: true, onError: () => setLocal(new Set(done)) });
  };
  return (
    <div className="mx-auto max-w-[1100px] space-y-4 p-4">
      <div>
        <Link href="/learn" className="text-[11px] text-muted hover:text-fg">Learning paths /</Link>
        <h1 className="text-xl font-semibold">{path.title}</h1>
        <p className="text-xs text-muted">{path.audience}</p>
        <p className="mt-2 max-w-3xl text-sm text-fg-2">{path.summary}</p>
        <div className="mt-3 flex max-w-md items-center gap-2 text-xs"><Progress value={pct(count, modules.length)} tone="ok" label="Path progress" /><span className="font-mono text-muted">{count}/{modules.length}</span></div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <ol className="space-y-2">
          {modules.map((m, i) => {
            const on = local.has(m.id);
            return (
              <li key={m.id} className={cn("rounded-lg border bg-panel p-3", on ? "border-ok/30" : "border-line")}>
                <div className="flex items-start gap-3">
                  <button role="checkbox" aria-checked={on} aria-label={`Mark module ${m.title} complete`} onClick={() => toggle(m.id)} className={cn("mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border", on ? "border-ok bg-ok text-bg" : "border-line-strong hover:border-ok")}>
                    {on ? <Check className="size-3" strokeWidth={3} /> : <span className="font-mono text-[10px] text-muted">{i + 1}</span>}
                  </button>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-[13px] font-semibold text-fg">{m.title}</h2>
                    <p className="flex items-center gap-1 text-xs text-muted"><Target className="size-3" /> {m.objective}</p>
                    <ul className="mt-2 space-y-0.5 text-xs text-fg-2">
                      {m.checklist.map((c) => <li key={c} className="flex gap-1.5"><span className="text-faint">▸</span>{c}</li>)}
                    </ul>
                    {m.exercise && <p className="mt-2 flex items-start gap-1.5 rounded border border-info/25 bg-info-soft px-2 py-1 text-xs text-fg-2"><Dumbbell className="mt-0.5 size-3 text-info" /><span><strong className="text-info">Optional exercise:</strong> {m.exercise}</span></p>}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {m.resourceIds.map((id) => resources[id]).filter(Boolean).map((r) => (
                        <a key={r.id} href={r.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded border border-line bg-panel-2 px-1.5 py-0.5 text-[11px] text-fg-2 hover:text-info"><BookMarked className="size-3" />{r.title}<span className="text-faint">· {RESOURCE_TYPE_LABEL[r.type]}</span></a>
                      ))}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
        <div className="space-y-4">
          <Panel>
            <PanelHeader title="Prerequisites" />
            <ul className="list-disc space-y-0.5 px-3 py-2 pl-7 text-xs text-fg-2">{path.prerequisites.map((x) => <li key={x}>{x}</li>)}</ul>
          </Panel>
          <Panel>
            <PanelHeader title="Learning objectives" />
            <ul className="list-disc space-y-0.5 px-3 py-2 pl-7 text-xs text-fg-2">{path.objectives.map((x) => <li key={x}>{x}</li>)}</ul>
          </Panel>
          <Panel>
            <PanelHeader title="Suggested follow-on tasks" />
            <ul className="divide-y divide-line">
              {followOn.map((t) => <li key={t.id} className="flex items-center gap-2 px-3 py-1.5 text-xs"><TrackChip trackId={t.trackId} /><TaskLink k={t.key} title={t.title} className="min-w-0 flex-1" /><StatusBadge status={t.status} /></li>)}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}

"use client";

import { Ago } from "@/components/ui/time";
import { ExternalLink, Pencil } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { TaskLink, TrackChip } from "@/components/tasks/bits";
import { ExperimentForm } from "@/components/experiment-form";
import { Badge, Button, Panel, PanelHeader } from "@/components/ui/primitives";
import { useCan, useLookup, useWorkspace } from "@/components/workspace";
import type { Experiment, MetricDefinition, TrackId } from "@/lib/domain/types";


export function ExperimentDetail({ experiment: e, taskKey, metrics, tasks }: { experiment: Experiment; taskKey: string | null; metrics: MetricDefinition[]; tasks: { id: string; key: string; title: string; trackId: TrackId }[] }) {
  const [editing, setEditing] = useState(false);
  const can = useCan();
  const { actor } = useWorkspace();
  const { member } = useLookup();
  const def = new Map(metrics.map((m) => [m.key, m]));
  const canEdit = !e.isDemo && (e.createdBy === actor.id ? can("experiment.create") : can("experiment.manage"));
  return (
    <div className="mx-auto max-w-[1100px] space-y-4 p-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <Link href="/experiments" className="text-[11px] text-muted hover:text-fg">Experiments /</Link>
          <h1 className="text-xl font-semibold">{e.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
            <TrackChip trackId={e.trackId} withName />
            {taskKey && <TaskLink k={taskKey} />}
            <Badge tone={e.status === "complete" ? "ok" : "info"}>{e.status}</Badge>
            {e.isDemo && <Badge tone="warn">synthetic demonstration — not a measured result</Badge>}
            <span>· {e.createdBy ? member.get(e.createdBy)?.name : "seed"} · updated <Ago iso={e.updatedAt} /></span>
          </div>
        </div>
        {canEdit && !editing && <Button onClick={() => setEditing(true)}><Pencil /> Edit</Button>}
      </div>
      {editing ? (
        <Panel className="p-4"><ExperimentForm experiment={e} metrics={metrics} tasks={tasks} onDone={() => setEditing(false)} /></Panel>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Panel><PanelHeader title="Hypothesis" /><p className="p-3 text-xs text-fg-2">{e.hypothesis || "—"}</p></Panel>
            <Panel>
              <PanelHeader title="Setup" />
              <dl className="grid grid-cols-[100px_1fr] gap-y-1 p-3 text-xs">
                <dt className="text-muted">Environment</dt><dd>{e.environment || "—"}</dd>
                <dt className="text-muted">Commit</dt><dd className="font-mono">{e.commit || "—"}</dd>
                <dt className="text-muted">Dataset</dt><dd>{e.dataset || "—"}</dd>
                {Object.entries(e.parameters).map(([k, v]) => <div key={k} className="contents"><dt className="font-mono text-muted">{k}</dt><dd className="font-mono">{v}</dd></div>)}
              </dl>
            </Panel>
          </div>
          <Panel>
            <PanelHeader title="Metrics" />
            <table className="w-full text-xs">
              <thead><tr className="border-b border-line text-left text-[10px] text-muted uppercase"><th className="px-3 py-1.5">Metric</th><th>Value</th><th>Definition</th><th className="pr-3">Provenance</th></tr></thead>
              <tbody>
                {e.metrics.map((m) => {
                  const d = def.get(m.metricKey);
                  return <tr key={m.metricKey} className="border-b border-line align-top last:border-0"><td className="px-3 py-1.5 text-fg">{d?.name ?? m.metricKey}</td><td className="py-1.5 font-mono">{m.value} {d?.unit}</td><td className="py-1.5 text-fg-2">{d?.definition}{m.note && <div className="text-muted">{m.note}</div>}</td><td className="py-1.5 pr-3 text-muted">{d?.provenance}</td></tr>;
                })}
                {!e.metrics.length && <tr><td colSpan={4} className="px-3 py-4 text-center text-muted">No metrics recorded.</td></tr>}
              </tbody>
            </table>
          </Panel>
          <div className="grid gap-4 md:grid-cols-3">
            <Panel><PanelHeader title="Results" /><p className="p-3 text-xs whitespace-pre-wrap text-fg-2">{e.results || "—"}</p></Panel>
            <Panel><PanelHeader title="Notes" /><p className="p-3 text-xs whitespace-pre-wrap text-fg-2">{e.notes || "—"}</p></Panel>
            <Panel><PanelHeader title="Conclusions" /><p className="p-3 text-xs whitespace-pre-wrap text-fg-2">{e.conclusions || "—"}</p></Panel>
          </div>
          {e.artifacts.length > 0 && (
            <Panel><PanelHeader title="Artifacts" /><ul className="p-3 text-xs">{e.artifacts.map((a) => <li key={a.url}><a href={a.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-info hover:underline"><ExternalLink className="size-3" />{a.label || a.url}</a></li>)}</ul></Panel>
          )}
        </>
      )}
    </div>
  );
}

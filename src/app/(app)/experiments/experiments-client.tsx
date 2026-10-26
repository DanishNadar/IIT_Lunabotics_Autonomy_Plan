"use client";

import { Ago } from "@/components/ui/time";
import { FlaskConical, GitCompare, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TrackChip } from "@/components/tasks/bits";
import { ExperimentForm } from "@/components/experiment-form";
import { Dialog } from "@/components/ui/overlay";
import { Badge, Button, EmptyState, Panel, PanelHeader } from "@/components/ui/primitives";
import { useCan } from "@/components/workspace";
import type { Experiment, MetricDefinition, TrackId } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

const PALETTE = ["#22d3ee", "#a78bfa", "#f59e0b", "#34d399", "#f472b6", "#ef4444"];

export function ExperimentsClient({ experiments, metrics, tasks }: { experiments: (Experiment & { taskKey: string | null })[]; metrics: MetricDefinition[]; tasks: { id: string; key: string; title: string; trackId: TrackId }[] }) {
  const can = useCan();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState<string[]>([]);
  const [track, setTrack] = useState<string>("");
  const shown = experiments.filter((e) => !track || e.trackId === track).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const compared = experiments.filter((e) => sel.includes(e.id));
  const metricKeys = useMemo(() => [...new Set(compared.flatMap((e) => e.metrics.map((m) => m.metricKey)))], [compared]);
  const def = new Map(metrics.map((m) => [m.key, m]));

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1">
          <h1 className="text-xl font-semibold">Experiments & testing</h1>
          <p className="text-xs text-muted">Every metric has a definition, unit and provenance. Records marked <Badge tone="warn">demo data</Badge> are synthetic demonstrations, not measured results.</p>
        </div>
        {can("experiment.create") && (
          <Dialog open={open} onOpenChange={setOpen} title="Record an experiment" wide trigger={<Button variant="primary"><Plus /> New experiment</Button>}>
            <ExperimentForm metrics={metrics} tasks={tasks} onDone={(id) => { setOpen(false); router.push(`/experiments/${id}`); }} />
          </Dialog>
        )}
      </div>

      {compared.length >= 2 && (
        <Panel>
          <PanelHeader title={`Comparing ${compared.length} experiments`} icon={<GitCompare />} actions={<button onClick={() => setSel([])} className="text-[11px] text-muted hover:text-fg">Clear</button>} />
          <div className="grid gap-4 p-3 lg:grid-cols-2">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="text-left text-[10px] text-muted uppercase"><th className="py-1">Metric</th>{compared.map((e, i) => <th key={e.id} className="py-1" style={{ color: PALETTE[i % PALETTE.length] }}>{e.name.slice(0, 28)}</th>)}</tr></thead>
                <tbody>
                  {metricKeys.map((k) => {
                    const d = def.get(k);
                    const values = compared.map((e) => e.metrics.find((m) => m.metricKey === k)?.value);
                    const nums = values.filter((v): v is number => v !== undefined);
                    const best = nums.length ? (d?.higherIsBetter ? Math.max(...nums) : Math.min(...nums)) : null;
                    return (
                      <tr key={k} className="border-t border-line">
                        <td className="py-1.5 pr-2"><div className="text-fg">{d?.name ?? k}</div><div className="text-[10px] text-faint">{d?.unit} · {d?.higherIsBetter ? "higher is better" : "lower is better"}</div></td>
                        {values.map((v, i) => <td key={i} className={cn("py-1.5 font-mono", v === best && nums.length > 1 ? "text-ok" : "text-fg-2")}>{v ?? "—"}</td>)}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {compared.some((e) => e.isDemo) && <p className="mt-2 text-[11px] text-warn">Includes synthetic demo records — do not draw engineering conclusions.</p>}
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metricKeys.map((k) => ({ metric: def.get(k)?.name ?? k, ...Object.fromEntries(compared.map((e) => [e.name, e.metrics.find((m) => m.metricKey === k)?.value ?? null])) }))} margin={{ left: -10 }}>
                  <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" />
                  <XAxis dataKey="metric" tick={{ fill: "var(--muted)", fontSize: 10 }} />
                  <YAxis tick={{ fill: "var(--muted)", fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: "var(--panel-2)", border: "1px solid var(--line-strong)", fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  {compared.map((e, i) => <Bar key={e.id} dataKey={e.name} fill={PALETTE[i % PALETTE.length]} radius={[3, 3, 0, 0]} />)}
                </BarChart>
              </ResponsiveContainer>
              <p className="text-center text-[10px] text-faint">Mixed units share one axis; read the table for exact values.</p>
            </div>
          </div>
        </Panel>
      )}

      <div className="flex gap-1">
        <button onClick={() => setTrack("")} className={cn("rounded border px-2 py-0.5 text-[11px]", !track ? "border-info/50 text-info" : "border-line text-muted")}>All</button>
        {[...new Set(experiments.map((e) => e.trackId))].map((t) => <button key={t} onClick={() => setTrack(t)} className={cn("rounded border px-2 py-0.5 font-mono text-[11px]", track === t ? "border-info/50 text-info" : "border-line text-muted")}>{t}</button>)}
      </div>
      <Panel>
        {shown.length === 0 ? <EmptyState icon={<FlaskConical />} title="No experiments yet" /> : (
          <table className="w-full text-xs">
            <thead><tr className="border-b border-line text-left text-[10px] tracking-wider text-muted uppercase"><th className="w-8 px-3 py-2" /><th className="py-2">Name</th><th className="py-2">Track</th><th className="py-2">Task</th><th className="py-2">Status</th><th className="py-2">Metrics</th><th className="py-2 pr-3">Updated</th></tr></thead>
            <tbody>
              {shown.map((e) => (
                <tr key={e.id} className="border-b border-line last:border-0 hover:bg-panel-2">
                  <td className="px-3 py-2"><input type="checkbox" checked={sel.includes(e.id)} onChange={() => setSel(sel.includes(e.id) ? sel.filter((x) => x !== e.id) : [...sel, e.id])} aria-label={`Compare ${e.name}`} /></td>
                  <td className="py-2"><Link href={`/experiments/${e.id}`} className="text-fg hover:underline">{e.name}</Link>{e.isDemo && <Badge tone="warn" className="ml-2">demo data</Badge>}</td>
                  <td className="py-2"><TrackChip trackId={e.trackId} /></td>
                  <td className="py-2 font-mono text-muted">{e.taskKey ?? "—"}</td>
                  <td className="py-2"><Badge tone={e.status === "complete" ? "ok" : e.status === "invalid" ? "danger" : "info"}>{e.status}</Badge></td>
                  <td className="py-2 text-muted">{e.metrics.length}</td>
                  <td className="py-2 pr-3 text-muted"><Ago iso={e.updatedAt} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
      <p className="text-[11px] text-faint">Select two or more experiments to compare.</p>
    </div>
  );
}

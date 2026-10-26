"use client";

import { AlertOctagon, CheckCircle2, CircleDashed, Info, Link2, Loader, Rocket, ShieldCheck, Users } from "lucide-react";
import { useState } from "react";
import { StatusBadge, TaskLink } from "@/components/tasks/bits";
import { Dialog } from "@/components/ui/overlay";
import { Avatar, Badge, Button, Field, Input, Panel, PanelHeader, Progress } from "@/components/ui/primitives";
import { useCommand } from "@/components/use-command";
import { useCan, useLookup } from "@/components/workspace";
import { STAGES, type ReadinessCell, type Stage, type SubsystemReadiness } from "@/lib/domain/readiness";
import type { AppSettings, ExternalDependency, TrackId } from "@/lib/domain/types";
import { EXTERNAL_DEP_STATUS } from "@/lib/ui-meta";
import type { TaskSummary } from "@/lib/domain/views";
import { cn, day, pct } from "@/lib/utils";

const STAGE_LABEL: Record<Stage, string> = { research: "Research", implemented: "Implemented", tested: "Tested", integrated: "Integrated" };
const RULES: Record<Stage, string> = {
  research: "Task has moved past Researching (Designing or later).",
  implemented: "Status ≥ Testing AND a PR/commit is linked or the code deliverable is submitted.",
  tested: "Task approved by review (approval requires test evidence).",
  integrated: "All subsystem tasks approved AND every integration-gate task approved.",
};

function Cell({ c }: { c: ReadinessCell }) {
  const tone = c.state === "done" ? "bg-ok-soft text-ok border-ok/30" : c.state === "in_progress" ? "bg-info-soft text-info border-info/30" : "bg-panel-2 text-faint border-line";
  return (
    <div className={cn("flex h-full flex-col justify-center rounded-md border px-2 py-1.5", tone)} title={c.evidence.join(", ") || "No evidence yet"}>
      <div className="flex items-center gap-1 text-[11px] font-medium">
        {c.state === "done" ? <CheckCircle2 className="size-3.5" /> : c.state === "in_progress" ? <Loader className="size-3.5" /> : <CircleDashed className="size-3.5" />}
        {c.state === "done" ? "Done" : c.state === "in_progress" ? "In progress" : "Not started"}
      </div>
      <div className="font-mono text-[10px] opacity-80">{c.done}/{c.total}</div>
    </div>
  );
}

function TaskList({ tasks }: { tasks: TaskSummary[] }) {
  return <ul className="divide-y divide-line">{tasks.map((t) => <li key={t.id} className="flex items-center gap-2 px-3 py-1.5 text-xs"><TaskLink k={t.key} title={t.title} className="min-w-0 flex-1" />{t.backlog === "advanced" && <Badge tone="violet">advanced</Badge>}<StatusBadge status={t.status} /></li>)}</ul>;
}

export function ReadinessClient(p: {
  matrix: SubsystemReadiness[];
  e2e: AppSettings["e2eDemonstration"];
  safety: TaskSummary[];
  simulation: TaskSummary[];
  missionTests: TaskSummary[];
  blockers: { id: string; description: string; key: string; priority: string }[];
  tracks: { id: TrackId; name: string; total: number; completed: number; inProgress: number }[];
  ownership: { subsystem: string; owners: string[]; unowned: string[] }[];
  missing: { key: string; title: string; missing: string[] }[];
  experiments: number;
  externalDependencies: (ExternalDependency & { taskKeys: string[] })[];
}) {
  const can = useCan();
  const { member } = useLookup();
  const integrated = p.matrix.filter((m) => m.cells.integrated.state === "done").length;
  return (
    <div className="mx-auto max-w-[1400px] space-y-4 p-4">
      <div>
        <h1 className="text-xl font-semibold">Mission readiness</h1>
        <p className="max-w-3xl text-xs text-muted">Every status here is derived from evidence-backed task states. Software-task completion is not competition readiness: a subsystem is only “integrated” once its integration-gate tasks are approved.</p>
      </div>

      <Panel className={cn("border-2", p.e2e.demonstrated ? "border-ok/40" : "border-warn/40")}>
        <div className="flex flex-wrap items-center gap-4 p-4">
          <Rocket className={cn("size-8", p.e2e.demonstrated ? "text-ok" : "text-warn")} />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold tracking-wider text-muted uppercase">End-to-end autonomous simulation</p>
            <p className={cn("text-lg font-semibold", p.e2e.demonstrated ? "text-ok" : "text-warn")}>{p.e2e.demonstrated ? "Demonstrated" : "Not yet demonstrated"}</p>
            <p className="text-xs text-muted">
              {p.e2e.demonstrated ? <>Recorded {day(p.e2e.recordedAt, "MMM d, yyyy")} by {p.e2e.recordedBy ? member.get(p.e2e.recordedBy)?.name : "—"} · <a href={p.e2e.evidenceUrl ?? "#"} target="_blank" rel="noreferrer" className="text-info underline">evidence</a></> : "Criteria (ADR “What constitutes a valid mission demonstration?”): clean bringup, estimated localization only, ≥1 full excavate→deposit cycle without human input, with a linked recording or bag."}
            </p>
          </div>
          {can("readiness.record") && <RecordE2E current={p.e2e} />}
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="Readiness matrix" subtitle={`${integrated}/${p.matrix.length} subsystems integrated · hover a cell for evidence`} />
        <div className="overflow-x-auto p-3">
          <table className="w-full min-w-[720px] border-separate border-spacing-1 text-xs">
            <thead>
              <tr>
                <th className="text-left text-[10px] font-semibold tracking-wider text-muted uppercase">Subsystem</th>
                {STAGES.map((s) => <th key={s} className="text-left text-[10px] font-semibold tracking-wider text-muted uppercase"><span title={RULES[s]} className="inline-flex items-center gap-1">{STAGE_LABEL[s]} <Info className="size-3" /></span></th>)}
              </tr>
            </thead>
            <tbody>
              {p.matrix.map((m) => (
                <tr key={m.subsystem}>
                  <td className="pr-2 align-middle"><div className="font-medium text-fg" title={m.note}>{m.subsystem}{m.note && <Info className="ml-1 inline size-3 text-faint" />}</div><div className="font-mono text-[10px] text-faint">{m.taskKeys.join(" ")}</div></td>
                  {STAGES.map((s) => <td key={s} className="h-14"><Cell c={m.cells[s]} /></td>)}
                </tr>
              ))}
            </tbody>
          </table>
          <dl className="mt-3 grid gap-x-6 gap-y-1 text-[11px] text-muted md:grid-cols-2">{STAGES.map((s) => <div key={s}><dt className="inline font-semibold text-fg-2">{STAGE_LABEL[s]}: </dt><dd className="inline">{RULES[s]}</dd></div>)}</dl>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel>
          <PanelHeader title="Track completion" />
          <ul className="space-y-2 p-3">{p.tracks.map((t) => <li key={t.id} className="text-xs"><div className="flex justify-between"><span><span className="font-mono">{t.id}</span> <span className="text-muted">{t.name}</span></span><span className="font-mono text-muted">{t.completed}/{t.total}</span></div><Progress value={pct(t.completed, t.total)} tone="ok" className="mt-1 h-1" /></li>)}</ul>
        </Panel>
        <Panel>
          <PanelHeader title="Autonomy safety decisions" icon={<ShieldCheck />} subtitle="Detecting faults and requesting safe stops. Physical safety and the E-stop are Controls/Electrical." />
          <TaskList tasks={p.safety} />
        </Panel>
        <Panel>
          <PanelHeader title="Simulation scenario coverage" subtitle="Arena, digital twin, stress & robustness scenarios" />
          <TaskList tasks={p.simulation} />
        </Panel>
        <Panel>
          <PanelHeader title="Mission test results" subtitle={`${p.experiments} non-demo integration experiment(s) recorded`} />
          <TaskList tasks={p.missionTests} />
        </Panel>
        <Panel>
          <PanelHeader title="Open critical blockers" icon={<AlertOctagon />} />
          {p.blockers.length ? <ul className="divide-y divide-line">{p.blockers.map((b) => <li key={b.id} className="px-3 py-1.5 text-xs"><TaskLink k={b.key} /> <span className="text-fg-2">{b.description}</span></li>)}</ul> : <p className="p-3 text-xs text-muted">None.</p>}
        </Panel>
        <Panel>
          <PanelHeader title="Subsystem ownership" icon={<Users />} />
          <ul className="divide-y divide-line">
            {p.ownership.map((o) => (
              <li key={o.subsystem} className="flex items-center gap-2 px-3 py-1.5 text-xs">
                <span className="w-24 shrink-0 text-fg">{o.subsystem}</span>
                <span className="flex -space-x-1">{o.owners.map((id) => { const m = member.get(id); return m ? <Avatar key={id} name={m.name} color={m.avatarColor} size={18} /> : null; })}</span>
                {o.unowned.length > 0 && <span className="ml-auto text-[10px] text-warn">unowned: {o.unowned.join(", ")}</span>}
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel>
        <PanelHeader title="External integration dependencies" subtitle="Owned by other teams. Not counted in autonomy readiness — shown so integration blockers are visible." />
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-line text-left text-[10px] text-muted uppercase"><th className="px-3 py-1.5">Team</th><th>Needed by autonomy</th><th>Affects</th><th>Until delivered</th><th className="pr-3">Status</th></tr></thead>
            <tbody>
              {p.externalDependencies.map((d) => (
                <tr key={d.id} className="border-b border-line align-top last:border-0">
                  <td className="px-3 py-1.5 font-medium text-fg">{d.team}</td>
                  <td className="py-1.5 pr-2 text-fg-2">{d.title}</td>
                  <td className="py-1.5 pr-2 font-mono text-[10px] text-muted">{d.taskKeys.join(" ")}</td>
                  <td className="py-1.5 pr-2 text-muted">{d.workaround}</td>
                  <td className="py-1.5 pr-3"><Badge tone={EXTERNAL_DEP_STATUS[d.status].tone}>{EXTERNAL_DEP_STATUS[d.status].label}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="Missing dependencies" icon={<Link2 />} subtitle="Tasks in progress whose prerequisites are not yet approved" />
        {p.missing.length ? <ul className="divide-y divide-line">{p.missing.map((m) => <li key={m.key} className="flex items-center gap-2 px-3 py-1.5 text-xs"><TaskLink k={m.key} title={m.title} className="min-w-0 flex-1" /><span className="text-warn">waiting on {m.missing.join(", ")}</span></li>)}</ul> : <p className="p-3 text-xs text-muted">No in-progress task is waiting on incomplete prerequisites.</p>}
      </Panel>
    </div>
  );
}

function RecordE2E({ current }: { current: AppSettings["e2eDemonstration"] }) {
  const [open, setOpen] = useState(false);
  const { run, pending } = useCommand();
  return (
    <Dialog open={open} onOpenChange={setOpen} title="Record end-to-end demonstration" description="Set only with evidence that meets the ADR criteria. This is audited." trigger={<Button variant={current.demonstrated ? "secondary" : "primary"}>{current.demonstrated ? "Update" : "Record demonstration"}</Button>}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); const demonstrated = f.get("demonstrated") === "yes"; void run({ type: "readiness.recordE2E", demonstrated, evidenceUrl: (f.get("url") as string) || null }, { onSuccess: () => setOpen(false) }); }}>
        <Field label="Status"><select name="demonstrated" defaultValue={current.demonstrated ? "yes" : "yes"} className="h-8 w-full rounded-md border border-line bg-panel-2 px-2 text-sm"><option value="yes">Demonstrated</option><option value="no">Not demonstrated (clear)</option></select></Field>
        <Field label="Evidence link" hint="Recording, bag, or AG-08 report"><Input name="url" type="url" defaultValue={current.evidenceUrl ?? ""} /></Field>
        <div className="flex justify-end"><Button type="submit" variant="primary" disabled={pending}>Save</Button></div>
      </form>
    </Dialog>
  );
}

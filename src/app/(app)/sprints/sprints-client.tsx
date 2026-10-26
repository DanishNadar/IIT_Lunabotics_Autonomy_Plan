"use client";

import { AlertOctagon, CalendarRange, CheckCheck, Play, Plus, Square, Users, X } from "lucide-react";
import { useMemo, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AssigneeStack, PriorityBadge, StatusBadge, TaskLink, TrackChip } from "@/components/tasks/bits";
import { Dialog } from "@/components/ui/overlay";
import { Avatar, Badge, Button, EmptyState, Field, Input, Panel, PanelHeader, Progress, Select, Stat, Textarea } from "@/components/ui/primitives";
import { useCommand } from "@/components/use-command";
import { useCan, useWorkspace } from "@/components/workspace";
import type { SprintStats } from "@/lib/domain/sprint";
import type { Sprint } from "@/lib/domain/types";
import type { TaskSummary } from "@/lib/domain/views";
import type { Workload } from "@/lib/domain/workload";
import { cn, day, pct } from "@/lib/utils";

interface SprintVM {
  sprint: Sprint;
  stats: SprintStats;
  burndown: { day: string; ideal: number; remaining: number }[];
  memberCapacity: number;
  blockers: { id: string; description: string; key: string }[];
}

export function SprintsClient({ sprints, tasks, workloads }: { sprints: SprintVM[]; tasks: TaskSummary[]; workloads: (Workload & { id: string })[] }) {
  const can = useCan();
  const manage = can("sprint.manage");
  const def = sprints.find((s) => s.sprint.status === "active") ?? sprints.find((s) => s.sprint.status === "planned") ?? sprints[0];
  const [selected, setSelected] = useState(def?.sprint.id ?? null);
  const vm = sprints.find((s) => s.sprint.id === selected);

  return (
    <div className="mx-auto max-w-[1500px] space-y-4 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="flex-1 text-xl font-semibold">Sprint planning</h1>
        {manage && <CreateSprintDialog />}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {sprints.map((s) => (
          <button key={s.sprint.id} onClick={() => setSelected(s.sprint.id)} className={cn("rounded-md border px-3 py-1.5 text-left text-[13px]", selected === s.sprint.id ? "border-info/50 bg-info-soft" : "border-line bg-panel hover:border-line-strong")}>
            <div className="font-medium text-fg">{s.sprint.name}</div>
            <div className="text-xs text-muted">{day(s.sprint.startDate)} – {day(s.sprint.endDate)} · {s.sprint.status}{s.sprint.isProposed ? " · proposed" : ""}</div>
          </button>
        ))}
      </div>
      {!vm ? <Panel><EmptyState icon={<CalendarRange />} title="No sprints yet" /></Panel> : <SprintDetail vm={vm} all={sprints} tasks={tasks} workloads={workloads} manage={manage} />}
    </div>
  );
}

function SprintDetail({ vm, all, tasks, workloads, manage }: { vm: SprintVM; all: SprintVM[]; tasks: TaskSummary[]; workloads: (Workload & { id: string })[]; manage: boolean }) {
  const { sprint, stats } = vm;
  const { run, pending } = useCommand();
  const { members } = useWorkspace();
  const inSprint = tasks.filter((t) => t.sprintId === sprint.id);
  const candidates = tasks.filter((t) => !t.archived && !t.sprintId && t.status !== "completed" && (t.backlog === "initial" || t.missingDeps.length === 0));
  const [adding, setAdding] = useState("");
  const [closing, setClosing] = useState(false);
  const capacity = sprint.capacityHours || vm.memberCapacity;
  const over = capacity > 0 && stats.plannedHours > capacity;
  const participants = members.filter((m) => sprint.memberIds.includes(m.id));
  const nonParticipants = members.filter((m) => m.active && m.role !== "viewer" && !sprint.memberIds.includes(m.id));
  const hoursByMember = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of inSprint) for (const a of t.assignees) m.set(a.memberId, (m.get(a.memberId) ?? 0) + t.estimateHours * (a.role === "owner" ? 1 : 0.4));
    return m;
  }, [inSprint]);

  return (
    <div className="space-y-4">
      <Panel>
        <div className="flex flex-wrap items-start gap-4 p-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold">{sprint.name}</h2>
              <Badge tone={sprint.status === "active" ? "ok" : sprint.status === "planned" ? "info" : "neutral"}>{sprint.status}</Badge>
              {sprint.isProposed && <Badge tone="warn" title="A proposed plan the lead can modify — not an external deadline">proposed schedule</Badge>}
            </div>
            <p className="mt-1 max-w-3xl text-[13px] text-fg-2">{sprint.goal}</p>
            <p className="mt-1 text-[13px] text-muted">{day(sprint.startDate, "EEE MMM d")} → {day(sprint.endDate, "EEE MMM d, yyyy")} · {stats.daysTotal} days</p>
          </div>
          {manage && (
            <div className="flex flex-wrap gap-2">
              <EditSprintDialog sprint={sprint} />
              {sprint.status === "planned" && <Button variant="primary" disabled={pending} onClick={() => run({ type: "sprint.start", sprintId: sprint.id })}><Play /> Start sprint</Button>}
              {sprint.status === "active" && <Button variant="danger" onClick={() => setClosing(true)}><Square /> Close sprint</Button>}
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 border-t border-line p-3 md:grid-cols-5">
          <Stat label="Tasks" value={`${stats.completedCount}/${stats.taskCount}`} sub="approved / planned" />
          <Stat label="Planned effort" value={`${stats.plannedHours}h`} sub={`${stats.completedHours}h approved`} />
          <Stat label="Capacity" value={capacity ? `${capacity}h` : "—"} sub={sprint.capacityHours ? "set by lead" : vm.memberCapacity ? "from participant availability" : "add participants"} tone={over ? "warn" : undefined} />
          <Stat label="Load" value={capacity ? `${pct(stats.plannedHours, capacity)}%` : "—"} tone={over ? "warn" : "ok"} sub={over ? "over capacity" : "of capacity"} />
          <Stat label="Blockers" value={vm.blockers.length} tone={vm.blockers.length ? "danger" : undefined} />
        </div>
        <p className="px-3 pb-2 text-xs text-faint">Estimates and availability are planning aids, not measures of individual productivity.</p>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Panel>
          <PanelHeader title="Sprint backlog" subtitle={`${inSprint.length} tasks`} />
          <ul className="divide-y divide-line">
            {inSprint.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-[13px]">
                <TrackChip trackId={t.trackId} />
                <TaskLink k={t.key} title={t.title} className="min-w-0 flex-1" />
                <PriorityBadge priority={t.priority} compact />
                <span className="font-mono text-xs text-muted">{t.estimateHours}h</span>
                <div className="w-16"><Progress value={t.progress.pct} className="h-1" /></div>
                <StatusBadge status={t.status} />
                <AssigneeStack assignees={t.assignees} size={16} />
                {manage && sprint.status !== "completed" && <button onClick={() => run({ type: "sprint.setTask", taskId: t.id, sprintId: null })} className="text-faint hover:text-danger" aria-label={`Remove ${t.key} from sprint`}><X className="size-3.5" /></button>}
              </li>
            ))}
            {!inSprint.length && <li className="px-3 py-6 text-center text-[13px] text-muted">No tasks in this sprint.</li>}
          </ul>
          {manage && sprint.status !== "completed" && (
            <form className="flex gap-2 border-t border-line p-2" onSubmit={(e) => { e.preventDefault(); if (adding) void run({ type: "sprint.setTask", taskId: adding, sprintId: sprint.id }, { onSuccess: () => setAdding("") }); }}>
              <Select value={adding} onChange={(e) => setAdding(e.target.value)} className="h-7 flex-1 text-[13px]" aria-label="Task to add">
                <option value="">Add a task from the backlog…</option>
                {candidates.map((t) => <option key={t.id} value={t.id}>{t.key} — {t.title} ({t.estimateHours}h)</option>)}
              </Select>
              <Button type="submit" size="sm" disabled={!adding}><Plus /> Add</Button>
            </form>
          )}
        </Panel>

        <div className="space-y-4">
          <Panel>
            <PanelHeader title="Burndown" subtitle="Remaining estimated hours; drops only when tasks are approved" />
            <div className="h-56 p-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={vm.burndown} margin={{ left: -16, right: 8, top: 8 }}>
                  <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" />
                  <XAxis dataKey="day" tickFormatter={(d: string) => d.slice(5)} tick={{ fill: "var(--muted)", fontSize: 10 }} />
                  <YAxis tick={{ fill: "var(--muted)", fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: "var(--panel-2)", border: "1px solid var(--line-strong)", fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="ideal" stroke="var(--faint)" strokeDasharray="4 4" dot={false} name="Ideal" />
                  <Line type="stepAfter" dataKey="remaining" stroke="var(--info)" strokeWidth={2} dot={false} name="Remaining" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Participants & capacity" icon={<Users />} />
            <ul className="divide-y divide-line">
              {participants.map((m) => {
                const wl = workloads.find((w) => w.id === m.id);
                const sprintHours = Math.round(hoursByMember.get(m.id) ?? 0);
                return (
                  <li key={m.id} className="flex items-center gap-2 px-3 py-1.5 text-[13px]">
                    <Avatar name={m.name} color={m.avatarColor} size={18} />
                    <span className="min-w-0 flex-1 truncate">{m.name}</span>
                    <span className="font-mono text-xs text-muted" title="Sprint task estimate share vs self-reported availability over the sprint">{sprintHours}h / {Math.round(m.availabilityHours * (stats.daysTotal / 7))}h</span>
                    {wl && wl.load > 1.05 && <Badge tone="warn">over-committed</Badge>}
                    {manage && <button onClick={() => run({ type: "sprint.update", sprintId: sprint.id, patch: { memberIds: sprint.memberIds.filter((x) => x !== m.id) } }, { quiet: true })} className="text-faint hover:text-danger" aria-label="Remove participant"><X className="size-3" /></button>}
                  </li>
                );
              })}
              {!participants.length && <li className="px-3 py-3 text-[13px] text-muted">No participants yet.</li>}
            </ul>
            {manage && nonParticipants.length > 0 && (
              <div className="border-t border-line p-2">
                <Select value="" onChange={(e) => e.target.value && run({ type: "sprint.update", sprintId: sprint.id, patch: { memberIds: [...sprint.memberIds, e.target.value] } }, { quiet: true })} className="h-7 text-[13px]" aria-label="Add participant">
                  <option value="">Add participant…</option>
                  {nonParticipants.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.availabilityHours}h/wk)</option>)}
                </Select>
              </div>
            )}
          </Panel>

          {vm.blockers.length > 0 && (
            <Panel className="border-danger/30">
              <PanelHeader title="Blockers" icon={<AlertOctagon />} />
              <ul className="divide-y divide-line">{vm.blockers.map((b) => <li key={b.id} className="px-3 py-1.5 text-[13px]"><TaskLink k={b.key} /> <span className="text-fg-2">{b.description}</span></li>)}</ul>
            </Panel>
          )}

          <Retro sprint={sprint} manage={manage} />
        </div>
      </div>

      <Dialog open={closing} onOpenChange={setClosing} title={`Close ${sprint.name}`} description={`${stats.taskCount - stats.completedCount} incomplete task(s) will roll over to the chosen sprint or return to the backlog.`}>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); const to = new FormData(e.currentTarget).get("to") as string; void run({ type: "sprint.close", sprintId: sprint.id, rolloverToSprintId: to || null }, { onSuccess: () => setClosing(false) }); }}>
          <Field label="Roll incomplete tasks into">
            <Select name="to" defaultValue={all.find((s) => s.sprint.status === "planned")?.sprint.id ?? ""}>
              <option value="">Backlog (no sprint)</option>
              {all.filter((s) => s.sprint.status === "planned").map((s) => <option key={s.sprint.id} value={s.sprint.id}>{s.sprint.name}</option>)}
            </Select>
          </Field>
          <div className="flex justify-end"><Button type="submit" variant="danger"><CheckCheck /> Close sprint</Button></div>
        </form>
      </Dialog>
    </div>
  );
}

function Retro({ sprint, manage }: { sprint: Sprint; manage: boolean }) {
  const { run, pending } = useCommand();
  const r = sprint.retrospective;
  if (!manage && !r) return null;
  return (
    <Panel>
      <PanelHeader title="Retrospective" />
      {manage ? (
        <form className="space-y-2 p-3" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); void run({ type: "sprint.retro", sprintId: sprint.id, wentWell: String(f.get("well")), improve: String(f.get("improve")), actions: String(f.get("actions")) }); }}>
          <Field label="What went well"><Textarea name="well" defaultValue={r?.wentWell} /></Field>
          <Field label="What to improve"><Textarea name="improve" defaultValue={r?.improve} /></Field>
          <Field label="Action items"><Textarea name="actions" defaultValue={r?.actions} /></Field>
          <div className="flex justify-end"><Button type="submit" size="sm" disabled={pending}>Save retrospective</Button></div>
        </form>
      ) : (
        <dl className="space-y-2 p-3 text-[13px]"><dt className="text-muted">Went well</dt><dd>{r?.wentWell}</dd><dt className="text-muted">Improve</dt><dd>{r?.improve}</dd><dt className="text-muted">Actions</dt><dd>{r?.actions}</dd></dl>
      )}
    </Panel>
  );
}

function CreateSprintDialog() {
  const [open, setOpen] = useState(false);
  const { run, pending } = useCommand();
  return (
    <Dialog open={open} onOpenChange={setOpen} title="Create sprint" trigger={<Button variant="primary"><Plus /> New sprint</Button>}>
      <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); void run({ type: "sprint.create", name: String(f.get("name")), goal: String(f.get("goal")), startDate: String(f.get("start")), endDate: String(f.get("end")), capacityHours: Number(f.get("cap") || 0) }, { onSuccess: () => setOpen(false) }); }}>
        <Field label="Name" className="sm:col-span-2"><Input name="name" required placeholder="Sprint 02 — Integration" /></Field>
        <Field label="Start"><Input name="start" type="date" required /></Field>
        <Field label="End"><Input name="end" type="date" required /></Field>
        <Field label="Goal" className="sm:col-span-2"><Textarea name="goal" required /></Field>
        <Field label="Capacity override (hours)" hint="Leave 0 to compute from participants' availability." className="sm:col-span-2"><Input name="cap" type="number" min={0} defaultValue={0} /></Field>
        <div className="flex justify-end sm:col-span-2"><Button type="submit" variant="primary" disabled={pending}>Create</Button></div>
      </form>
    </Dialog>
  );
}

function EditSprintDialog({ sprint }: { sprint: Sprint }) {
  const [open, setOpen] = useState(false);
  const { run, pending } = useCommand();
  return (
    <Dialog open={open} onOpenChange={setOpen} title={`Edit ${sprint.name}`} description="Sprint dates are proposals the lead can change." trigger={<Button>Edit</Button>}>
      <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); void run({ type: "sprint.update", sprintId: sprint.id, patch: { name: String(f.get("name")), goal: String(f.get("goal")), startDate: String(f.get("start")), endDate: String(f.get("end")), capacityHours: Number(f.get("cap") || 0) } }, { onSuccess: () => setOpen(false) }); }}>
        <Field label="Name" className="sm:col-span-2"><Input name="name" defaultValue={sprint.name} required /></Field>
        <Field label="Start"><Input name="start" type="date" defaultValue={sprint.startDate} required /></Field>
        <Field label="End"><Input name="end" type="date" defaultValue={sprint.endDate} required /></Field>
        <Field label="Goal" className="sm:col-span-2"><Textarea name="goal" defaultValue={sprint.goal} /></Field>
        <Field label="Capacity override (hours)" className="sm:col-span-2"><Input name="cap" type="number" min={0} defaultValue={sprint.capacityHours} /></Field>
        <div className="flex justify-end sm:col-span-2"><Button type="submit" variant="primary" disabled={pending}>Save</Button></div>
      </form>
    </Dialog>
  );
}

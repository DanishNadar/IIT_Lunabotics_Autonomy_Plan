"use client";

import { Check, ChevronDown, X } from "lucide-react";
import type { ReactNode } from "react";
import { DIFFICULTIES, PRIORITIES, STATUS_LABEL, TASK_STATUSES, type BoardFilters } from "@/lib/domain/types";
import type { TaskSummary } from "@/lib/domain/views";
import { DIFFICULTY_LABEL, PRIORITY_LABEL } from "@/lib/ui-meta";
import { cn } from "@/lib/utils";
import { Popover } from "../ui/overlay";
import { useWorkspace } from "../workspace";

export function applyFilters(tasks: TaskSummary[], f: BoardFilters) {
  const q = f.q?.trim().toLowerCase();
  return tasks.filter((t) => {
    if (f.backlog === "archived") {
      if (!t.archived) return false;
    } else {
      if (t.archived) return false;
      if (f.backlog && f.backlog !== "all" && t.backlog !== f.backlog) return false;
    }
    if (q && !q.split(/\s+/).every((term) => t.searchText.includes(term))) return false;
    if (f.trackIds?.length && !f.trackIds.includes(t.trackId)) return false;
    if (f.subtrackIds?.length && (!t.subtrackId || !f.subtrackIds.includes(t.subtrackId))) return false;
    if (f.memberIds?.length && !t.assignees.some((a) => f.memberIds!.includes(a.memberId)) && !(f.memberIds.includes("__none") && !t.assignees.length)) return false;
    if (f.priorities?.length && !f.priorities.includes(t.priority)) return false;
    if (f.difficulties?.length && !f.difficulties.includes(t.difficulty)) return false;
    if (f.sprintIds?.length && !f.sprintIds.includes(t.sprintId ?? "__none")) return false;
    if (f.milestoneIds?.length && !f.milestoneIds.includes(t.milestoneId ?? "__none")) return false;
    if (f.statuses?.length && !f.statuses.includes(t.status)) return false;
    return true;
  });
}

function MultiSelect<T extends string>({ label, options, value, onChange }: { label: string; options: { value: T; label: ReactNode }[]; value: T[] | undefined; onChange: (v: T[]) => void }) {
  const sel = value ?? [];
  return (
    <Popover
      align="start"
      className="w-60 p-1"
      trigger={
        <button className={cn("inline-flex h-7 items-center gap-1 rounded-md border px-2 text-xs", sel.length ? "border-info/40 bg-info-soft text-info" : "border-line bg-panel text-fg-2 hover:border-line-strong")}>
          {label}
          {sel.length > 0 && <span className="font-mono text-[10px]">{sel.length}</span>}
          <ChevronDown className="size-3 opacity-60" />
        </button>
      }
    >
      <div className="max-h-72 overflow-y-auto">
        {options.map((o) => {
          const on = sel.includes(o.value);
          return (
            <button key={o.value} onClick={() => onChange(on ? sel.filter((x) => x !== o.value) : [...sel, o.value])} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-fg-2 hover:bg-panel-3" role="menuitemcheckbox" aria-checked={on}>
              <span className={cn("flex size-3.5 items-center justify-center rounded border", on ? "border-info bg-info text-bg" : "border-line-strong")}>{on && <Check className="size-2.5" />}</span>
              <span className="min-w-0 flex-1 truncate">{o.label}</span>
            </button>
          );
        })}
      </div>
      {sel.length > 0 && (
        <button onClick={() => onChange([])} className="mt-1 w-full border-t border-line px-2 py-1.5 text-left text-[11px] text-muted hover:text-fg">
          Clear
        </button>
      )}
    </Popover>
  );
}

export function FilterBar({ filters, onChange }: { filters: BoardFilters; onChange: (f: BoardFilters) => void }) {
  const { tracks, subtracks, members, sprints, milestones } = useWorkspace();
  const set = <K extends keyof BoardFilters>(k: K, v: BoardFilters[K]) => onChange({ ...filters, [k]: v });
  const active = Object.entries(filters).some(([k, v]) => k !== "q" && k !== "backlog" && Array.isArray(v) && v.length) || (filters.backlog && filters.backlog !== "initial");
  const visibleSubtracks = subtracks.filter((s) => !filters.trackIds?.length || filters.trackIds.includes(s.trackId));
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <div className="flex rounded-md border border-line bg-panel p-0.5 text-xs">
        {(["initial", "advanced", "all", "archived"] as const).map((b) => (
          <button key={b} onClick={() => set("backlog", b)} className={cn("rounded px-2 py-0.5", (filters.backlog ?? "initial") === b ? "bg-panel-3 text-fg" : "text-muted hover:text-fg")} title={b === "archived" ? "Out-of-scope tasks owned by other teams, kept for history" : undefined}>
            {b === "initial" ? "Initial" : b === "advanced" ? "Advanced backlog" : b === "all" ? "All active" : "Archived"}
          </button>
        ))}
      </div>
      <MultiSelect label="Discord channel" options={tracks.map((t) => ({ value: t.id, label: <span>{t.emoji} <span className="font-mono">{t.discordChannel}</span> <span className="text-faint">· {t.id}</span></span> }))} value={filters.trackIds} onChange={(v) => set("trackIds", v)} />
      <MultiSelect label="Subtrack" options={visibleSubtracks.map((s) => ({ value: s.id, label: `${tracks.find((t) => t.id === s.trackId)?.emoji ?? ""} ${s.name}` }))} value={filters.subtrackIds} onChange={(v) => set("subtrackIds", v)} />
      <MultiSelect label="Member" options={[{ value: "__none", label: "Unassigned" }, ...members.filter((m) => m.active && m.role !== "viewer").map((m) => ({ value: m.id, label: m.name }))]} value={filters.memberIds} onChange={(v) => set("memberIds", v)} />
      <MultiSelect label="Status" options={TASK_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))} value={filters.statuses} onChange={(v) => set("statuses", v)} />
      <MultiSelect label="Priority" options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABEL[p] }))} value={filters.priorities} onChange={(v) => set("priorities", v)} />
      <MultiSelect label="Difficulty" options={DIFFICULTIES.map((d) => ({ value: d, label: DIFFICULTY_LABEL[d] }))} value={filters.difficulties} onChange={(v) => set("difficulties", v)} />
      <MultiSelect label="Sprint" options={[{ value: "__none", label: "No sprint" }, ...sprints.map((s) => ({ value: s.id, label: s.name }))]} value={filters.sprintIds} onChange={(v) => set("sprintIds", v)} />
      <MultiSelect label="Milestone" options={[{ value: "__none", label: "No milestone" }, ...milestones.map((m) => ({ value: m.id, label: m.name }))]} value={filters.milestoneIds} onChange={(v) => set("milestoneIds", v)} />
      {active && (
        <button onClick={() => onChange({ q: filters.q, backlog: "initial" })} className="inline-flex h-7 items-center gap-1 px-1.5 text-[11px] text-muted hover:text-fg">
          <X className="size-3" /> Reset
        </button>
      )}
    </div>
  );
}

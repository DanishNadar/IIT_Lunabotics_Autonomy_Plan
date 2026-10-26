"use client";

import { addDays, addMonths, differenceInCalendarDays, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, isToday, startOfMonth, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AssigneeStack, PriorityBadge, StatusBadge, TaskLink, TrackChip } from "@/components/tasks/bits";
import { TaskCard } from "@/components/tasks/task-card";
import { Avatar, Button, EmptyState, Progress } from "@/components/ui/primitives";
import { useLookup, useWorkspace } from "@/components/workspace";
import { parseDay } from "@/lib/domain/sprint";
import type { TaskSummary } from "@/lib/domain/views";
import { STATUS_DOT } from "@/lib/ui-meta";
import { cn } from "@/lib/utils";

export function ListView({ tasks }: { tasks: TaskSummary[] }) {
  const sorted = [...tasks].sort((a, b) => a.key.localeCompare(b.key, undefined, { numeric: true }));
  return (
    <div className="p-3">
      <div className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-panel">
        {sorted.map((t) => (
          <div key={t.id} className="flex items-center gap-3 px-3 py-1.5 text-[13px] hover:bg-panel-2">
            <span className={cn("size-2 shrink-0 rounded-full", STATUS_DOT[t.status])} title={t.status} />
            <TrackChip trackId={t.trackId} />
            <TaskLink k={t.key} title={t.title} className="min-w-0 flex-1" />
            <span className="hidden w-20 sm:block">
              <Progress value={t.progress.pct} className="h-1" />
            </span>
            <PriorityBadge priority={t.priority} compact />
            <span className="hidden md:block">
              <StatusBadge status={t.status} />
            </span>
            <span className="w-16 text-right">
              <AssigneeStack assignees={t.assignees} size={16} />
            </span>
          </div>
        ))}
        {tasks.length === 0 && <EmptyState title="No tasks match these filters." />}
      </div>
    </div>
  );
}

/** A task's planning date: explicit due date, else its sprint end, else milestone target. */
function useTaskWindow() {
  const { sprint, milestone } = useLookup();
  const { milestones } = useWorkspace();
  return useMemo(() => {
    const ordered = [...milestones].sort((a, b) => a.targetDate.localeCompare(b.targetDate));
    return (t: TaskSummary): { start: string | null; end: string | null; source: string } => {
      const s = t.sprintId ? sprint.get(t.sprintId) : null;
      const m = t.milestoneId ? milestone.get(t.milestoneId) : null;
      const end = t.dueDate ?? s?.endDate ?? m?.targetDate ?? null;
      const prevMilestone = m ? ordered[ordered.findIndex((x) => x.id === m.id) - 1] : null;
      const start = t.startDate ?? s?.startDate ?? prevMilestone?.targetDate ?? null;
      const source = t.dueDate ? "due date" : s ? "sprint window" : m ? "milestone window" : "unscheduled";
      return { start, end, source };
    };
  }, [sprint, milestone, milestones]);
}

export function CalendarView({ tasks }: { tasks: TaskSummary[] }) {
  const window = useTaskWindow();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const days = eachDayOfInterval({ start: startOfWeek(startOfMonth(month)), end: endOfWeek(endOfMonth(month)) });
  const byDay = useMemo(() => {
    const m = new Map<string, { t: TaskSummary; source: string }[]>();
    for (const t of tasks) {
      const w = window(t);
      if (!w.end) continue;
      const k = w.end.slice(0, 10);
      m.set(k, [...(m.get(k) ?? []), { t, source: w.source }]);
    }
    return m;
  }, [tasks, window]);
  const unscheduled = tasks.filter((t) => !window(t).end).length;
  return (
    <div className="p-3">
      <div className="mb-2 flex items-center gap-2">
        <Button size="icon" variant="ghost" onClick={() => setMonth(addMonths(month, -1))} aria-label="Previous month"><ChevronLeft /></Button>
        <h2 className="w-36 text-center text-[15px] font-semibold">{format(month, "MMMM yyyy")}</h2>
        <Button size="icon" variant="ghost" onClick={() => setMonth(addMonths(month, 1))} aria-label="Next month"><ChevronRight /></Button>
        <Button size="xs" variant="ghost" onClick={() => setMonth(startOfMonth(new Date()))}>Today</Button>
        <span className="ml-auto text-[13px] text-muted">Dates: explicit due date → sprint end → milestone target. {unscheduled} unscheduled.</span>
      </div>
      <div className="grid grid-cols-7 overflow-hidden rounded-lg border border-line bg-line gap-px">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="bg-panel-2 px-2 py-1 text-xs font-semibold text-muted uppercase">{d}</div>
        ))}
        {days.map((d) => {
          const items = byDay.get(format(d, "yyyy-MM-dd")) ?? [];
          return (
            <div key={d.toISOString()} className={cn("min-h-[96px] bg-panel p-1", !isSameMonth(d, month) && "bg-bg opacity-60")}>
              <div className={cn("mb-1 text-right font-mono text-xs", isToday(d) ? "font-bold text-accent" : "text-faint")}>{format(d, "d")}</div>
              <div className="space-y-0.5">
                {items.slice(0, 4).map(({ t, source }) => (
                  <Link key={t.id} href={`/tasks/${t.key}`} title={`${t.key} ${t.title} (${source})`} className={cn("flex items-center gap-1 truncate rounded px-1 py-0.5 text-xs hover:bg-panel-3", source !== "due date" && "opacity-75")}>
                    <span className={cn("size-1.5 shrink-0 rounded-full", STATUS_DOT[t.status])} />
                    <span className="font-mono text-muted">{t.key}</span>
                    <span className="truncate text-fg-2">{t.title}</span>
                  </Link>
                ))}
                {items.length > 4 && <div className="px-1 text-xs text-muted">+{items.length - 4} more</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function TimelineView({ tasks }: { tasks: TaskSummary[] }) {
  const window = useTaskWindow();
  const { track } = useLookup();
  const rows = tasks
    .map((t) => ({ t, w: window(t) }))
    .filter((r) => r.w.end)
    .sort((a, b) => (a.w.end! < b.w.end! ? -1 : 1) || a.t.key.localeCompare(b.t.key));
  if (!rows.length) return <EmptyState title="Nothing scheduled">Tasks appear here once they have a due date, sprint or milestone.</EmptyState>;
  const today = new Date();
  const min = rows.reduce((m, r) => (r.w.start && parseDay(r.w.start) < m ? parseDay(r.w.start) : m), addDays(today, -7));
  const max = rows.reduce((m, r) => (parseDay(r.w.end!) > m ? parseDay(r.w.end!) : m), addDays(today, 30));
  const span = Math.max(1, differenceInCalendarDays(max, min));
  const x = (d: Date) => `${(differenceInCalendarDays(d, min) / span) * 100}%`;
  const months: Date[] = [];
  for (let d = startOfMonth(min); d <= max; d = addMonths(d, 1)) months.push(d);
  return (
    <div className="p-3">
      <div className="overflow-x-auto rounded-lg border border-line bg-panel">
        <div className="min-w-[900px]">
          <div className="relative ml-[280px] h-6 border-b border-line">
            {months.map((m) => (
              <span key={m.toISOString()} className="absolute top-1 border-l border-line pl-1 text-xs text-muted" style={{ left: x(m < min ? min : m) }}>{format(m, "MMM yyyy")}</span>
            ))}
            <span className="absolute top-0 bottom-0 w-px bg-accent" style={{ left: x(today) }} title="Today" />
          </div>
          {rows.map(({ t, w }) => {
            const start = w.start ? parseDay(w.start) : addDays(parseDay(w.end!), -7);
            const color = track.get(t.trackId)?.color;
            return (
              <div key={t.id} className="flex items-center border-b border-line last:border-0 hover:bg-panel-2">
                <div className="flex w-[280px] shrink-0 items-center gap-2 px-2 py-1 text-[13px]">
                  <TaskLink k={t.key} title={t.title} />
                </div>
                <div className="relative h-7 flex-1">
                  <span className="absolute top-0 bottom-0 w-px bg-accent/40" style={{ left: x(today) }} />
                  <Link href={`/tasks/${t.key}`} title={`${t.key}: ${w.start ?? "?"} → ${w.end} (${w.source})`} className={cn("absolute top-1.5 h-4 rounded-sm opacity-80 hover:opacity-100", w.source !== "due date" && "bg-stripes")} style={{ left: x(start), width: `max(6px, calc(${x(parseDay(w.end!))} - ${x(start)}))`, backgroundColor: color }}>
                    <span className="block h-full rounded-sm bg-black/30" style={{ width: `${100 - t.progress.pct}%`, marginLeft: `${t.progress.pct}%` }} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <p className="mt-2 text-[13px] text-muted">Bars show planning windows derived from due dates, sprints or milestones (proposed dates). The darker portion is remaining checklist work.</p>
    </div>
  );
}

export function GroupedView({ tasks, by }: { tasks: TaskSummary[]; by: "assignee" | "track" }) {
  const { members, tracks } = useWorkspace();
  const groups =
    by === "track"
      ? tracks.map((tr) => ({ id: tr.id, header: <span className="flex items-center gap-2"><TrackChip trackId={tr.id} /> {tr.name}</span>, tasks: tasks.filter((t) => t.trackId === tr.id) }))
      : [
          ...members
            .filter((m) => m.active && m.role !== "viewer")
            .map((m) => ({ id: m.id, header: <span className="flex items-center gap-2"><Avatar name={m.name} color={m.avatarColor} size={18} /> {m.name}</span>, tasks: tasks.filter((t) => t.assignees.some((a) => a.memberId === m.id)) })),
          { id: "none", header: <span className="text-muted">Unassigned</span>, tasks: tasks.filter((t) => !t.assignees.length) },
        ];
  return (
    <div className="flex gap-2 overflow-x-auto p-3">
      {groups.filter((g) => g.tasks.length || by === "track").map((g) => (
        <section key={g.id} className="w-[280px] shrink-0 rounded-lg bg-panel/60">
          <header className="flex items-center gap-2 px-2.5 pt-2.5 pb-2 text-[13px] font-semibold">
            {g.header}
            <span className="ml-auto font-mono text-xs text-muted">{g.tasks.length}</span>
          </header>
          <div className="flex flex-col gap-2 px-2 pb-2">
            {g.tasks.map((t) => (
              <TaskCard key={t.id} t={t} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

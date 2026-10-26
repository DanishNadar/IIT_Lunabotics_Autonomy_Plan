import { differenceInCalendarDays, addDays, formatISO } from "date-fns";
import type { Member, Sprint, StatusHistory, Task } from "./types";

/** Date-only strings are calendar days in local time (avoid UTC-midnight shifts). */
export const parseDay = (d: string) => (/^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(`${d}T12:00:00`) : new Date(d));

export interface SprintStats {
  plannedHours: number;
  completedHours: number;
  taskCount: number;
  completedCount: number;
  blockedCount: number;
  capacityHours: number;
  utilization: number;
  daysTotal: number;
  daysElapsed: number;
}

export function sprintWeeks(s: Pick<Sprint, "startDate" | "endDate">) {
  return Math.max(1, (differenceInCalendarDays(parseDay(s.endDate), parseDay(s.startDate)) + 1) / 7);
}

/** Capacity from self-reported weekly availability; an estimate, not a productivity measure. */
export function memberCapacity(sprint: Pick<Sprint, "startDate" | "endDate" | "memberIds">, members: Pick<Member, "id" | "availabilityHours">[]) {
  const weeks = sprintWeeks(sprint);
  return Math.round(
    members.filter((m) => sprint.memberIds.includes(m.id)).reduce((sum, m) => sum + m.availabilityHours * weeks, 0),
  );
}

export function sprintStats(sprint: Sprint, tasks: Task[], now: Date): SprintStats {
  const inSprint = tasks.filter((t) => t.sprintId === sprint.id);
  const planned = inSprint.reduce((s, t) => s + t.estimateHours, 0);
  const done = inSprint.filter((t) => t.status === "completed");
  const daysTotal = differenceInCalendarDays(parseDay(sprint.endDate), parseDay(sprint.startDate)) + 1;
  const elapsed = Math.min(daysTotal, Math.max(0, differenceInCalendarDays(now, parseDay(sprint.startDate)) + 1));
  return {
    plannedHours: planned,
    completedHours: done.reduce((s, t) => s + t.estimateHours, 0),
    taskCount: inSprint.length,
    completedCount: done.length,
    blockedCount: inSprint.filter((t) => t.status === "blocked").length,
    capacityHours: sprint.capacityHours,
    utilization: sprint.capacityHours ? planned / sprint.capacityHours : 0,
    daysTotal,
    daysElapsed: elapsed,
  };
}

/** Remaining estimated hours per day, derived from status history completions. */
export function burndown(sprint: Sprint, tasks: Task[], history: StatusHistory[]) {
  const inSprint = tasks.filter((t) => t.sprintId === sprint.id);
  const total = inSprint.reduce((s, t) => s + t.estimateHours, 0);
  const days = differenceInCalendarDays(parseDay(sprint.endDate), parseDay(sprint.startDate)) + 1;
  const completedOn = new Map<string, string>();
  for (const h of history) {
    if (h.to === "completed" && inSprint.some((t) => t.id === h.taskId)) completedOn.set(h.taskId, h.createdAt);
  }
  const out: { day: string; ideal: number; remaining: number }[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(parseDay(sprint.startDate), i);
    const end = addDays(date, 1);
    const burned = inSprint
      .filter((t) => {
        const c = completedOn.get(t.id);
        return c && new Date(c) < end && t.status === "completed";
      })
      .reduce((s, t) => s + t.estimateHours, 0);
    out.push({
      day: formatISO(date, { representation: "date" }),
      ideal: Math.round(total - (total * i) / Math.max(1, days - 1)),
      remaining: total - burned,
    });
  }
  return out;
}

/** Tasks to carry into the next sprint when closing one. */
export function rolloverCandidates(sprint: Sprint, tasks: Task[]) {
  return tasks.filter((t) => t.sprintId === sprint.id && t.status !== "completed");
}

import { checklistProgress } from "./checklist";
import { isActive } from "./status";
import type { ChecklistItem, Member, Task, TaskAssignment } from "./types";

export interface Workload {
  memberId: string;
  activeTasks: number;
  /** remaining estimated hours, owner share 100%, contributor share 40% */
  remainingHours: number;
  weeklyAvailability: number;
  /** remainingHours / (availability × 2 weeks); >1 means over-committed for a sprint-length window */
  load: number;
}

const SHARE = { owner: 1, contributor: 0.4 } as const;

export function memberWorkload(
  member: Pick<Member, "id" | "availabilityHours">,
  tasks: Task[],
  assignments: TaskAssignment[],
  checklist: ChecklistItem[],
): Workload {
  const mine = assignments.filter((a) => a.memberId === member.id);
  let remaining = 0;
  let active = 0;
  for (const a of mine) {
    const t = tasks.find((x) => x.id === a.taskId);
    if (!t || !isActive(t.status)) continue;
    active++;
    const pct = checklistProgress(checklist.filter((c) => c.taskId === t.id)).pct / 100;
    remaining += t.estimateHours * (1 - pct) * SHARE[a.role];
  }
  const window = member.availabilityHours * 2;
  return {
    memberId: member.id,
    activeTasks: active,
    remainingHours: Math.round(remaining),
    weeklyAvailability: member.availabilityHours,
    load: window > 0 ? remaining / window : remaining > 0 ? Infinity : 0,
  };
}

export function loadLabel(load: number) {
  if (load === 0) return { label: "Available", tone: "muted" as const };
  if (load < 0.7) return { label: "Healthy", tone: "ok" as const };
  if (load <= 1.05) return { label: "Full", tone: "info" as const };
  return { label: "Over-committed", tone: "warn" as const };
}

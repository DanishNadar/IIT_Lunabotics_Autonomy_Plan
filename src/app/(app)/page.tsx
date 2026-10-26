import { differenceInCalendarDays } from "date-fns";
import { checklistProgress } from "@/lib/domain/checklist";
import { recommendations } from "@/lib/domain/recommendations";
import { sprintStats } from "@/lib/domain/sprint";
import { isActive } from "@/lib/domain/status";
import { summarizeTasks } from "@/lib/domain/views";
import { loadContext } from "@/lib/server/data";
import { DIFFICULTIES } from "@/lib/domain/types";
import { OverviewClient } from "./overview-client";
import type { OverviewVisuals } from "./overview-visuals";

export const metadata = { title: "Overview" };

export default async function OverviewPage() {
  const { db, actor } = await loadContext();
  const now = new Date();
  // Archived (externally owned) tasks never count toward autonomy metrics.
  const active = db.tasks.filter((t) => !t.archived);
  const initial = active.filter((t) => t.backlog === "initial");
  const sprint = db.sprints.find((s) => s.status === "active") ?? db.sprints.filter((s) => s.status === "planned").sort((a, b) => a.startDate.localeCompare(b.startDate))[0] ?? null;
  const summaries = summarizeTasks(db, (t) => !t.archived);
  const WIP = ["researching", "designing", "implementing"];

  const trackHealth = db.tracks.map((tr) => {
    const tasks = active.filter((t) => t.trackId === tr.id);
    const init = tasks.filter((t) => t.backlog === "initial");
    const count = (pred: (t: (typeof init)[number]) => boolean) => init.filter(pred).length;
    const members = new Set(db.assignments.filter((a) => tasks.some((t) => t.id === a.taskId)).map((a) => a.memberId));
    const external = db.externalDependencies.filter((d) => d.status !== "delivered" && d.taskIds.some((id) => tasks.some((t) => t.id === id)));
    return {
      id: tr.id,
      name: tr.name,
      emoji: tr.emoji,
      channel: tr.discordChannel,
      color: tr.color,
      total: init.length,
      advanced: tasks.length - init.length,
      available: count((t) => t.status === "available" || t.status === "backlog"),
      assigned: count((t) => t.status === "assigned"),
      wip: count((t) => WIP.includes(t.status)),
      blocked: count((t) => t.status === "blocked"),
      testing: count((t) => t.status === "testing"),
      review: count((t) => t.status === "in_review"),
      completed: count((t) => t.status === "completed"),
      unowned: count((t) => t.status !== "completed" && !db.assignments.some((a) => a.taskId === t.id && a.role === "owner")),
      checklistPct: checklistProgress(db.checklistItems.filter((c) => init.some((t) => t.id === c.taskId))).pct,
      members: members.size,
      externalOpen: external.length,
      externalBlocked: external.filter((d) => d.status === "blocked").length,
    };
  });

  const stats = {
    total: initial.length,
    advanced: active.length - initial.length,
    active: initial.filter((t) => isActive(t.status) && t.status !== "in_review" && t.status !== "blocked").length,
    review: active.filter((t) => t.status === "in_review").length,
    blocked: active.filter((t) => t.status === "blocked").length,
    completed: active.filter((t) => t.status === "completed").length,
    unassignedCritical: initial.filter((t) => t.priority === "critical" && t.status !== "completed" && !db.assignments.some((a) => a.taskId === t.id && a.role === "owner")).length,
    activeMembers: new Set(db.assignments.filter((a) => active.some((t) => t.id === a.taskId && isActive(t.status))).map((a) => a.memberId)).size,
    members: db.members.filter((m) => m.active && m.role !== "viewer").length,
  };

  const upcoming = [
    ...db.milestones.filter((m) => m.targetDate >= now.toISOString().slice(0, 10)).map((m) => ({ kind: "milestone" as const, id: m.id, title: m.name, date: m.targetDate, href: "/roadmap", note: "proposed" })),
    ...active.filter((t) => t.dueDate && t.status !== "completed" && differenceInCalendarDays(new Date(t.dueDate), now) <= 21).map((t) => ({ kind: "task" as const, id: t.id, title: `${t.key} ${t.title}`, date: t.dueDate!, href: `/tasks/${t.key}`, note: t.status })),
    ...(sprint ? [{ kind: "sprint" as const, id: sprint.id, title: `${sprint.name} ${sprint.status === "active" ? "ends" : "starts"}`, date: sprint.status === "active" ? sprint.endDate : sprint.startDate, href: "/sprints", note: sprint.isProposed ? "proposed" : sprint.status }] : []),
  ].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 8);

  const taskKey = new Map(db.tasks.map((t) => [t.id, t.key]));
  const integrationBlockers = db.blockers
    .filter((b) => !b.resolvedAt)
    .map((b) => {
      const t = db.tasks.find((x) => x.id === b.taskId)!;
      const downstream = db.dependencies.filter((d) => d.fromTaskId === t.id).map((d) => taskKey.get(d.toTaskId)!);
      return { id: b.id, key: t.key, title: t.title, description: b.description, downstream, since: b.createdAt };
    })
    .sort((a, b) => b.downstream.length - a.downstream.length);

  const statusGroups: [string, string, (s: string) => boolean][] = [
    ["Available", "var(--info)", (s) => s === "available"],
    ["Backlog", "var(--line-strong)", (s) => s === "backlog"],
    ["Assigned", "color-mix(in srgb, var(--violet) 55%, transparent)", (s) => s === "assigned"],
    ["In progress", "var(--violet)", (s) => WIP.includes(s)],
    ["Blocked", "var(--danger)", (s) => s === "blocked"],
    ["Testing", "var(--warn)", (s) => s === "testing"],
    ["In review", "color-mix(in srgb, var(--info) 60%, var(--ok))", (s) => s === "in_review"],
    ["Done", "var(--ok)", (s) => s === "completed"],
  ];
  const inProgress = active.filter((t) => WIP.includes(t.status) || t.status === "testing" || t.status === "assigned").length;
  const visuals: OverviewVisuals = {
    overallPct: active.length ? Math.round((stats.completed / active.length) * 100) : 0,
    checklistPct: checklistProgress(db.checklistItems.filter((c) => active.some((t) => t.id === c.taskId))).pct,
    inProgress,
    activeTotal: active.length,
    completed: stats.completed,
    totalHours: active.reduce((n, t) => n + t.estimateHours, 0),
    status: statusGroups.map(([name, color, pred]) => ({ name, color, value: active.filter((t) => pred(t.status)).length })),
    hoursByTrack: db.tracks.map((tr) => {
      const row = { track: `${tr.emoji} ${tr.id}`, beginner: 0, intermediate: 0, advanced: 0, expert: 0 };
      for (const t of active.filter((x) => x.trackId === tr.id)) row[t.difficulty] += t.estimateHours;
      return row;
    }),
    categories: trackHealth.map((t) => ({
      id: t.id, name: t.name, emoji: t.emoji, channel: t.channel, color: t.color, total: t.total, completed: t.completed,
      inProgress: t.assigned + t.wip + t.testing + t.review, available: t.available, pct: t.total ? Math.round((t.completed / t.total) * 100) : 0,
    })),
    firstTasks: initial
      .filter((t) => t.status === "available" && (t.difficulty === "beginner" || t.difficulty === "intermediate"))
      .sort((a, b) => DIFFICULTIES.indexOf(a.difficulty) - DIFFICULTIES.indexOf(b.difficulty) || a.estimateHours - b.estimateHours)
      .slice(0, 6)
      .map((t) => ({ key: t.key, title: t.title, emoji: db.tracks.find((tr) => tr.id === t.trackId)?.emoji ?? "", difficulty: t.difficulty, estimateHours: t.estimateHours })),
  };

  return (
    <OverviewClient
      visuals={visuals}
      stats={stats}
      trackHealth={trackHealth}
      sprint={sprint ? { sprint, stats: sprintStats(sprint, db.tasks, now), tasks: summaries.filter((t) => t.sprintId === sprint.id) } : null}
      recommendations={recommendations(db, now)}
      upcoming={upcoming}
      prs={db.githubLinks.filter((g) => g.kind === "pr").sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6).map((g) => ({ ...g, taskKey: taskKey.get(g.taskId) ?? "" }))}
      integrationBlockers={integrationBlockers}
      experiments={db.experiments.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5).map((e) => ({ id: e.id, name: e.name, trackId: e.trackId, status: e.status, isDemo: e.isDemo, updatedAt: e.updatedAt }))}
      claims={db.claims.filter((c) => c.status === "pending").map((c) => ({ ...c, taskKey: taskKey.get(c.taskId) ?? "", taskTitle: db.tasks.find((t) => t.id === c.taskId)?.title ?? "", trackId: db.tasks.find((t) => t.id === c.taskId)!.trackId }))}
      activity={db.auditEvents.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 12)}
      e2e={db.settings[0].e2eDemonstration}
      externalDependencies={db.externalDependencies.map((d) => ({ ...d, taskKeys: d.taskIds.map((id) => db.tasks.find((t) => t.id === id)?.key).filter(Boolean) as string[] }))}
      viewerIsMember={actor.role === "member" || actor.role === "viewer"}
    />
  );
}

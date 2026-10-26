"use client";

import { Ago } from "@/components/ui/time";
import {
  AlertOctagon,
  ArrowRight,
  CalendarRange,
  Check,
  CircleAlert,
  ClipboardCheck,
  FlaskConical,
  GitFork,
  GitPullRequest,
  Hand,
  Library,
  Lightbulb,
  ListTodo,
  Milestone,
  Plus,
  Rocket,
  ShieldQuestion,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { StatusBadge, TaskLink, TrackChip } from "@/components/tasks/bits";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";
import { Avatar, Badge, Button, EmptyState, Panel, PanelHeader, Progress, Stat } from "@/components/ui/primitives";
import { useCommand } from "@/components/use-command";
import { useCan, useLookup, useWorkspace } from "@/components/workspace";
import type { Recommendation } from "@/lib/domain/recommendations";
import type { SprintStats } from "@/lib/domain/sprint";
import type { AppSettings, AuditEvent, ExternalDependency, GithubLink, Sprint, TaskClaim, TrackId } from "@/lib/domain/types";
import { EXTERNAL_DEP_STATUS } from "@/lib/ui-meta";
import type { TaskSummary } from "@/lib/domain/views";
import { cn, day, pct } from "@/lib/utils";

interface Props {
  stats: { total: number; advanced: number; active: number; review: number; blocked: number; completed: number; unassignedCritical: number; activeMembers: number; members: number };
  trackHealth: { id: TrackId; name: string; emoji: string; channel: string; color: string; total: number; advanced: number; available: number; assigned: number; wip: number; blocked: number; testing: number; review: number; completed: number; unowned: number; checklistPct: number; members: number; externalOpen: number; externalBlocked: number }[];
  externalDependencies: (ExternalDependency & { taskKeys: string[] })[];
  sprint: { sprint: Sprint; stats: SprintStats; tasks: TaskSummary[] } | null;
  recommendations: Recommendation[];
  upcoming: { kind: "milestone" | "task" | "sprint"; id: string; title: string; date: string; href: string; note: string }[];
  prs: (GithubLink & { taskKey: string })[];
  integrationBlockers: { id: string; key: string; title: string; description: string; downstream: string[]; since: string }[];
  experiments: { id: string; name: string; trackId: TrackId; status: string; isDemo: boolean; updatedAt: string }[];
  claims: (TaskClaim & { taskKey: string; taskTitle: string; trackId: TrackId })[];
  activity: AuditEvent[];
  e2e: AppSettings["e2eDemonstration"];
  viewerIsMember: boolean;
}

function QuickAction({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 rounded-md border border-line bg-panel-2 px-2.5 py-2 text-xs text-fg-2 hover:border-line-strong hover:text-fg [&_svg]:size-3.5 [&_svg]:text-muted">
      {icon}
      {label}
    </Link>
  );
}

export function OverviewClient(p: Props) {
  const { settings, actor } = useWorkspace();
  const { member } = useLookup();
  const can = useCan();
  const { run } = useCommand();

  return (
    <div className="mx-auto max-w-[1500px] space-y-4 p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium tracking-wider text-muted uppercase">{settings.organization}</p>
          <h1 className="text-xl font-semibold">Autonomy overview</h1>
        </div>
        <Link href="/readiness" className={cn("flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs", p.e2e.demonstrated ? "border-ok/40 bg-ok-soft text-ok" : "border-warn/40 bg-warn-soft text-warn")}>
          <Rocket className="size-3.5" />
          {p.e2e.demonstrated ? `End-to-end autonomous simulation demonstrated $<When iso={p.e2e.recordedAt} />` : "End-to-end autonomous simulation: not yet demonstrated"}
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
        <Stat label="Autonomy tasks" value={p.stats.total} sub={`initial · +${p.stats.advanced} advanced`} icon={<ListTodo />} />
        <Stat label="Active" value={p.stats.active} sub="assigned → testing" tone="info" icon={<ArrowRight />} />
        <Stat label="In review" value={p.stats.review} tone={p.stats.review ? "info" : undefined} icon={<ClipboardCheck />} />
        <Stat label="Blocked" value={p.stats.blocked} tone={p.stats.blocked ? "danger" : undefined} icon={<AlertOctagon />} />
        <Stat label="Completed" value={p.stats.completed} sub="review-approved" tone="ok" icon={<Check />} />
        <Stat label="Unowned critical" value={p.stats.unassignedCritical} tone={p.stats.unassignedCritical ? "warn" : undefined} icon={<CircleAlert />} />
        <Stat label="Active members" value={p.stats.activeMembers} sub={`of ${p.stats.members} on the team`} icon={<Users />} />
        <Stat label="Pending requests" value={p.claims.length} tone={p.claims.length ? "warn" : undefined} icon={<Hand />} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Panel>
            <PanelHeader title="Progress by category" icon={<GitFork />} subtitle="Initial backlog per Discord channel. Archived, externally owned work is excluded; external blockers are listed separately." actions={<Link href="/board?backlog=all" className="text-[11px] text-muted hover:text-fg">All tasks →</Link>} />
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-line text-left text-[10px] tracking-wider text-muted uppercase">
                    <th className="px-3 py-1.5 font-semibold">Category</th>
                    <th className="px-2 py-1.5 text-right font-semibold" title="Available or backlog">Avail.</th>
                    <th className="px-2 py-1.5 text-right font-semibold">Assigned</th>
                    <th className="px-2 py-1.5 text-right font-semibold" title="Researching, designing or implementing">WIP</th>
                    <th className="px-2 py-1.5 text-right font-semibold">Blocked</th>
                    <th className="px-2 py-1.5 text-right font-semibold">Testing</th>
                    <th className="px-2 py-1.5 text-right font-semibold" title="Under review">Review</th>
                    <th className="px-2 py-1.5 text-right font-semibold">Done</th>
                    <th className="w-36 px-3 py-1.5 font-semibold">Status mix</th>
                    <th className="px-2 py-1.5 text-right font-semibold" title="External dependencies not yet delivered">External</th>
                  </tr>
                </thead>
                <tbody>
                  {p.trackHealth.map((t) => {
                    const seg = [["bg-line-strong", t.available, "Available"], ["bg-violet/60", t.assigned, "Assigned"], ["bg-violet", t.wip, "In progress"], ["bg-danger", t.blocked, "Blocked"], ["bg-warn", t.testing, "Testing"], ["bg-info", t.review, "Under review"], ["bg-ok", t.completed, "Completed"]] as const;
                    const n = (v: number, tone?: string) => <span className={cn("font-mono", v ? tone ?? "text-fg" : "text-faint")}>{v || "·"}</span>;
                    return (
                      <tr key={t.id} className="border-b border-line last:border-0 hover:bg-panel-2">
                        <td className="px-3 py-1.5"><Link href={`/tracks/${t.id}`} className="flex items-center gap-2 hover:underline"><span aria-hidden>{t.emoji}</span><span className="truncate text-fg-2">{t.name}</span><span className="font-mono text-[10px] text-faint">{t.total}</span></Link></td>
                        <td className="px-2 py-1.5 text-right">{n(t.available, "text-info")}</td>
                        <td className="px-2 py-1.5 text-right">{n(t.assigned)}</td>
                        <td className="px-2 py-1.5 text-right">{n(t.wip, "text-violet")}</td>
                        <td className="px-2 py-1.5 text-right">{n(t.blocked, "text-danger")}</td>
                        <td className="px-2 py-1.5 text-right">{n(t.testing, "text-warn")}</td>
                        <td className="px-2 py-1.5 text-right">{n(t.review, "text-info")}</td>
                        <td className="px-2 py-1.5 text-right">{n(t.completed, "text-ok")}</td>
                        <td className="px-3 py-1.5">
                          <div className="flex h-2 w-full gap-px overflow-hidden rounded-sm" role="img" aria-label={seg.map(([, v, l]) => `${l} ${v}`).join(", ")}>
                            {seg.filter(([, v]) => v > 0).map(([c, v, l]) => <span key={l} className={c} style={{ flexGrow: v }} title={`${l}: ${v}`} />)}
                          </div>
                        </td>
                        <td className="px-2 py-1.5 text-right">{t.externalOpen ? <span className={cn("font-mono", t.externalBlocked ? "text-danger" : "text-muted")} title="Not counted against this category">{t.externalOpen}</span> : <span className="text-faint">·</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="External team dependencies" subtitle="Tracked separately — they never reduce autonomy completion, but they can block integration" actions={<Link href="/tracks/AG#external" className="text-[11px] text-muted hover:text-fg">Manage →</Link>} />
            <ul className="divide-y divide-line">
              {p.externalDependencies.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center gap-2 px-3 py-1.5 text-xs">
                  <Badge>{d.team}</Badge>
                  <span className="min-w-0 flex-1 truncate text-fg-2">{d.title}</span>
                  <span className="font-mono text-[10px] text-muted">{d.taskKeys.join(" ")}</span>
                  <Badge tone={EXTERNAL_DEP_STATUS[d.status].tone}>{EXTERNAL_DEP_STATUS[d.status].label}</Badge>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel>
            <PanelHeader title="Recommendations" icon={<Lightbulb />} subtitle="Transparent rules over current data — not predictions" />
            {p.recommendations.length === 0 ? (
              <EmptyState title="No rules triggered" />
            ) : (
              <ul className="divide-y divide-line">
                {p.recommendations.slice(0, 10).map((r) => (
                  <li key={r.id}>
                    <Link href={r.href} className="flex items-start gap-2.5 px-3 py-2 hover:bg-panel-2">
                      <span className={cn("mt-1 size-1.5 shrink-0 rounded-full", r.severity === "high" ? "bg-danger" : r.severity === "medium" ? "bg-warn" : "bg-info")} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-fg">{r.message}</p>
                        <p className="text-[10px] text-faint">Rule: {r.rule}</p>
                      </div>
                    </Link>
                  </li>
                ))}
                {p.recommendations.length > 10 && <li className="px-3 py-1.5 text-[11px] text-muted">+{p.recommendations.length - 10} more</li>}
              </ul>
            )}
          </Panel>

          <div className="grid gap-4 md:grid-cols-2">
            <Panel>
              <PanelHeader title="Integration blockers" icon={<AlertOctagon />} subtitle="Open blockers, ranked by downstream dependents" />
              {p.integrationBlockers.length === 0 ? (
                <EmptyState title="No open blockers" />
              ) : (
                <ul className="divide-y divide-line">
                  {p.integrationBlockers.map((b) => (
                    <li key={b.id} className="px-3 py-2 text-xs">
                      <TaskLink k={b.key} title={b.title} />
                      <p className="text-muted">{b.description}</p>
                      <p className="text-[10px] text-faint"><Ago iso={b.since} />{b.downstream.length ? ` · blocks ${b.downstream.join(", ")}` : ""}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            <Panel>
              <PanelHeader title="Recent pull requests" icon={<GitPullRequest />} />
              {p.prs.length === 0 ? (
                <EmptyState title="No linked pull requests yet">Link PRs from a task page. Merging never completes a task on its own.</EmptyState>
              ) : (
                <ul className="divide-y divide-line">
                  {p.prs.map((g) => (
                    <li key={g.id} className="flex items-center gap-2 px-3 py-1.5 text-xs">
                      <TaskLink k={g.taskKey} />
                      <a href={g.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-fg-2 hover:text-info">{g.title}</a>
                      <Badge tone={g.state === "merged" ? "violet" : g.state === "open" ? "ok" : "neutral"}>{g.state}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>

        <div className="space-y-4">
          {p.sprint && (
            <Panel>
              <PanelHeader
                title={p.sprint.sprint.status === "active" ? "Current sprint" : "Next sprint"}
                icon={<CalendarRange />}
                subtitle={`${p.sprint.sprint.name} · ${day(p.sprint.sprint.startDate)} – ${day(p.sprint.sprint.endDate)}${p.sprint.sprint.isProposed ? " · proposed schedule" : ""}`}
                actions={<Link href="/sprints" className="text-[11px] text-muted hover:text-fg">Plan →</Link>}
              />
              <div className="space-y-2 p-3">
                <p className="text-xs text-fg-2">{p.sprint.sprint.goal}</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div><div className="font-mono text-lg font-semibold">{p.sprint.stats.completedCount}/{p.sprint.stats.taskCount}</div><div className="text-[10px] text-muted uppercase">tasks approved</div></div>
                  <div><div className="font-mono text-lg font-semibold">{p.sprint.stats.plannedHours}h</div><div className="text-[10px] text-muted uppercase">planned effort</div></div>
                  <div><div className="font-mono text-lg font-semibold">{p.sprint.sprint.status === "active" ? `${p.sprint.stats.daysElapsed}/${p.sprint.stats.daysTotal}` : p.sprint.stats.daysTotal}</div><div className="text-[10px] text-muted uppercase">{p.sprint.sprint.status === "active" ? "days elapsed" : "days"}</div></div>
                </div>
                <Progress value={pct(p.sprint.stats.completedHours, p.sprint.stats.plannedHours)} tone="ok" label="Sprint completion by estimate" />
                <ul className="divide-y divide-line rounded-md border border-line">
                  {p.sprint.tasks.map((t) => (
                    <li key={t.id} className="flex items-center gap-2 px-2 py-1 text-xs">
                      <TaskLink k={t.key} title={t.title} className="min-w-0 flex-1" />
                      <StatusBadge status={t.status} />
                    </li>
                  ))}
                </ul>
              </div>
            </Panel>
          )}

          <Panel>
            <PanelHeader title="Quick actions" />
            <div className="grid grid-cols-2 gap-1.5 p-3">
              {can("task.create", { task: { id: "", trackId: "AG" } }) && (
                <CreateTaskDialog trigger={<button className="flex items-center gap-2 rounded-md border border-line bg-panel-2 px-2.5 py-2 text-left text-xs text-fg-2 hover:border-line-strong hover:text-fg"><Plus className="size-3.5 text-muted" />Create task</button>} />
              )}
              <QuickAction href="/board?member=__none&status=available" icon={<UserPlus />} label="Assign member" />
              <QuickAction href="/sprints" icon={<CalendarRange />} label="Start sprint" />
              <QuickAction href="/my-work#reviews" icon={<ClipboardCheck />} label="Review submissions" />
              <QuickAction href="/resources?add=1" icon={<Library />} label="Add resource" />
              <QuickAction href="/graph" icon={<GitFork />} label="Dependency graph" />
              <QuickAction href="/roadmap" icon={<Milestone />} label="Create milestone" />
              <QuickAction href="/board?status=blocked&backlog=all" icon={<AlertOctagon />} label="Blocked tasks" />
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Members requesting assignments" icon={<Hand />} />
            {p.claims.length === 0 ? (
              <EmptyState title="No pending requests" />
            ) : (
              <ul className="divide-y divide-line">
                {p.claims.map((c) => {
                  const m = member.get(c.memberId);
                  const canDecide = can("task.decideClaim", { task: { id: c.taskId, trackId: c.trackId } });
                  return (
                    <li key={c.id} className="flex items-center gap-2 px-3 py-1.5 text-xs">
                      {m && <Avatar name={m.name} color={m.avatarColor} size={18} />}
                      <div className="min-w-0 flex-1">
                        <span className="text-fg">{m?.name}</span> <span className="text-muted">{c.kind === "interest" ? "is interested in" : "requests"}</span> <TaskLink k={c.taskKey} />
                      </div>
                      {canDecide && (
                        <>
                          <Button size="icon" variant="ghost" onClick={() => run({ type: "claim.decide", claimId: c.id, approve: true })} aria-label="Approve"><Check className="text-ok" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => run({ type: "claim.decide", claimId: c.id, approve: false })} aria-label="Decline"><X className="text-danger" /></Button>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          <Panel>
            <PanelHeader title="Upcoming" icon={<Milestone />} />
            <ul className="divide-y divide-line">
              {p.upcoming.map((u) => (
                <li key={`${u.kind}-${u.id}`}>
                  <Link href={u.href} className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-panel-2">
                    <span className="w-14 shrink-0 font-mono text-[11px] text-muted">{day(u.date)}</span>
                    <span className="min-w-0 flex-1 truncate text-fg-2">{u.title}</span>
                    <Badge>{u.note}</Badge>
                  </Link>
                </li>
              ))}
              {p.upcoming.length === 0 && <li className="px-3 py-4 text-center text-xs text-muted">Nothing scheduled.</li>}
            </ul>
          </Panel>

          <Panel>
            <PanelHeader title="Recent experiments" icon={<FlaskConical />} actions={<Link href="/experiments" className="text-[11px] text-muted hover:text-fg">All →</Link>} />
            <ul className="divide-y divide-line">
              {p.experiments.map((e) => (
                <li key={e.id}>
                  <Link href={`/experiments/${e.id}`} className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-panel-2">
                    <TrackChip trackId={e.trackId} />
                    <span className="min-w-0 flex-1 truncate text-fg-2">{e.name}</span>
                    {e.isDemo && <Badge tone="warn">demo data</Badge>}
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel>
            <PanelHeader title="Recent activity" icon={<ShieldQuestion />} actions={<Link href="/activity" className="text-[11px] text-muted hover:text-fg">Feed →</Link>} />
            <ul className="divide-y divide-line">
              {p.activity.map((a) => {
                const who = a.actorId ? member.get(a.actorId) : null;
                return (
                  <li key={a.id} className="flex items-start gap-2 px-3 py-1.5 text-xs">
                    {who ? <Avatar name={who.name} color={who.avatarColor} size={16} /> : <span className="size-4 rounded-full bg-panel-3" />}
                    <div className="min-w-0 flex-1">
                      <span className="text-fg">{who?.name ?? "System"}</span> <span className="text-fg-2">{a.href ? <Link href={a.href} className="hover:underline">{a.summary}</Link> : a.summary}</span>
                      <div className="text-[10px] text-faint"><Ago iso={a.createdAt} /></div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Panel>
        </div>
      </div>
      {p.viewerIsMember && actor.role !== "viewer" && (
        <p className="text-center text-[11px] text-faint">Looking for your own work? <Link href="/my-work" className="text-info hover:underline">Open My Work</Link>.</p>
      )}
    </div>
  );
}

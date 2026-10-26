"use client";

import { Ago, When } from "@/components/ui/time";
import {
  Activity,
  AlertOctagon,
  ArrowRight,
  BellRing,
  CalendarRange,
  Check,
  CircleAlert,
  ClipboardCheck,
  FlaskConical,
  GitFork,
  GitPullRequest,
  Hand,
  Handshake,
  LayoutGrid,
  Library,
  ListTodo,
  Milestone,
  Plus,
  Rocket,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { StatusBadge, TaskLink, TrackChip } from "@/components/tasks/bits";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";
import { CountUp, GrowBar, Reveal } from "@/components/ui/motion";
import { Avatar, Badge, Button, Stat } from "@/components/ui/primitives";
import { useCommand } from "@/components/use-command";
import { useCan, useLookup, useWorkspace } from "@/components/workspace";
import type { Recommendation } from "@/lib/domain/recommendations";
import type { SprintStats } from "@/lib/domain/sprint";
import type { AppSettings, AuditEvent, ExternalDependency, GithubLink, Sprint, TaskClaim, TrackId } from "@/lib/domain/types";
import type { TaskSummary } from "@/lib/domain/views";
import { EXTERNAL_DEP_STATUS } from "@/lib/ui-meta";
import { cn, day, pct } from "@/lib/utils";
import { CategoryRings, FirstTasks, OverviewCharts, OverviewHero, StartHere, type OverviewVisuals } from "./overview-visuals";

interface Props {
  visuals: OverviewVisuals;
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

export function OverviewClient(p: Props) {
  const { settings } = useWorkspace();
  return (
    <div className="mx-auto max-w-[1400px] space-y-16 px-4 py-8 sm:px-8">
      <OverviewHero v={p.visuals} organization={settings.organization} />
      <StartHere v={p.visuals} />
      <CategoryRings v={p.visuals} />
      <OverviewCharts v={p.visuals} />
      <FirstTasks v={p.visuals} />
      <TeamDashboard {...p} />
    </div>
  );
}

/* ───────────────────────── Team dashboard (tabbed) ───────────────────────── */

type TabId = "attention" | "schedule" | "progress" | "activity" | "teams";

function TeamDashboard(p: Props) {
  const reduce = useReducedMotion();
  const groups = groupRecommendations(p.recommendations);
  const attentionCount = groups.length + p.integrationBlockers.length + p.claims.length;
  const tabs: { id: TabId; label: string; icon: ReactNode; count?: number }[] = [
    { id: "attention", label: "Needs attention", icon: <BellRing />, count: attentionCount },
    { id: "schedule", label: "Sprint & schedule", icon: <CalendarRange /> },
    { id: "progress", label: "Progress", icon: <LayoutGrid /> },
    { id: "activity", label: "Activity", icon: <Activity /> },
    { id: "teams", label: "Other teams", icon: <Handshake />, count: p.externalDependencies.filter((d) => d.status !== "delivered").length },
  ];
  const [tab, setTab] = useState<TabId>("attention");

  return (
    <section className="space-y-8">
      <Reveal className="flex flex-wrap items-end gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-3xl font-bold">Team dashboard</h2>
          <p className="mt-1 text-[16px] text-muted">One topic at a time. Pick a tab.</p>
        </div>
        <Link href="/readiness" className={cn("flex items-center gap-2 rounded-full border px-4 py-2 text-[14px]", p.e2e.demonstrated ? "border-ok/40 bg-ok-soft text-ok" : "border-warn/40 bg-warn-soft text-warn")}>
          <Rocket className="size-4" />
          {p.e2e.demonstrated ? (
            <>
              End-to-end simulation demonstrated <When iso={p.e2e.recordedAt} />
            </>
          ) : (
            "End-to-end simulation: not yet demonstrated"
          )}
        </Link>
      </Reveal>

      <div role="tablist" aria-label="Team dashboard" className="flex gap-2 overflow-x-auto rounded-xl border border-line bg-panel/70 p-1.5">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn("relative flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-[15px] font-medium transition-colors [&_svg]:size-[18px]", tab === t.id ? "text-fg" : "text-muted hover:text-fg")}
          >
            {tab === t.id && <motion.span layoutId="dash-tab" className="absolute inset-0 rounded-lg bg-panel-3" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
            <span className="relative flex items-center gap-2">
              {t.icon}
              {t.label}
              {!!t.count && <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-white">{t.count}</span>}
            </span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} role="tabpanel" initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
          {tab === "attention" && <AttentionTab p={p} groups={groups} />}
          {tab === "schedule" && <ScheduleTab p={p} />}
          {tab === "progress" && <ProgressTab p={p} />}
          {tab === "activity" && <ActivityTab p={p} />}
          {tab === "teams" && <TeamsTab p={p} />}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}

function Card({ title, icon, action, children, className }: { title: string; icon?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-line bg-panel/90 p-6 shadow-[var(--shadow)]", className)}>
      <div className="mb-5 flex items-center gap-3">
        {icon && <span className="flex size-10 items-center justify-center rounded-lg bg-accent-soft text-accent [&_svg]:size-5">{icon}</span>}
        <h3 className="flex-1 text-[19px] font-semibold">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function AllClear({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-line py-16 text-center">
      <span className="flex size-14 animate-float items-center justify-center rounded-full bg-ok-soft text-ok">
        <Check className="size-7" />
      </span>
      <p className="text-[17px] text-fg-2">{children}</p>
    </div>
  );
}

/** Many recommendations share a rule ("critical task has no owner"); show one card per rule. */
interface RecGroup {
  rule: string;
  severity: Recommendation["severity"];
  items: Recommendation[];
}
function groupRecommendations(recs: Recommendation[]): RecGroup[] {
  const map = new Map<string, RecGroup>();
  for (const r of recs) {
    const g = map.get(r.rule) ?? { rule: r.rule, severity: r.severity, items: [] };
    g.items.push(r);
    map.set(r.rule, g);
  }
  const rank = { high: 0, medium: 1, low: 2 };
  return [...map.values()].sort((a, b) => rank[a.severity] - rank[b.severity] || b.items.length - a.items.length);
}

const SEVERITY = {
  high: { label: "Important", ring: "border-danger/40", dot: "bg-danger", text: "text-danger", soft: "bg-danger-soft" },
  medium: { label: "Worth a look", ring: "border-warn/40", dot: "bg-warn", text: "text-warn", soft: "bg-warn-soft" },
  low: { label: "Opportunity", ring: "border-info/40", dot: "bg-info", text: "text-info", soft: "bg-info-soft" },
};

function AttentionTab({ p, groups }: { p: Props; groups: RecGroup[] }) {
  const { member } = useLookup();
  const can = useCan();
  const { run } = useCommand();
  if (!groups.length && !p.integrationBlockers.length && !p.claims.length) return <AllClear>Nothing needs attention right now.</AllClear>;
  return (
    <div className="space-y-6">
      {groups.length > 0 && (
        <div className="grid gap-5 lg:grid-cols-2">
          {groups.map((g) => {
            const s = SEVERITY[g.severity];
            const single = g.items.length === 1;
            return (
              <div key={g.rule} className={cn("rounded-xl border bg-panel/90 p-6 shadow-[var(--shadow)]", s.ring)}>
                <div className="mb-3 flex items-center gap-2">
                  <span className={cn("size-2.5 rounded-full", s.dot)} />
                  <span className={cn("text-[13px] font-semibold tracking-wide uppercase", s.text)}>{s.label}</span>
                </div>
                <h3 className="text-[20px] font-semibold">
                  {single ? g.items[0].message : `${g.items.length} tasks: ${g.rule.toLowerCase()}`}
                </h3>
                {!single && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {g.items.map((r) => (
                      <Link key={r.id} href={r.href} className={cn("rounded-full px-3 py-1.5 font-mono text-[14px] transition-transform hover:-translate-y-0.5", s.soft, s.text)} title={r.message}>
                        {r.taskKey ?? r.message}
                      </Link>
                    ))}
                  </div>
                )}
                {single && (
                  <Link href={g.items[0].href} className={cn("mt-4 inline-flex items-center gap-1.5 text-[15px] font-medium", s.text)}>
                    Open <ArrowRight className="size-4" />
                  </Link>
                )}
                <p className="mt-4 text-[13px] text-faint">Rule: {g.rule}</p>
              </div>
            );
          })}
        </div>
      )}

      {(p.integrationBlockers.length > 0 || p.claims.length > 0) && (
        <div className="grid gap-5 lg:grid-cols-2">
          {p.integrationBlockers.length > 0 && (
            <Card title="Integration blockers" icon={<AlertOctagon />}>
              <ul className="space-y-3">
                {p.integrationBlockers.map((b) => (
                  <li key={b.id} className="rounded-lg bg-panel-2 p-4">
                    <TaskLink k={b.key} title={b.title} />
                    <p className="mt-1 text-[15px] text-muted">{b.description}</p>
                    <p className="mt-1 text-[13px] text-faint">
                      <Ago iso={b.since} />
                      {b.downstream.length ? ` · blocks ${b.downstream.join(", ")}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {p.claims.length > 0 && (
            <Card title="Members requesting tasks" icon={<Hand />}>
              <ul className="space-y-3">
                {p.claims.map((c) => {
                  const m = member.get(c.memberId);
                  const canDecide = can("task.decideClaim", { task: { id: c.taskId, trackId: c.trackId } });
                  return (
                    <li key={c.id} className="flex items-center gap-3 rounded-lg bg-panel-2 p-4 text-[15px]">
                      {m && <Avatar name={m.name} color={m.avatarColor} size={32} />}
                      <div className="min-w-0 flex-1">
                        <span className="font-medium">{m?.name}</span> <span className="text-muted">{c.kind === "interest" ? "is interested in" : "requests"}</span> <TaskLink k={c.taskKey} />
                      </div>
                      {canDecide && (
                        <>
                          <Button size="icon" variant="ghost" onClick={() => run({ type: "claim.decide", claimId: c.id, approve: true })} aria-label="Approve">
                            <Check className="text-ok" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => run({ type: "claim.decide", claimId: c.id, approve: false })} aria-label="Decline">
                            <X className="text-danger" />
                          </Button>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function ScheduleTab({ p }: { p: Props }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      {p.sprint ? (
        <Card title={p.sprint.sprint.status === "active" ? "Current sprint" : "Next sprint"} icon={<CalendarRange />} action={<Link href="/sprints" className="text-[14px] text-muted hover:text-fg">Plan →</Link>}>
          <p className="text-[17px] font-semibold">{p.sprint.sprint.name}</p>
          <p className="text-[14px] text-muted">
            {day(p.sprint.sprint.startDate)} – {day(p.sprint.sprint.endDate)}
            {p.sprint.sprint.isProposed ? " · proposed schedule" : ""}
          </p>
          <p className="mt-4 text-[16px] leading-relaxed text-fg-2">{p.sprint.sprint.goal}</p>
          <div className="mt-6 grid grid-cols-3 gap-3 text-center">
            {[
              [`${p.sprint.stats.completedCount}/${p.sprint.stats.taskCount}`, "tasks approved"],
              [`${p.sprint.stats.plannedHours}h`, "planned effort"],
              [p.sprint.sprint.status === "active" ? `${p.sprint.stats.daysElapsed}/${p.sprint.stats.daysTotal}` : `${p.sprint.stats.daysTotal}`, p.sprint.sprint.status === "active" ? "days elapsed" : "days long"],
            ].map(([v, l]) => (
              <div key={l} className="rounded-lg bg-panel-2 py-4">
                <div className="text-2xl font-bold">{v}</div>
                <div className="text-[13px] text-muted">{l}</div>
              </div>
            ))}
          </div>
          <GrowBar value={pct(p.sprint.stats.completedHours, p.sprint.stats.plannedHours)} color="var(--ok)" className="mt-6" />
          <ul className="mt-6 space-y-2">
            {p.sprint.tasks.map((t) => (
              <li key={t.id} className="flex items-center gap-3 rounded-lg bg-panel-2 px-4 py-3 text-[15px]">
                <TaskLink k={t.key} title={t.title} className="min-w-0 flex-1" />
                <StatusBadge status={t.status} />
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <AllClear>No sprint is planned yet.</AllClear>
      )}
      <Card title="Coming up" icon={<Milestone />} action={<Link href="/roadmap" className="text-[14px] text-muted hover:text-fg">Roadmap →</Link>}>
        {p.upcoming.length === 0 ? (
          <p className="text-[15px] text-muted">Nothing scheduled.</p>
        ) : (
          <ol className="relative space-y-5 border-l-2 border-line pl-6">
            {p.upcoming.map((u) => (
              <li key={`${u.kind}-${u.id}`} className="relative">
                <span className="absolute top-1.5 -left-[31px] size-3 rounded-full border-2 border-accent bg-panel" />
                <div className="font-mono text-[13px] text-muted">{day(u.date, "EEE, MMM d")}</div>
                <Link href={u.href} className="text-[16px] font-medium hover:underline">
                  {u.title}
                </Link>
                <div className="text-[13px] text-faint">{u.note}</div>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}

function ProgressTab({ p }: { p: Props }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Autonomy tasks" value={<CountUp value={p.stats.total} />} sub={`initial · +${p.stats.advanced} advanced`} icon={<ListTodo />} />
        <Stat label="Active" value={<CountUp value={p.stats.active} />} sub="assigned → testing" tone="info" icon={<ArrowRight />} />
        <Stat label="In review" value={<CountUp value={p.stats.review} />} tone={p.stats.review ? "info" : undefined} icon={<ClipboardCheck />} />
        <Stat label="Completed" value={<CountUp value={p.stats.completed} />} sub="review-approved" tone="ok" icon={<Check />} />
        <Stat label="Blocked" value={<CountUp value={p.stats.blocked} />} tone={p.stats.blocked ? "danger" : undefined} icon={<AlertOctagon />} />
        <Stat label="Unowned critical" value={<CountUp value={p.stats.unassignedCritical} />} tone={p.stats.unassignedCritical ? "warn" : undefined} icon={<CircleAlert />} />
        <Stat label="Active members" value={<CountUp value={p.stats.activeMembers} />} sub={`of ${p.stats.members} on the team`} icon={<Users />} />
        <Stat label="Pending requests" value={<CountUp value={p.claims.length} />} tone={p.claims.length ? "warn" : undefined} icon={<Hand />} />
      </div>
      <Card title="Status mix by category" icon={<GitFork />} action={<Link href="/board?backlog=all" className="text-[14px] text-muted hover:text-fg">All tasks →</Link>}>
        <div className="space-y-5">
          {p.trackHealth.map((t) => {
            const seg = [
              ["var(--line-strong)", t.available, "Available"],
              ["color-mix(in srgb, var(--violet) 55%, transparent)", t.assigned, "Assigned"],
              ["var(--violet)", t.wip, "In progress"],
              ["var(--danger)", t.blocked, "Blocked"],
              ["var(--warn)", t.testing, "Testing"],
              ["var(--info)", t.review, "In review"],
              ["var(--ok)", t.completed, "Done"],
            ] as const;
            return (
              <div key={t.id}>
                <div className="mb-2 flex items-center gap-3 text-[15px]">
                  <span className="text-xl" aria-hidden>
                    {t.emoji}
                  </span>
                  <Link href={`/tracks/${t.id}`} className="font-medium hover:underline">
                    {t.name}
                  </Link>
                  <span className="ml-auto text-[14px] text-muted">
                    {t.completed}/{t.total} done
                    {t.externalOpen > 0 && <span className={t.externalBlocked ? "text-danger" : ""}> · {t.externalOpen} external</span>}
                  </span>
                </div>
                <div className="flex h-3.5 w-full gap-0.5 overflow-hidden rounded-full bg-panel-3" role="img" aria-label={seg.map(([, v, l]) => `${l} ${v}`).join(", ")}>
                  {seg
                    .filter(([, v]) => v > 0)
                    .map(([c, v, l]) => (
                      <motion.span key={l} initial={{ flexGrow: 0 }} whileInView={{ flexGrow: v }} viewport={{ once: true }} transition={{ duration: 0.8 }} style={{ background: c }} title={`${l}: ${v}`} />
                    ))}
                </div>
              </div>
            );
          })}
          <div className="flex flex-wrap gap-x-5 gap-y-2 pt-2 text-[13px] text-muted">
            {[
              ["var(--line-strong)", "Available"],
              ["var(--violet)", "In progress"],
              ["var(--danger)", "Blocked"],
              ["var(--warn)", "Testing"],
              ["var(--info)", "In review"],
              ["var(--ok)", "Done"],
            ].map(([c, l]) => (
              <span key={l} className="flex items-center gap-2">
                <span className="size-2.5 rounded-full" style={{ background: c }} /> {l}
              </span>
            ))}
          </div>
        </div>
      </Card>
      <QuickActions />
    </div>
  );
}

function QuickActions() {
  const can = useCan();
  const { actor } = useWorkspace();
  if (actor.role === "viewer") return null;
  const items: [string, ReactNode, string][] = [
    ["/board?member=__none&status=available", <UserPlus key="a" />, "Assign a member"],
    ["/sprints", <CalendarRange key="b" />, "Start a sprint"],
    ["/my-work#reviews", <ClipboardCheck key="c" />, "Review submissions"],
    ["/resources?add=1", <Library key="d" />, "Add a resource"],
    ["/roadmap", <Milestone key="e" />, "Create a milestone"],
    ["/board?status=blocked&backlog=all", <AlertOctagon key="f" />, "Blocked tasks"],
  ];
  return (
    <Card title="Quick actions" icon={<Plus />}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {can("task.create", { task: { id: "", trackId: "AG" } }) && (
          <CreateTaskDialog
            trigger={
              <button className="lift flex items-center gap-3 rounded-lg border border-line bg-panel-2 px-4 py-3.5 text-left text-[15px]">
                <Plus className="size-5 text-accent" /> Create a task
              </button>
            }
          />
        )}
        {items.map(([href, icon, label]) => (
          <Link key={href} href={href} className="lift flex items-center gap-3 rounded-lg border border-line bg-panel-2 px-4 py-3.5 text-[15px] [&_svg]:size-5 [&_svg]:text-accent">
            {icon}
            {label}
          </Link>
        ))}
      </div>
    </Card>
  );
}

function ActivityTab({ p }: { p: Props }) {
  const { member } = useLookup();
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <Card title="Recent activity" icon={<Activity />} action={<Link href="/activity" className="text-[14px] text-muted hover:text-fg">Full feed →</Link>}>
        <ol className="space-y-4">
          {p.activity.slice(0, 8).map((a) => {
            const who = a.actorId ? member.get(a.actorId) : null;
            return (
              <li key={a.id} className="flex items-start gap-3 text-[15px]">
                {who ? <Avatar name={who.name} color={who.avatarColor} size={32} /> : <span className="size-8 shrink-0 rounded-full bg-panel-3" />}
                <div className="min-w-0 flex-1">
                  <span className="font-medium">{who?.name ?? "System"}</span>{" "}
                  <span className="text-fg-2">
                    {a.href ? (
                      <Link href={a.href} className="hover:underline">
                        {a.summary}
                      </Link>
                    ) : (
                      a.summary
                    )}
                  </span>
                  <div className="text-[13px] text-faint">
                    <Ago iso={a.createdAt} />
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </Card>
      <div className="space-y-6">
        {p.experiments.length > 0 && (
          <Card title="Recent experiments" icon={<FlaskConical />} action={<Link href="/experiments" className="text-[14px] text-muted hover:text-fg">All →</Link>}>
            <ul className="space-y-2">
              {p.experiments.map((e) => (
                <li key={e.id}>
                  <Link href={`/experiments/${e.id}`} className="lift flex items-center gap-3 rounded-lg bg-panel-2 px-4 py-3 text-[15px]">
                    <TrackChip trackId={e.trackId} />
                    <span className="min-w-0 flex-1 truncate">{e.name}</span>
                    {e.isDemo && <Badge tone="warn">demo data</Badge>}
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}
        {p.prs.length > 0 && (
          <Card title="Recent pull requests" icon={<GitPullRequest />}>
            <ul className="space-y-2">
              {p.prs.map((g) => (
                <li key={g.id} className="flex items-center gap-3 rounded-lg bg-panel-2 px-4 py-3 text-[15px]">
                  <TaskLink k={g.taskKey} />
                  <a href={g.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate hover:text-info">
                    {g.title}
                  </a>
                  <Badge tone={g.state === "merged" ? "violet" : g.state === "open" ? "ok" : "neutral"}>{g.state}</Badge>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}

function TeamsTab({ p }: { p: Props }) {
  if (!p.externalDependencies.length) return <AllClear>No dependencies on other teams.</AllClear>;
  return (
    <div className="space-y-5">
      <p className="max-w-3xl text-[16px] leading-relaxed text-muted">
        What we need from Controls, Electrical, Mechanical and hardware. These never count against autonomy progress, but they can hold up integration.{" "}
        <Link href="/tracks/AG#external" className="text-info hover:underline">
          Manage on Autonomy General →
        </Link>
      </p>
      <div className="grid gap-5 md:grid-cols-2">
        {p.externalDependencies.map((d) => (
          <div key={d.id} className="rounded-xl border border-line bg-panel/90 p-6 shadow-[var(--shadow)]">
            <div className="mb-3 flex items-center gap-2">
              <Badge>{d.team}</Badge>
              <Badge tone={EXTERNAL_DEP_STATUS[d.status].tone} className="ml-auto">
                {EXTERNAL_DEP_STATUS[d.status].label}
              </Badge>
            </div>
            <h3 className="text-[18px] font-semibold">{d.title}</h3>
            {d.workaround && <p className="mt-2 text-[15px] text-muted">Until then: {d.workaround}</p>}
            {d.taskKeys.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {d.taskKeys.map((k) => (
                  <Link key={k} href={`/tasks/${k}`} className="rounded-full bg-panel-3 px-3 py-1 font-mono text-[13px] hover:bg-panel-2">
                    {k}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { ArrowRight, BookOpen, Compass, GraduationCap, KanbanSquare, Sparkles } from "lucide-react";
import Link from "next/link";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CountUp, Reveal, Ring, Stagger, StaggerItem } from "@/components/ui/motion";
import { Panel, PanelHeader } from "@/components/ui/primitives";
import type { Difficulty, TrackId } from "@/lib/domain/types";
import { DIFFICULTY_LABEL } from "@/lib/ui-meta";

export interface OverviewVisuals {
  overallPct: number;
  checklistPct: number;
  inProgress: number;
  activeTotal: number;
  completed: number;
  totalHours: number;
  status: { name: string; value: number; color: string }[];
  hoursByTrack: { track: string; beginner: number; intermediate: number; advanced: number; expert: number }[];
  categories: { id: TrackId; name: string; emoji: string; channel: string; color: string; total: number; completed: number; inProgress: number; available: number; pct: number }[];
  firstTasks: { key: string; title: string; emoji: string; difficulty: Difficulty; estimateHours: number }[];
}

const DIFF_COLOR: Record<Difficulty, string> = { beginner: "var(--ok)", intermediate: "var(--info)", advanced: "var(--violet)", expert: "var(--accent)" };

const tooltipStyle = {
  contentStyle: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 12, color: "var(--fg)", fontSize: 14, boxShadow: "var(--shadow)" },
  itemStyle: { color: "var(--fg-2)" },
  labelStyle: { color: "var(--fg)", fontWeight: 600 },
  cursor: { fill: "var(--panel-3)", opacity: 0.5 },
};

export function OverviewHero({ v, organization }: { v: OverviewVisuals; organization: string }) {
  return (
    <Reveal>
      <section className="relative overflow-hidden rounded-xl border border-line bg-panel/80 p-6 shadow-[var(--shadow)] sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-accent/20 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 left-1/3 size-72 rounded-full bg-info/10 blur-3xl" />
        <div className="relative grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="space-y-4">
            <p className="text-[14px] font-medium tracking-wide text-muted">{organization}</p>
            <h1 className="text-3xl leading-tight font-bold sm:text-4xl">
              Teaching a lunar rover to <span className="text-shimmer">drive itself</span>
            </h1>
            <p className="max-w-2xl text-[17px] leading-relaxed text-fg-2">
              This board breaks the autonomy software into guided tasks: what to build, why the rover needs it, the code to study, and step-by-step implementation help. Pick a task, follow the guide, and watch the mission come together.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <Link href="/start" className="group inline-flex h-11 items-center gap-2 rounded-md bg-accent px-5 text-[15px] font-medium text-white transition-all hover:shadow-[0_8px_24px_-8px_var(--accent)] hover:brightness-110">
                <Compass className="size-[18px]" /> New here? Start the tour
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link href="/board" className="inline-flex h-11 items-center gap-2 rounded-md border border-line bg-panel-2 px-5 text-[15px] font-medium text-fg transition-colors hover:border-line-strong">
                <KanbanSquare className="size-[18px]" /> Browse all tasks
              </Link>
              <Link href="/learn" className="inline-flex h-11 items-center gap-2 rounded-md border border-line bg-panel-2 px-5 text-[15px] font-medium text-fg transition-colors hover:border-line-strong">
                <GraduationCap className="size-[18px]" /> Learning paths
              </Link>
            </div>
          </div>
          <div className="flex items-center justify-center gap-6">
            <Ring value={v.overallPct} size={176} stroke={14}>
              <span className="text-4xl font-bold">
                <CountUp value={v.overallPct} suffix="%" />
              </span>
              <span className="text-[13px] text-muted">mission complete</span>
            </Ring>
            <div className="space-y-4">
              <MiniStat label="Tasks done" value={v.completed} of={v.activeTotal} color="var(--ok)" />
              <MiniStat label="In progress" value={v.inProgress} color="var(--violet)" />
              <MiniStat label="Steps checked off" value={v.checklistPct} suffix="%" color="var(--info)" />
            </div>
          </div>
        </div>
      </section>
    </Reveal>
  );
}

function MiniStat({ label, value, of, suffix, color }: { label: string; value: number; of?: number; suffix?: string; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="size-3 rounded-full" style={{ background: color }} />
      <div>
        <div className="text-2xl leading-none font-bold">
          <CountUp value={value} suffix={suffix} />
          {of !== undefined && <span className="text-[15px] font-medium text-muted"> / {of}</span>}
        </div>
        <div className="text-[13px] text-muted">{label}</div>
      </div>
    </div>
  );
}

export function StartHere({ v }: { v: OverviewVisuals }) {
  const steps = [
    { n: 1, icon: <Compass />, title: "Take the 2-minute tour", body: "See how tasks flow from idea to approved, and what each team category does.", href: "/start", cta: "Open the tour" },
    { n: 2, icon: <BookOpen />, title: "Learn the basics", body: "Short learning paths teach ROS 2, localization, perception and more. Start a task after a few modules.", href: "/learn", cta: "Pick a path" },
    { n: 3, icon: <Sparkles />, title: "Follow a guided task", body: "Every task has a step-by-step walkthrough with code to study, snippets and pitfalls.", href: v.firstTasks[0] ? `/tasks/${v.firstTasks[0].key}` : "/board", cta: "Try a starter task" },
  ];
  return (
    <section className="space-y-4">
      <Reveal>
        <h2 className="text-2xl font-semibold">Start here</h2>
        <p className="text-[15px] text-muted">Three steps from zero to contributing.</p>
      </Reveal>
      <Stagger className="grid gap-4 md:grid-cols-3">
        {steps.map((s) => (
          <StaggerItem key={s.n}>
            <Link href={s.href} className="lift group relative flex h-full flex-col gap-3 rounded-lg border border-line bg-panel/90 p-6 shadow-[var(--shadow)]">
              <span className="absolute top-5 right-5 text-5xl leading-none font-black text-panel-3 transition-colors group-hover:text-accent-soft">{s.n}</span>
              <span className="flex size-11 items-center justify-center rounded-md bg-accent-soft text-accent [&_svg]:size-5">{s.icon}</span>
              <h3 className="text-[18px] font-semibold">{s.title}</h3>
              <p className="flex-1 text-[15px] leading-relaxed text-muted">{s.body}</p>
              <span className="inline-flex items-center gap-1.5 text-[15px] font-medium text-accent">
                {s.cta} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}

export function CategoryRings({ v }: { v: OverviewVisuals }) {
  return (
    <section className="space-y-4">
      <Reveal>
        <h2 className="text-2xl font-semibold">The five autonomy categories</h2>
        <p className="text-[15px] text-muted">Each matches a Discord channel. Rings show approved work in the initial backlog.</p>
      </Reveal>
      <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        {v.categories.map((c) => (
          <StaggerItem key={c.id}>
            <Link href={`/tracks/${c.id}`} className="lift group flex h-full flex-col items-center gap-3 rounded-lg border border-line bg-panel/90 p-6 text-center shadow-[var(--shadow)]">
              <Ring value={c.pct} size={112} stroke={10} color={c.color}>
                <span className="text-3xl transition-transform group-hover:scale-110" aria-hidden>
                  {c.emoji}
                </span>
              </Ring>
              <div>
                <h3 className="text-[17px] font-semibold">{c.name}</h3>
                <p className="font-mono text-[13px] text-muted">#{c.channel}</p>
              </div>
              <div className="grid w-full grid-cols-3 gap-2 text-center">
                <Num label="open" value={c.available} />
                <Num label="active" value={c.inProgress} />
                <Num label="done" value={c.completed} />
              </div>
            </Link>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}

function Num({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-panel-2 py-2">
      <div className="text-[18px] font-bold">
        <CountUp value={value} />
      </div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}

export function OverviewCharts({ v }: { v: OverviewVisuals }) {
  const status = v.status.filter((s) => s.value > 0);
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <Reveal>
        <Panel className="h-full">
          <PanelHeader title="Where every task stands" subtitle="All active autonomy tasks by status" icon={<KanbanSquare />} />
          <div className="relative h-[320px] p-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={status} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="85%" paddingAngle={3} stroke="var(--panel)" strokeWidth={2} animationDuration={1200}>
                  {status.map((s) => (
                    <Cell key={s.name} fill={s.color} />
                  ))}
                </Pie>
                <Tooltip {...tooltipStyle} />
                <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 14, color: "var(--fg-2)" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-x-0 top-[38%] text-center">
              <div className="text-3xl font-bold">
                <CountUp value={v.activeTotal} />
              </div>
              <div className="text-[13px] text-muted">tasks</div>
            </div>
          </div>
        </Panel>
      </Reveal>
      <Reveal delay={0.1}>
        <Panel className="h-full">
          <PanelHeader title="Effort by category" subtitle={`Estimated hours, split by difficulty · ${v.totalHours.toLocaleString()} h total`} icon={<GraduationCap />} />
          <div className="h-[320px] p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={v.hoursByTrack} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--line)" />
                <XAxis dataKey="track" tick={{ fill: "var(--fg-2)", fontSize: 14 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--muted)", fontSize: 13 }} axisLine={false} tickLine={false} unit="h" />
                <Tooltip {...tooltipStyle} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 14, color: "var(--fg-2)" }} />
                {(Object.keys(DIFF_COLOR) as Difficulty[]).map((d, i, all) => (
                  <Bar key={d} dataKey={d} name={DIFFICULTY_LABEL[d]} stackId="h" fill={DIFF_COLOR[d]} radius={i === all.length - 1 ? [6, 6, 0, 0] : 0} animationDuration={1000 + i * 150} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </Reveal>
    </div>
  );
}

export function FirstTasks({ v }: { v: OverviewVisuals }) {
  if (!v.firstTasks.length) return null;
  return (
    <section className="space-y-4">
      <Reveal>
        <h2 className="text-2xl font-semibold">Good first tasks</h2>
        <p className="text-[15px] text-muted">Open tasks at a friendly difficulty. Each one opens with a guided walkthrough.</p>
      </Reveal>
      <Stagger className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {v.firstTasks.map((t) => (
          <StaggerItem key={t.key}>
            <Link href={`/tasks/${t.key}`} className="lift group flex items-center gap-4 rounded-lg border border-line bg-panel/90 p-4 shadow-[var(--shadow)]">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-panel-2 text-2xl" aria-hidden>
                {t.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-[13px]">
                  <span className="font-mono text-muted">{t.key}</span>
                  <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: `color-mix(in srgb, ${DIFF_COLOR[t.difficulty]} 15%, transparent)`, color: DIFF_COLOR[t.difficulty] }}>
                    {DIFFICULTY_LABEL[t.difficulty]}
                  </span>
                  <span className="text-muted">~{t.estimateHours} h</span>
                </div>
                <div className="truncate text-[16px] font-medium">{t.title}</div>
              </div>
              <ArrowRight className="size-5 text-faint transition-all group-hover:translate-x-1 group-hover:text-accent" />
            </Link>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}

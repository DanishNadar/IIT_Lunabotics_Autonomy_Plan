"use client";

import { ArrowDown, ArrowLeftRight, BookOpen, ExternalLink, GraduationCap, Handshake, Info, Library, ListTodo, Milestone, Plus, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ArchivedBadge, AssigneeStack, CodeLegend, DifficultyMeter, DiscordBadge, PriorityBadge, StatusBadge, TaskLink } from "@/components/tasks/bits";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";
import { GrowBar, Reveal, Ring, Stagger, StaggerItem } from "@/components/ui/motion";
import { Avatar, Badge, Button, EmptyState } from "@/components/ui/primitives";
import { Card, TabBar, TabPanel, type TabDef } from "@/components/ui/tabs";
import { useCan, useLookup } from "@/components/workspace";
import { RESOURCE_TYPE_LABEL, ROLE_LABEL, STATUS_LABEL, type ExternalDependency, type Milestone as M, type Resource, type Role, type Subtrack, type TaskStatus, type Track, type TrackId } from "@/lib/domain/types";
import type { TaskSummary } from "@/lib/domain/views";
import { cn, day, pct } from "@/lib/utils";
import { ExternalDependencies } from "./external-deps";

type TaskRef = { key: string; trackId: TrackId; title: string; status: TaskStatus };

interface Props {
  track: Track;
  subtracks: Subtrack[];
  tasks: TaskSummary[];
  cross: { id: string; kind: string; from: TaskRef; to: TaskRef; inbound: boolean }[];
  members: { id: string; name: string; color: string; role: Role; lead: boolean; primary: boolean; isDemo: boolean }[];
  milestones: (M & { tasks: number; done: number })[];
  resources: Resource[];
  docs: { slug: string; title: string; category: string }[];
  paths: { slug: string; title: string; summary: string }[];
  externalDependencies: (ExternalDependency & { tasks: { key: string; title: string }[] })[];
}

type TabId = "tasks" | "connections" | "teams" | "people" | "dates" | "learn";

export function TrackClient(p: Props) {
  const can = useCan();
  const init = p.tasks.filter((t) => t.backlog === "initial" && !t.archived);
  const done = init.filter((t) => t.status === "completed").length;
  const available = init.filter((t) => t.status === "available").length;
  const tabs: TabDef<TabId>[] = [
    { id: "tasks", label: "Tasks", icon: <ListTodo /> },
    { id: "connections", label: "How it connects", icon: <ArrowLeftRight /> },
    ...(p.externalDependencies.length ? [{ id: "teams" as const, label: "Other teams", icon: <Handshake />, count: p.externalDependencies.filter((d) => d.status !== "delivered").length }] : []),
    { id: "people", label: "People", icon: <Users /> },
    { id: "dates", label: "Milestones", icon: <Milestone /> },
    { id: "learn", label: "Learn", icon: <GraduationCap /> },
  ];
  const [tab, setTab] = useState<TabId>("tasks");

  return (
    <div className="mx-auto max-w-[1300px] space-y-10 px-4 py-8 sm:px-8">
      <Reveal className="relative overflow-hidden rounded-2xl border border-line bg-panel/80 p-6 sm:p-8" style={{ backgroundImage: `radial-gradient(circle at 90% 0%, ${p.track.color}26, transparent 55%)` }}>
        <div className="flex flex-wrap items-center gap-8">
          <div className="min-w-0 flex-1 space-y-3">
            <Link href="/tracks" className="text-[14px] text-muted hover:text-fg">← All categories</Link>
            <h1 className="flex flex-wrap items-center gap-3 text-4xl font-bold">
              <span aria-hidden className="animate-float">{p.track.emoji}</span>
              {p.track.name}
            </h1>
            <p className="max-w-2xl text-[17px] leading-relaxed text-fg-2">{p.track.mission}</p>
            <div className="flex flex-wrap items-center gap-3 text-[15px]">
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-panel-2 px-3 py-1">
                Task codes start with
                <b className="font-mono" style={{ color: p.track.color }}>{p.track.id}</b>
                <span className="text-muted">e.g. {p.track.id}-01</span>
              </span>
              <DiscordBadge trackId={p.track.id} />
            </div>
            {p.track.coordination && <p className="text-[15px] text-muted">This is the coordination category: it ties the other four together rather than being its own technical subteam.</p>}
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <Ring value={pct(done, init.length)} size={132} color={p.track.color}>
              <div className="text-center">
                <div className="text-3xl font-bold">{pct(done, init.length)}%</div>
                <div className="text-xs text-muted">complete</div>
              </div>
            </Ring>
            <div className="space-y-2 text-[15px]">
              <div><b className="text-2xl">{done}</b> <span className="text-muted">of {init.length} tasks done</span></div>
              <div><b className="text-2xl text-info">{available}</b> <span className="text-muted">ready for someone</span></div>
              {can("task.create", { task: { id: "", trackId: p.track.id } }) && (
                <CreateTaskDialog defaultTrack={p.track.id} trigger={<Button size="sm" variant="primary"><Plus /> New {p.track.shortName} task</Button>} />
              )}
            </div>
          </div>
        </div>
      </Reveal>

      <div className="space-y-6">
        <TabBar tabs={tabs} value={tab} onChange={setTab} label={`${p.track.shortName} sections`} />
        <TabPanel id={tab}>
          {tab === "tasks" && <TasksTab p={p} />}
          {tab === "connections" && <ConnectionsTab p={p} />}
          {tab === "teams" && <ExternalDependencies deps={p.externalDependencies} />}
          {tab === "people" && <PeopleTab p={p} />}
          {tab === "dates" && <DatesTab p={p} />}
          {tab === "learn" && <LearnTab p={p} />}
        </TabPanel>
      </div>
    </div>
  );
}

function TasksTab({ p }: { p: Props }) {
  const [backlog, setBacklog] = useState<"initial" | "advanced" | "archived">("initial");
  const [sub, setSub] = useState<string | null>(null);
  const archivedCount = p.tasks.filter((t) => t.archived).length;
  const shown = p.tasks
    .filter((t) => (backlog === "archived" ? t.archived : !t.archived && t.backlog === backlog) && (!sub || t.subtrackId === sub))
    .sort((a, b) => a.key.localeCompare(b.key, undefined, { numeric: true }));
  const chip = (activeChip: boolean) => cn("rounded-full border px-4 py-2 text-[15px] transition-colors", activeChip ? "border-accent/50 bg-accent-soft text-fg" : "border-line text-fg-2 hover:border-line-strong hover:text-fg");

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-[15px] text-muted">Which list:</span>
          {(["initial", "advanced", ...(archivedCount ? (["archived"] as const) : [])] as const).map((b) => (
            <button key={b} onClick={() => setBacklog(b)} className={chip(backlog === b)}>
              {b === "initial" ? "This season" : b === "advanced" ? "Later improvements" : `Archived (${archivedCount})`}
            </button>
          ))}
        </div>
        {p.subtracks.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[15px] text-muted">{p.track.coordination ? "Area:" : "Topic:"}</span>
            <button onClick={() => setSub(null)} className={chip(!sub)}>All</button>
            {p.subtracks.map((s) => {
              const n = p.tasks.filter((t) => t.subtrackId === s.id).length;
              return (
                <button key={s.id} onClick={() => setSub(sub === s.id ? null : s.id)} className={cn(chip(sub === s.id), !n && "opacity-50")}>
                  {s.name} <span className="ml-1 text-muted">{n}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {shown.length ? (
        <Stagger key={`${backlog}-${sub}`} className="grid gap-4 md:grid-cols-2" gap={0.03}>
          {shown.map((t) => (
            <StaggerItem key={t.id}>
              <Link href={`/tasks/${t.key}`} className="lift group flex h-full flex-col gap-4 rounded-xl border border-line bg-panel/90 p-5 hover:border-line-strong">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-[13px] text-muted">
                      <span aria-hidden className="mr-1 font-sans">{p.track.emoji}</span>
                      {t.key}
                    </div>
                    <div className="mt-1 text-[17px] leading-snug font-semibold text-fg group-hover:text-info">{t.title}</div>
                  </div>
                  {t.archived ? <ArchivedBadge externalTeam={t.externalTeam} /> : <StatusBadge status={t.status} />}
                </div>
                <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-2 text-[14px] text-muted">
                  <span className="flex items-center gap-2"><DifficultyMeter difficulty={t.difficulty} /></span>
                  <PriorityBadge priority={t.priority} />
                  <span className="flex items-center gap-2">
                    {t.assignees.length ? <AssigneeStack assignees={t.assignees} size={22} /> : <span className="text-faint">Nobody assigned yet</span>}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <GrowBar value={t.progress.pct} color={p.track.color} height={8} className="flex-1" />
                  <span className="w-10 text-right font-mono text-[13px] text-muted">{t.progress.pct}%</span>
                </div>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      ) : (
        <EmptyState icon={<ListTodo />} title="No tasks in this list">Try another list or topic above.</EmptyState>
      )}
    </div>
  );
}

function ConnectionsTab({ p }: { p: Props }) {
  const { track } = useLookup();
  // Group by this category's task so each card reads as one sentence.
  const byMine = new Map<string, { mine: TaskRef; needs: TaskRef[]; unlocks: TaskRef[] }>();
  for (const c of p.cross) {
    const mine = c.inbound ? c.to : c.from;
    const other = c.inbound ? c.from : c.to;
    const g = byMine.get(mine.key) ?? { mine, needs: [], unlocks: [] };
    (c.inbound ? g.needs : g.unlocks).push(other);
    byMine.set(mine.key, g);
  }
  const groups = [...byMine.values()].sort((a, b) => a.mine.key.localeCompare(b.mine.key, undefined, { numeric: true }));

  const Other = ({ t }: { t: TaskRef }) => {
    const tr = track.get(t.trackId);
    return (
      <li className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-panel-2 px-4 py-3">
        <TaskLink k={t.key} title={t.title} wrap className="min-w-0 flex-1 text-[15px]" />
        {tr && <span className="text-[13px] text-muted">{tr.name}</span>}
        <Badge tone={t.status === "completed" ? "ok" : t.status === "available" ? "info" : "neutral"}>{STATUS_LABEL[t.status]}</Badge>
      </li>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-xl border border-info/30 bg-info-soft px-5 py-4 text-[15px] text-fg-2">
        <Info className="mt-0.5 size-5 shrink-0 text-info" />
        <p>
          Some {p.track.shortName} tasks need results from other categories before they can be finished, and some produce results other categories use. Each card below is one {p.track.shortName} task.
          <Link href={`/graph?track=${p.track.id}`} className="ml-1 text-info hover:underline">See it as a diagram →</Link>
        </p>
      </div>
      <CodeLegend />
      {groups.length ? (
        <Stagger className="grid gap-5 lg:grid-cols-2">
          {groups.map((g) => (
            <StaggerItem key={g.mine.key}>
              <div className="h-full rounded-xl border border-line bg-panel/90 p-6">
                <TaskLink k={g.mine.key} title={g.mine.title} wrap className="text-[17px] font-semibold" />
                {g.needs.length > 0 && (
                  <div className="mt-5">
                    <h4 className="mb-2 flex items-center gap-2 text-[15px] font-semibold text-warn">
                      <ArrowDown className="size-4" /> Needs these finished first
                    </h4>
                    <ul className="space-y-2">{g.needs.map((t) => <Other key={t.key} t={t} />)}</ul>
                  </div>
                )}
                {g.unlocks.length > 0 && (
                  <div className="mt-5">
                    <h4 className="mb-2 flex items-center gap-2 text-[15px] font-semibold text-ok">
                      <ArrowDown className="size-4 -rotate-90" /> Its results are used by
                    </h4>
                    <ul className="space-y-2">{g.unlocks.map((t) => <Other key={t.key} t={t} />)}</ul>
                  </div>
                )}
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      ) : (
        <EmptyState icon={<ArrowLeftRight />} title="No links to other categories">Everything here can be done within {p.track.shortName}.</EmptyState>
      )}
    </div>
  );
}

function PeopleTab({ p }: { p: Props }) {
  if (!p.members.length) return <EmptyState icon={<Users />} title="Nobody here yet">An admin can add members and assign them tasks from the Admin page.</EmptyState>;
  return (
    <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {p.members.map((m) => (
        <StaggerItem key={m.id}>
          <Link href={`/team/${m.id}`} className="lift flex items-center gap-4 rounded-xl border border-line bg-panel/90 p-5">
            <Avatar name={m.name} color={m.color} size={44} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[17px] font-semibold">{m.name}</div>
              <div className="text-[14px] text-muted">{m.lead ? "Leads this category" : `${ROLE_LABEL[m.role]} · ${m.primary ? "main category" : "helps out here"}`}</div>
            </div>
            {m.lead && <Badge tone="accent">Lead</Badge>}
          </Link>
        </StaggerItem>
      ))}
    </Stagger>
  );
}

function DatesTab({ p }: { p: Props }) {
  if (!p.milestones.length) return <EmptyState icon={<Milestone />} title="No milestones for this category" />;
  return (
    <ol className="relative space-y-6 border-l-2 border-line pl-8">
      {p.milestones.map((m) => (
        <li key={m.id} className="relative">
          <span className="absolute top-1.5 -left-[41px] size-4 rounded-full border-4 border-bg" style={{ background: p.track.color }} />
          <div className="rounded-xl border border-line bg-panel/90 p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-[17px] font-semibold">{m.name}</span>
              <span className="text-[15px] text-muted">Target: {day(m.targetDate)}</span>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <GrowBar value={pct(m.done, m.tasks)} color="var(--ok)" height={8} className="flex-1" />
              <span className="text-[14px] text-muted">{m.done} of {m.tasks} tasks done</span>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

function LearnTab({ p }: { p: Props }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {p.paths.length > 0 && (
        <Card title="Start with the learning path" icon={<GraduationCap />} subtitle="A step-by-step course for this category." className="lg:col-span-2">
          <div className="grid gap-3 md:grid-cols-2">
            {p.paths.map((x) => (
              <Link key={x.slug} href={`/learn/${x.slug}`} className="lift block rounded-lg border border-line bg-panel-2 p-4">
                <div className="text-[16px] font-semibold text-fg">{x.title}</div>
                <div className="mt-1 text-[14px] text-muted">{x.summary}</div>
              </Link>
            ))}
          </div>
        </Card>
      )}
      <Card title="Reading & videos" icon={<Library />} subtitle="Official docs, tutorials and other teams' code." action={<Link href={`/resources?track=${p.track.id}`} className="text-[14px] text-info hover:underline">See all →</Link>}>
        <ul className="space-y-2">
          {p.resources.slice(0, 10).map((r) => (
            <li key={r.id}>
              <a href={r.url} target="_blank" rel="noreferrer" className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-panel-2">
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] text-fg">{r.title}</div>
                  <div className="text-[13px] text-muted">{RESOURCE_TYPE_LABEL[r.type]}</div>
                </div>
                <ExternalLink className="mt-1 size-4 shrink-0 text-faint" />
              </a>
            </li>
          ))}
          {!p.resources.length && <li className="text-[15px] text-muted">No resources yet.</li>}
        </ul>
      </Card>
      <Card title="Team documentation" icon={<BookOpen />} subtitle="How we do things, decisions and conventions.">
        <ul className="space-y-2">
          {p.docs.map((d) => (
            <li key={d.slug}>
              <Link href={`/docs/${d.slug}`} className="block rounded-lg px-3 py-2.5 text-[15px] text-fg-2 hover:bg-panel-2 hover:text-fg">{d.title}</Link>
            </li>
          ))}
          {!p.docs.length && <li className="text-[15px] text-muted">No documents tagged for this category yet.</li>}
        </ul>
      </Card>
    </div>
  );
}

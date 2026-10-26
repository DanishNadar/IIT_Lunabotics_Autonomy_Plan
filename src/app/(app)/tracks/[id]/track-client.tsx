"use client";

import { ArrowLeftRight, BookOpen, ExternalLink, GraduationCap, Layers, Library, Milestone, Plus, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AssigneeStack, DifficultyMeter, PriorityBadge, StatusBadge, TaskLink } from "@/components/tasks/bits";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";
import { Avatar, Badge, Button, Panel, PanelHeader, Progress } from "@/components/ui/primitives";
import { RESOURCE_TYPE_LABEL, STATUS_LABEL, type Milestone as M, type Resource, type Role, type Subtrack, type TaskStatus, type Track, type TrackId } from "@/lib/domain/types";
import type { TaskSummary } from "@/lib/domain/views";
import type { ExternalDependency } from "@/lib/domain/types";
import { ExternalDependencies } from "./external-deps";
import { ArchivedBadge, DiscordBadge } from "@/components/tasks/bits";
import { cn, day, pct } from "@/lib/utils";

interface Props {
  track: Track;
  subtracks: Subtrack[];
  tasks: TaskSummary[];
  cross: { id: string; kind: string; from: { key: string; trackId: TrackId; title: string; status: TaskStatus }; to: { key: string; trackId: TrackId; title: string; status: TaskStatus }; inbound: boolean }[];
  members: { id: string; name: string; color: string; role: Role; lead: boolean; primary: boolean; isDemo: boolean }[];
  milestones: (M & { tasks: number; done: number })[];
  resources: Resource[];
  docs: { slug: string; title: string; category: string }[];
  paths: { slug: string; title: string; summary: string }[];
  externalDependencies: (ExternalDependency & { tasks: { key: string; title: string }[] })[];
}

export function TrackClient(p: Props) {
  const [backlog, setBacklog] = useState<"initial" | "advanced" | "archived">("initial");
  const [sub, setSub] = useState<string | null>(null);
  const shown = p.tasks.filter((t) => (backlog === "archived" ? t.archived : !t.archived && t.backlog === backlog) && (!sub || t.subtrackId === sub)).sort((a, b) => a.key.localeCompare(b.key, undefined, { numeric: true }));
  const init = p.tasks.filter((t) => t.backlog === "initial" && !t.archived);
  const archivedCount = p.tasks.filter((t) => t.archived).length;
  const done = init.filter((t) => t.status === "completed").length;
  return (
    <div className="mx-auto max-w-[1400px] space-y-4 p-4">
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <Link href="/tracks" className="text-[13px] text-muted hover:text-fg">Autonomy team /</Link>
          <h1 className="mt-0.5 flex items-center gap-2 text-xl font-semibold">
            <span aria-hidden>{p.track.emoji}</span>
            {p.track.name}
            <span className="rounded px-1.5 py-0.5 font-mono text-[13px]" style={{ color: p.track.color, background: `${p.track.color}1f` }}>{p.track.id}</span>
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <DiscordBadge trackId={p.track.id} />
            {p.track.coordination && <span className="text-[13px] text-muted">Coordination & integration category — not a separate technical subteam.</span>}
          </div>
          <p className="mt-1 max-w-3xl text-[15px] text-fg-2">{p.track.mission}</p>
        </div>
        <div className="w-64 space-y-1 text-[13px]">
          <div className="flex justify-between text-muted"><span>Approved initial tasks</span><span className="font-mono">{done}/{init.length}</span></div>
          <Progress value={pct(done, init.length)} tone="ok" />
          <div className="flex justify-end pt-1">
            <CreateTaskDialog defaultTrack={p.track.id} trigger={<Button size="sm" variant="primary"><Plus /> New {p.track.emoji} {p.track.id} task</Button>} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <Panel>
            <PanelHeader title={p.track.coordination ? "Areas" : "Subtracks"} icon={<Layers />} subtitle="Click to filter the backlog" />
            <div className="flex flex-wrap gap-1.5 p-3">
              <button onClick={() => setSub(null)} className={cn("rounded border px-2 py-1 text-[13px]", !sub ? "border-info/50 bg-info-soft text-info" : "border-line text-fg-2 hover:border-line-strong")}>All</button>
              {p.subtracks.map((s) => {
                const n = p.tasks.filter((t) => t.subtrackId === s.id).length;
                return (
                  <button key={s.id} onClick={() => setSub(sub === s.id ? null : s.id)} className={cn("rounded border px-2 py-1 text-[13px]", sub === s.id ? "border-info/50 bg-info-soft text-info" : "border-line text-fg-2 hover:border-line-strong", !n && "opacity-60")}>
                    {s.name} <span className="font-mono text-xs text-muted">{n}</span>
                  </button>
                );
              })}
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              title="Backlog"
              actions={
                <div className="flex rounded-md border border-line p-0.5 text-[13px]">
                  {(["initial", "advanced", ...(archivedCount ? (["archived"] as const) : [])] as const).map((b) => (
                    <button key={b} onClick={() => setBacklog(b)} className={cn("rounded px-2 py-0.5", backlog === b ? "bg-panel-3 text-fg" : "text-muted")}>{b === "initial" ? "Initial" : b === "advanced" ? "Advanced" : `Archived (${archivedCount})`}</button>
                  ))}
                </div>
              }
            />
            <ul className="divide-y divide-line">
              {shown.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-[13px]">
                  <TaskLink k={t.key} title={t.title} className="min-w-0 flex-1" />
                  <DifficultyMeter difficulty={t.difficulty} />
                  <PriorityBadge priority={t.priority} />
                  <div className="w-20"><Progress value={t.progress.pct} className="h-1" /></div>
                  {t.archived ? <ArchivedBadge externalTeam={t.externalTeam} /> : <StatusBadge status={t.status} />}
                  <div className="w-14"><AssigneeStack assignees={t.assignees} size={16} /></div>
                </li>
              ))}
              {!shown.length && <li className="px-3 py-6 text-center text-[13px] text-muted">No tasks here.</li>}
            </ul>
          </Panel>

          {p.externalDependencies.length > 0 && <ExternalDependencies deps={p.externalDependencies} />}

          <Panel>
            <PanelHeader title="Cross-category dependencies" icon={<ArrowLeftRight />} subtitle="Where this category depends on, or feeds, the others" actions={<Link href={`/graph?track=${p.track.id}`} className="text-[13px] text-muted hover:text-fg">Graph →</Link>} />
            <div className="grid gap-0 md:grid-cols-2">
              {[true, false].map((inbound) => (
                <div key={String(inbound)} className={cn("p-3", inbound && "md:border-r md:border-line")}>
                  <h3 className="mb-1 text-[13px] font-semibold tracking-wider text-muted uppercase">{inbound ? "Depends on" : "Feeds"}</h3>
                  <ul className="space-y-1 text-[13px]">
                    {p.cross.filter((c) => c.inbound === inbound).map((c) => {
                      const other = inbound ? c.from : c.to;
                      const mine = inbound ? c.to : c.from;
                      return (
                        <li key={c.id} className="flex items-center gap-1.5">
                          <span className="font-mono text-[13px] text-muted">{mine.key}</span>
                          <span className="text-faint">{inbound ? "←" : "→"}</span>
                          <TaskLink k={other.key} title={other.title} className="min-w-0 flex-1" />
                          <Badge tone={other.status === "completed" ? "ok" : "neutral"}>{STATUS_LABEL[other.status]}</Badge>
                        </li>
                      );
                    })}
                    {!p.cross.some((c) => c.inbound === inbound) && <li className="text-faint">None</li>}
                  </ul>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel>
            <PanelHeader title="Members" icon={<Users />} />
            <ul className="divide-y divide-line">
              {p.members.map((m) => (
                <li key={m.id}><Link href={`/team/${m.id}`} className="flex items-center gap-2 px-3 py-1.5 text-[13px] hover:bg-panel-2"><Avatar name={m.name} color={m.color} size={20} /><span className="flex-1 truncate">{m.name}</span>{m.lead && <Badge tone="accent">Track lead</Badge>}<span className="text-xs text-muted">{m.primary ? "primary" : "secondary"}</span></Link></li>
              ))}
              {!p.members.length && <li className="px-3 py-4 text-[13px] text-muted">No members yet.</li>}
            </ul>
          </Panel>
          <Panel>
            <PanelHeader title="Milestones" icon={<Milestone />} />
            <ul className="divide-y divide-line">
              {p.milestones.map((m) => (
                <li key={m.id} className="px-3 py-2 text-[13px]">
                  <div className="flex justify-between"><span className="text-fg">{m.name}</span><span className="font-mono text-muted">{day(m.targetDate)}</span></div>
                  <div className="mt-1 flex items-center gap-2"><Progress value={pct(m.done, m.tasks)} tone="ok" className="h-1" /><span className="font-mono text-xs text-muted">{m.done}/{m.tasks}</span></div>
                </li>
              ))}
            </ul>
          </Panel>
          {p.paths.length > 0 && (
            <Panel>
              <PanelHeader title="Learning path" icon={<GraduationCap />} />
              {p.paths.map((x) => <Link key={x.slug} href={`/learn/${x.slug}`} className="block px-3 py-2 text-[13px] hover:bg-panel-2"><div className="font-medium text-fg">{x.title}</div><div className="text-muted">{x.summary}</div></Link>)}
            </Panel>
          )}
          <Panel>
            <PanelHeader title="Resource collection" icon={<Library />} actions={<Link href={`/resources?track=${p.track.id}`} className="text-[13px] text-muted hover:text-fg">All →</Link>} />
            <ul className="divide-y divide-line">
              {p.resources.slice(0, 12).map((r) => (
                <li key={r.id}><a href={r.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-1.5 text-[13px] hover:bg-panel-2"><span className="min-w-0 flex-1 truncate text-fg-2">{r.title}</span><span className="text-xs text-faint">{RESOURCE_TYPE_LABEL[r.type]}</span><ExternalLink className="size-3 text-faint" /></a></li>
              ))}
            </ul>
          </Panel>
          {p.docs.length > 0 && (
            <Panel>
              <PanelHeader title="Documentation" icon={<BookOpen />} />
              {p.docs.map((d) => <Link key={d.slug} href={`/docs/${d.slug}`} className="block px-3 py-1.5 text-[13px] text-fg-2 hover:bg-panel-2">{d.title}</Link>)}
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

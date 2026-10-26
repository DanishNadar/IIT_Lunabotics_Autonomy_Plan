"use client";

import { Ago } from "@/components/ui/time";
import { AlertOctagon, ArrowRight, AtSign, BookMarked, Check, ClipboardCheck, GraduationCap, Hand, Inbox, ListTodo, MessageSquare, NotebookPen, PlayCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { DifficultyMeter, StatusBadge, TaskLink, TrackChip } from "@/components/tasks/bits";
import { LogSessionDialog } from "@/components/tasks/log-session-dialog";
import { TaskCard } from "@/components/tasks/task-card";
import { Badge, Button, EmptyState, Panel, PanelHeader, Progress } from "@/components/ui/primitives";
import { useCommand } from "@/components/use-command";
import { useLookup, useWorkspace } from "@/components/workspace";
import type { ChecklistItem, ProgressLog, Resource, TaskBlocker, TaskClaim, TaskComment, TrackId } from "@/lib/domain/types";
import type { TaskSummary } from "@/lib/domain/views";
import { loadLabel, type Workload } from "@/lib/domain/workload";
import { cn } from "@/lib/utils";

interface Props {
  tasks: TaskSummary[];
  resume: { task: TaskSummary; step: ChecklistItem | null; steps: ChecklistItem[]; lastLog: ProgressLog | null; resources: Resource[] } | null;
  todos: { id: string; text: string; taskKey: string; taskId: string; mine: boolean }[];
  reviews: TaskSummary[];
  suggestions: TaskSummary[];
  comments: (TaskComment & { taskKey: string; mention: boolean })[];
  blockers: (TaskBlocker & { taskKey: string })[];
  paths: { slug: string; title: string; done: number; total: number; trackId: TrackId | null }[];
  workload: Workload;
  claims: (TaskClaim & { taskKey: string })[];
}

export function MyWorkClient(p: Props) {
  const { actor } = useWorkspace();
  const { member } = useLookup();
  const { run } = useCommand();
  const [logging, setLogging] = useState(false);
  const wl = loadLabel(p.workload.load);
  const active = p.tasks.filter((t) => t.status !== "completed");
  const done = p.tasks.filter((t) => t.status === "completed");

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1">
          <h1 className="text-xl font-semibold">My tasks</h1>
          <p className="text-xs text-muted">
            {active.length} active task(s) · ~{p.workload.remainingHours}h remaining estimated against {p.workload.weeklyAvailability}h/week availability ·{" "}
            <span className={cn(wl.tone === "warn" && "text-warn", wl.tone === "ok" && "text-ok")}>{wl.label}</span>
          </p>
        </div>
        {actor.role === "viewer" && <Badge tone="neutral">Viewer — read-only access</Badge>}
      </div>

      {p.resume ? (
        <Panel className="border-info/30">
          <div className="flex flex-wrap items-start gap-4 p-4">
            <PlayCircle className="mt-0.5 size-6 text-info" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <p className="text-[11px] font-semibold tracking-wider text-info uppercase">Continue working</p>
              <div className="flex flex-wrap items-center gap-2">
                <TaskLink k={p.resume.task.key} title={p.resume.task.title} className="text-sm font-medium" />
                <StatusBadge status={p.resume.task.status} />
              </div>
              {p.resume.step ? (
                <p className="text-[13px] text-fg">
                  Next step: <Link href={`/tasks/${p.resume.task.key}#step-${p.resume.step.id}`} className="font-medium hover:underline">{p.resume.step.text}</Link>
                </p>
              ) : (
                <p className="text-[13px] text-ok">All steps complete — submit deliverables and request review.</p>
              )}
              {p.resume.lastLog && <p className="text-xs text-muted">Last session <Ago iso={p.resume.lastLog.createdAt} />: {p.resume.lastLog.nextSteps ? `planned “${p.resume.lastLog.nextSteps}”` : p.resume.lastLog.workedOn}</p>}
              {p.resume.resources.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {p.resume.resources.map((r) => (
                    <a key={r.id} href={r.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded border border-line bg-panel-2 px-1.5 py-0.5 text-[11px] text-fg-2 hover:text-info">
                      <BookMarked className="size-3" /> {r.title}
                    </a>
                  ))}
                </div>
              )}
              <div className="mt-1"><Progress value={p.resume.task.progress.pct} className="max-w-sm" label="Task progress" /></div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setLogging(true)}><NotebookPen /> Log session</Button>
              <Link href={`/tasks/${p.resume.task.key}${p.resume.step ? `#step-${p.resume.step.id}` : ""}`}><Button variant="primary">Open task <ArrowRight /></Button></Link>
            </div>
          </div>
          {logging && <LogSessionDialog taskId={p.resume.task.id} taskKey={p.resume.task.key} steps={p.resume.steps} defaultStepId={p.resume.step?.id} open onOpenChange={setLogging} />}
        </Panel>
      ) : (
        actor.role !== "viewer" && (
          <Panel>
            <EmptyState icon={<Inbox />} title="You have no active tasks" action={<Link href="/board?status=available"><Button variant="primary">Browse available tasks</Button></Link>}>
              Pick from the suggestions below, or start a learning path. You don&apos;t need to finish a path before contributing.
            </EmptyState>
          </Panel>
        )
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Panel>
            <PanelHeader title="Assigned to me" icon={<ListTodo />} subtitle={`${active.length} active · ${done.length} completed`} />
            {active.length ? (
              <div className="grid gap-2 p-3 md:grid-cols-2">{active.map((t) => <TaskCard key={t.id} t={t} />)}</div>
            ) : (
              <p className="p-4 text-xs text-muted">Nothing assigned.</p>
            )}
            {p.claims.length > 0 && (
              <div className="border-t border-line px-3 py-2 text-xs text-muted">
                <Hand className="mr-1 inline size-3" /> Pending requests: {p.claims.map((c) => <Link key={c.id} href={`/tasks/${c.taskKey}`} className="mr-2 text-fg-2 hover:underline">{c.taskKey} ({c.kind})</Link>)}
              </div>
            )}
          </Panel>

          <Panel id="reviews">
            <PanelHeader title="Reviews requested of me" icon={<ClipboardCheck />} />
            {p.reviews.length ? (
              <ul className="divide-y divide-line">
                {p.reviews.map((t) => (
                  <li key={t.id} className="flex items-center gap-2 px-3 py-2 text-xs">
                    <TrackChip trackId={t.trackId} />
                    <TaskLink k={t.key} title={t.title} className="min-w-0 flex-1" />
                    <span className="text-muted">waiting <Ago iso={t.statusChangedAt} /></span>
                    <Link href={`/tasks/${t.key}#review`}><Button size="xs" variant="primary">Review</Button></Link>
                  </li>
                ))}
              </ul>
            ) : <p className="p-4 text-xs text-muted">No reviews waiting on you.</p>}
          </Panel>

          <Panel>
            <PanelHeader title="Suggested next tasks" icon={<Sparkles />} subtitle="Rule: available, claimable, prerequisites met; ranked by your preferred tracks, experience and priority" />
            {p.suggestions.length ? (
              <ul className="divide-y divide-line">
                {p.suggestions.map((t) => (
                  <li key={t.id} className="flex items-center gap-2 px-3 py-2 text-xs">
                    <TrackChip trackId={t.trackId} />
                    <TaskLink k={t.key} title={t.title} className="min-w-0 flex-1" />
                    <DifficultyMeter difficulty={t.difficulty} label />
                    {actor.role !== "viewer" && <Button size="xs" onClick={() => run({ type: "task.claim", taskId: t.id, kind: "claim", message: "" })}><Hand /> Request</Button>}
                  </li>
                ))}
              </ul>
            ) : <p className="p-4 text-xs text-muted">No suggestions right now.</p>}
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel>
            <PanelHeader title="Current TODOs" icon={<Check />} subtitle="Next open steps on your active tasks" />
            {p.todos.length ? (
              <ul className="divide-y divide-line">
                {p.todos.map((t) => (
                  <li key={t.id} className="flex items-start gap-2 px-3 py-1.5 text-xs">
                    <button onClick={() => run({ type: "checklist.toggle", itemId: t.id, done: true }, { quiet: true })} className="mt-0.5 size-3.5 shrink-0 rounded border border-line-strong hover:border-ok" aria-label={`Complete: ${t.text}`} />
                    <Link href={`/tasks/${t.taskKey}#step-${t.id}`} className="min-w-0 flex-1 text-fg-2 hover:text-fg">{t.text}</Link>
                    <span className="font-mono text-[10px] text-muted">{t.taskKey}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="p-4 text-xs text-muted">No open steps.</p>}
          </Panel>

          {p.blockers.length > 0 && (
            <Panel className="border-danger/30">
              <PanelHeader title="Relevant blockers" icon={<AlertOctagon />} />
              <ul className="divide-y divide-line">
                {p.blockers.map((b) => (
                  <li key={b.id} className="px-3 py-2 text-xs">
                    <TaskLink k={b.taskKey} /> <span className="text-fg-2">{b.description}</span>
                    <div className="text-[10px] text-faint"><Ago iso={b.createdAt} /></div>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <Panel>
            <PanelHeader title="Recent comments & mentions" icon={<MessageSquare />} />
            {p.comments.length ? (
              <ul className="divide-y divide-line">
                {p.comments.map((c) => (
                  <li key={c.id}>
                    <Link href={`/tasks/${c.taskKey}#comment-${c.id}`} className="block px-3 py-2 text-xs hover:bg-panel-2">
                      <div className="flex items-center gap-1.5">
                        {c.mention && <AtSign className="size-3 text-info" />}
                        <span className="text-fg">{member.get(c.authorId)?.name}</span>
                        <span className="text-muted">on {c.taskKey} · <Ago iso={c.createdAt} /></span>
                      </div>
                      <p className="line-clamp-2 text-fg-2">{c.body}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : <p className="p-4 text-xs text-muted">No recent comments.</p>}
          </Panel>

          <Panel>
            <PanelHeader title="Learning" icon={<GraduationCap />} actions={<Link href="/learn" className="text-[11px] text-muted hover:text-fg">All paths →</Link>} />
            <ul className="divide-y divide-line">
              {p.paths.map((x) => (
                <li key={x.slug}>
                  <Link href={`/learn/${x.slug}`} className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-panel-2">
                    <span className="min-w-0 flex-1 truncate text-fg-2">{x.title}</span>
                    <div className="w-24"><Progress value={(x.done / Math.max(1, x.total)) * 100} tone="ok" className="h-1" /></div>
                    <span className="w-8 text-right font-mono text-[10px] text-muted">{x.done}/{x.total}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}

"use client";

import { AlertOctagon, Archive, ChevronDown, Clock, Copy, Hand, HandHeart, MessageSquareShare, MoreHorizontal, Pencil, Send, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BlockerDialog } from "@/components/tasks/blocker-dialog";
import { ArchivedBadge, DifficultyMeter, DiscordBadge, PriorityBadge, StatusBadge } from "@/components/tasks/bits";
import { Dialog, Menu, MenuItem, MenuLabel, MenuSeparator } from "@/components/ui/overlay";
import { Badge, Button, Field, Progress, Select, Textarea } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { useCommand } from "@/components/use-command";
import { useCan, useLookup, useWorkspace } from "@/components/workspace";
import { discordSummary } from "@/lib/domain/discord";
import { EXTERNAL_TEAMS, STATUS_LABEL, type ExternalTeam, type TaskStatus } from "@/lib/domain/types";
import { EditTaskDialog } from "./edit-dialogs";
import type { TaskDetailData } from "./task-detail";

const MOVABLE: TaskStatus[] = ["backlog", "available", "assigned", "researching", "designing", "implementing", "testing"];

export function TaskHeader({ data }: { data: TaskDetailData }) {
  const { task, summary, assignments } = data;
  const { actor } = useWorkspace();
  const { subtrack, sprint, milestone, track } = useLookup();
  const can = useCan();
  const { run, pending } = useCommand();
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [discordOpen, setDiscordOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const ctx = { task, assignments };
  const canMove = can("task.move", ctx);
  const isAssignee = assignments.some((a) => a.memberId === actor.id);
  const myClaim = data.claims.find((c) => c.memberId === actor.id && c.status === "pending");
  const ownerless = !assignments.some((a) => a.role === "owner");
  const canClaim = can("task.claim", ctx) && !isAssignee && !myClaim;

  return (
    <section aria-label="Task summary" className="border-b border-line bg-panel/40">
      <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-8">
        <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
          <Link href="/board" className="hover:text-fg">All Tasks</Link>
          <span>/</span>
          <Link href={`/tracks/${task.trackId}`} className="hover:text-fg">{track.get(task.trackId)?.emoji} {track.get(task.trackId)?.name}</Link>
          {task.subtrackId && (
            <>
              <span>/</span>
              <span>{subtrack.get(task.subtrackId)?.name}</span>
            </>
          )}
          {task.backlog === "advanced" && !task.archived && <Badge tone="violet">Advanced backlog</Badge>}
          {task.legacyKeys.length > 0 && <Badge title="Old links redirect here">formerly {task.legacyKeys.join(", ")}</Badge>}
        </div>
        <div className="mt-3 flex flex-wrap items-start gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="flex flex-wrap items-baseline gap-3 text-3xl leading-tight font-bold text-fg">
              <span className="font-mono text-xl text-muted">{task.key}</span>
              {task.title}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <DiscordBadge trackId={task.trackId} />
              {task.archived ? <ArchivedBadge externalTeam={task.externalTeam} /> : <StatusBadge status={task.status} />}
              <PriorityBadge priority={task.priority} />
              <DifficultyMeter difficulty={task.difficulty} label />
              <span className="inline-flex items-center gap-1 text-[13px] text-muted"><Clock className="size-3" />{task.estimateHours}h est.</span>
              {task.sprintId && <Badge>{sprint.get(task.sprintId)?.name.split("—")[0].trim()}</Badge>}
              {task.milestoneId && <Badge tone="neutral">{milestone.get(task.milestoneId)?.name.split("·")[0].trim()}</Badge>}
              {summary.missingDeps.length > 0 && <Badge tone="warn">Waiting on {summary.missingDeps.join(", ")}</Badge>}
              {summary.openBlockers > 0 && <Badge tone="danger"><AlertOctagon /> {summary.openBlockers} blocker(s)</Badge>}
            </div>
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <div className="flex w-40 items-center gap-2">
              <Progress value={summary.progress.pct} tone={summary.progress.pct === 100 ? "ok" : "info"} label="Completion" />
              <span className="font-mono text-[13px] text-muted">{summary.progress.pct}%</span>
            </div>
            <Button onClick={() => setDiscordOpen(true)} title="Copy a summary formatted for Discord">
              <MessageSquareShare /> <span className="hidden md:inline">Copy for Discord</span>
            </Button>
            {canClaim && !task.archived && (task.status === "available" || task.status === "backlog") && (
              <Menu
                trigger={
                  <Button variant={ownerless && task.claimable && task.status === "available" ? "primary" : "secondary"} disabled={pending}>
                    <Hand /> {data.claimMode === "open" && ownerless && task.claimable && task.status === "available" ? "Claim" : "Request / interest"} <ChevronDown />
                  </Button>
                }
              >
                <MenuLabel>Claim policy: {data.claimMode}</MenuLabel>
                {task.claimable && task.status === "available" && data.claimMode !== "disabled" && (
                  <MenuItem onSelect={() => run({ type: "task.claim", taskId: task.id, kind: "claim", message: "" })}>
                    <Hand /> {data.claimMode === "open" && ownerless ? "Claim as primary owner" : "Request assignment"}
                  </MenuItem>
                )}
                <MenuItem onSelect={() => run({ type: "task.claim", taskId: task.id, kind: "interest", message: "" })}>
                  <HandHeart /> Express interest
                </MenuItem>
              </Menu>
            )}
            {myClaim && (
              <Button variant="ghost" onClick={() => run({ type: "claim.withdraw", claimId: myClaim.id })}>
                Withdraw {myClaim.kind}
              </Button>
            )}
            {canMove && !task.archived && task.status !== "completed" && task.status !== "in_review" && (
              <Menu
                trigger={
                  <Button disabled={pending}>
                    Move <ChevronDown />
                  </Button>
                }
              >
                <MenuLabel>Move to</MenuLabel>
                {MOVABLE.filter((s) => s !== task.status).map((s) => (
                  <MenuItem key={s} onSelect={() => run({ type: "task.move", taskId: task.id, status: s })}>
                    {STATUS_LABEL[s]}
                  </MenuItem>
                ))}
                <MenuSeparator />
                <a href="#review">
                  <MenuItem><Send /> Request review…</MenuItem>
                </a>
              </Menu>
            )}
            {canMove && task.status === "completed" && can("task.edit", ctx) && (
              <Button onClick={() => run({ type: "task.move", taskId: task.id, status: "implementing", note: "Reopened" })}>Reopen</Button>
            )}
            <Menu trigger={<Button size="icon" variant="ghost" aria-label="More actions"><MoreHorizontal /></Button>}>
              {can("task.edit", ctx) && (
                <MenuItem onSelect={() => setEditOpen(true)}>
                  <Pencil /> Edit task…
                </MenuItem>
              )}
              {can("task.blocker", ctx) && task.status !== "completed" && task.status !== "backlog" && (
                <MenuItem onSelect={() => setBlockOpen(true)}>
                  <AlertOctagon /> Raise blocker…
                </MenuItem>
              )}
              <MenuItem onSelect={() => void navigator.clipboard?.writeText(`feature/${task.key}-${task.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40)}`)}>
                Copy branch name
              </MenuItem>
              {can("task.delete", ctx) && !task.archived && (
                <MenuItem onSelect={() => setArchiveOpen(true)}>
                  <Archive /> Archive as out of autonomy scope…
                </MenuItem>
              )}
              {can("task.delete", ctx) && (
                <>
                  <MenuSeparator />
                  <MenuItem
                    danger
                    onSelect={() => {
                      if (confirm(`Delete ${task.key}? This removes its checklist, comments and history.`)) void run({ type: "task.delete", taskId: task.id }, { onSuccess: () => router.push("/board") });
                    }}
                  >
                    <Trash2 /> Delete task
                  </MenuItem>
                </>
              )}
            </Menu>
          </div>
        </div>
      </div>
      {editOpen && <EditTaskDialog task={task} open onOpenChange={setEditOpen} />}
      {blockOpen && <BlockerDialog taskId={task.id} taskKey={task.key} open onOpenChange={setBlockOpen} />}
      {discordOpen && <DiscordDialog data={data} onClose={() => setDiscordOpen(false)} />}
      {archiveOpen && <ArchiveDialog taskId={task.id} taskKey={task.key} onClose={() => setArchiveOpen(false)} />}
    </section>
  );
}

function DiscordDialog({ data, onClose }: { data: TaskDetailData; onClose: () => void }) {
  const { track } = useLookup();
  const toast = useToast();
  const t = track.get(data.task.trackId)!;
  const text = discordSummary(data.task, t, data.deliverables, data.acceptance, `${window.location.origin}/tasks/${data.task.key}`);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={`Share ${data.task.key} on Discord`} description={`Paste into ${t.emoji} ${t.discordChannel}. Nothing is posted automatically.`} wide>
      <Textarea readOnly value={text} className="min-h-[320px] font-mono text-[13px]" aria-label="Discord summary" onFocus={(e) => e.currentTarget.select()} />
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-[13px] text-muted">{text.length}/2000 characters</span>
        <Button
          variant="primary"
          onClick={() => {
            void navigator.clipboard?.writeText(text).then(
              () => toast("ok", "Copied — paste it into Discord"),
              () => toast("error", "Clipboard unavailable — select the text and copy it manually"),
            );
          }}
        >
          <Copy /> Copy to clipboard
        </Button>
      </div>
    </Dialog>
  );
}

function ArchiveDialog({ taskId, taskKey, onClose }: { taskId: string; taskKey: string; onClose: () => void }) {
  const { run, pending } = useCommand();
  const [team, setTeam] = useState<ExternalTeam | "">("Controls");
  const [reason, setReason] = useState("");
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={`Archive ${taskKey}`} description="Use this when the work belongs to another team. The task keeps its history and links, leaves boards and metrics, and can be restored.">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void run({ type: "task.archive", taskId, archived: true, externalTeam: team || null, reason }, { onSuccess: onClose });
        }}
      >
        <Field label="Owning team">
          <Select value={team} onChange={(e) => setTeam(e.target.value as ExternalTeam | "")}>
            {EXTERNAL_TEAMS.map((t) => <option key={t} value={t}>{t}</option>)}
            <option value="">None (no longer needed)</option>
          </Select>
        </Field>
        <Field label="Why is this outside autonomy scope?">
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} required minLength={5} placeholder="e.g. Motor PID tuning is Controls-owned; autonomy only consumes the velocity interface (AG-07)." />
        </Field>
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={pending}><Archive /> Archive</Button>
        </div>
      </form>
    </Dialog>
  );
}

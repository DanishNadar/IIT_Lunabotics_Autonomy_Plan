"use client";

import { AlertOctagon, CheckCircle2, CircleDashed, FlaskConical, GitMerge, GitPullRequest, GitPullRequestClosed, Link2 } from "lucide-react";
import Link from "next/link";
import type { Difficulty, Priority, TaskStatus, TrackId } from "@/lib/domain/types";
import { STATUS_LABEL } from "@/lib/domain/types";
import type { TaskSummary } from "@/lib/domain/views";
import { DIFFICULTY_BARS, DIFFICULTY_LABEL, PRIORITY_LABEL, PRIORITY_TONE, STATUS_DOT, STATUS_TONE } from "@/lib/ui-meta";
import { cn } from "@/lib/utils";
import { Tip } from "../ui/overlay";
import { Avatar, Badge } from "../ui/primitives";
import { useLookup } from "../workspace";

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <Badge tone={STATUS_TONE[status]}>
      <span className={cn("size-1.5 rounded-full", STATUS_DOT[status])} />
      {STATUS_LABEL[status]}
    </Badge>
  );
}

export function PriorityBadge({ priority, compact }: { priority: Priority; compact?: boolean }) {
  if (compact) {
    const bars = { critical: 4, high: 3, medium: 2, low: 1 }[priority];
    return (
      <Tip content={`Priority: ${PRIORITY_LABEL[priority]}`}>
        <span className="inline-flex h-3 items-end gap-[2px]" aria-label={`Priority ${priority}`}>
          {[1, 2, 3, 4].map((i) => (
            <span key={i} className={cn("w-[3px] rounded-sm", i <= bars ? (priority === "critical" ? "bg-danger" : priority === "high" ? "bg-warn" : "bg-fg-2") : "bg-line-strong")} style={{ height: `${3 + i * 2}px` }} />
          ))}
        </span>
      </Tip>
    );
  }
  return <Badge tone={PRIORITY_TONE[priority]}>{PRIORITY_LABEL[priority]}</Badge>;
}

export function DifficultyMeter({ difficulty, label }: { difficulty: Difficulty; label?: boolean }) {
  const n = DIFFICULTY_BARS[difficulty];
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-muted" title={`Difficulty: ${DIFFICULTY_LABEL[difficulty]}`}>
      <span className="inline-flex gap-[2px]">
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={cn("size-1.5 rounded-full", i <= n ? "bg-info" : "bg-line-strong")} />
        ))}
      </span>
      {label && DIFFICULTY_LABEL[difficulty]}
    </span>
  );
}

export function TrackChip({ trackId, withName }: { trackId: TrackId; withName?: boolean }) {
  const { track } = useLookup();
  const t = track.get(trackId);
  return (
    <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold" style={{ color: t?.color }} title={t ? `${t.emoji} ${t.discordChannel}` : undefined}>
      <span className="text-[13px] leading-none" aria-hidden>{t?.emoji}</span>
      {trackId}
      {withName && t && <span className="font-sans text-[13px] font-normal text-muted">{t.name}</span>}
    </span>
  );
}

/** The Discord channel a task or category belongs to, e.g. "🕸️ sensor-fusion". */
export function DiscordBadge({ trackId, className }: { trackId: TrackId; className?: string }) {
  const { track } = useLookup();
  const t = track.get(trackId);
  if (!t) return null;
  return (
    <span className={cn("inline-flex h-5 items-center gap-1 rounded border border-[#5865f2]/40 bg-[#5865f2]/10 px-1.5 text-[13px] font-medium text-fg-2", className)} title="Discord channel">
      <span aria-hidden>{t.emoji}</span>
      <span className="font-mono">{t.discordChannel}</span>
    </span>
  );
}

export function ArchivedBadge({ externalTeam }: { externalTeam: string | null }) {
  return (
    <Badge tone="neutral" title="Out of autonomy scope; kept for history">
      Archived{externalTeam ? ` · ${externalTeam}-owned` : ""}
    </Badge>
  );
}

export function AssigneeStack({ assignees, max = 3, size = 20 }: { assignees: TaskSummary["assignees"]; max?: number; size?: number }) {
  const { member } = useLookup();
  if (!assignees.length) return <span className="text-[13px] text-faint">Unassigned</span>;
  return (
    <span className="flex -space-x-1.5">
      {assignees.slice(0, max).map((a) => {
        const m = member.get(a.memberId);
        return m ? <Avatar key={a.memberId} name={m.name} color={m.avatarColor} size={size} title={`${m.name} — ${a.role === "owner" ? "primary owner" : "contributor"}`} /> : null;
      })}
      {assignees.length > max && <span className="flex items-center pl-2 text-xs text-muted">+{assignees.length - max}</span>}
    </span>
  );
}

export function PrIndicator({ pr }: { pr: TaskSummary["pr"] }) {
  if (!pr) return null;
  const icon = pr.state === "merged" ? <GitMerge className="text-violet" /> : pr.state === "closed" ? <GitPullRequestClosed className="text-danger" /> : <GitPullRequest className={pr.state === "unknown" ? "text-muted" : "text-ok"} />;
  return (
    <Tip content={`${pr.repo}#${pr.number ?? ""} · ${pr.state}${pr.checks !== "unknown" && pr.checks !== "none" ? ` · checks ${pr.checks}` : ""}`}>
      <a href={pr.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-0.5 font-mono text-xs text-muted [&_svg]:size-3">
        {icon}#{pr.number}
        {pr.checks === "failing" && <span className="size-1.5 rounded-full bg-danger" />}
        {pr.checks === "passing" && <span className="size-1.5 rounded-full bg-ok" />}
      </a>
    </Tip>
  );
}

export function TestingIndicator({ testing }: { testing: TaskSummary["testing"] }) {
  if (testing === "none") return null;
  return (
    <Tip content={testing === "approved" ? "Approved with test evidence" : "Test evidence submitted"}>
      <span className={cn("inline-flex [&_svg]:size-3", testing === "approved" ? "text-ok" : "text-info")}>{testing === "approved" ? <CheckCircle2 /> : <FlaskConical />}</span>
    </Tip>
  );
}

export function DepIndicator({ t }: { t: Pick<TaskSummary, "missingDeps" | "prereqCount" | "openBlockers"> }) {
  return (
    <>
      {t.openBlockers > 0 && (
        <Tip content={`${t.openBlockers} open blocker(s)`}>
          <span className="inline-flex items-center gap-0.5 text-xs text-danger [&_svg]:size-3">
            <AlertOctagon /> {t.openBlockers}
          </span>
        </Tip>
      )}
      {t.prereqCount > 0 && (
        <Tip content={t.missingDeps.length ? `Waiting on: ${t.missingDeps.join(", ")}` : "All prerequisites complete"}>
          <span className={cn("inline-flex items-center gap-0.5 text-xs [&_svg]:size-3", t.missingDeps.length ? "text-warn" : "text-ok")}>
            <Link2 /> {t.prereqCount - t.missingDeps.length}/{t.prereqCount}
          </span>
        </Tip>
      )}
    </>
  );
}

export function TaskLink({ k, title, className }: { k: string; title?: string; className?: string }) {
  return (
    <Link href={`/tasks/${k}`} className={cn("group inline-flex min-w-0 items-baseline gap-1.5 hover:text-fg", className)}>
      <span className="font-mono text-[13px] text-muted group-hover:text-info">{k}</span>
      {title && <span className="truncate text-fg-2 group-hover:text-fg">{title}</span>}
    </Link>
  );
}

export function ClaimableHint({ t }: { t: Pick<TaskSummary, "status" | "claimable" | "assignees"> }) {
  if (t.status !== "available" || !t.claimable || t.assignees.some((a) => a.role === "owner")) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-info">
      <CircleDashed className="size-3" /> Open to claim
    </span>
  );
}

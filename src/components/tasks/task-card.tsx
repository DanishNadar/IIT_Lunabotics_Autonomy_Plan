"use client";

import { CalendarClock, CheckSquare, Eye, FileCheck2 } from "lucide-react";
import Link from "next/link";
import type { TaskSummary } from "@/lib/domain/views";
import { cn, day } from "@/lib/utils";
import { Avatar, Progress } from "../ui/primitives";
import { useLookup } from "../workspace";
import { AssigneeStack, ClaimableHint, DepIndicator, DifficultyMeter, PriorityBadge, PrIndicator, TestingIndicator, TrackChip } from "./bits";

export function TaskCard({ t, dragging }: { t: TaskSummary; dragging?: boolean }) {
  const { member } = useLookup();
  const reviewer = t.reviewerId ? member.get(t.reviewerId) : null;
  const overdue = t.dueDate && t.status !== "completed" && new Date(t.dueDate) < new Date();
  return (
    <div className={cn("group rounded-md border border-line bg-panel-2 p-2.5 text-left transition-colors hover:border-line-strong", dragging && "rotate-1 border-info/60 shadow-[var(--shadow)]", t.status === "blocked" && "border-l-2 border-l-danger")}>
      <div className="mb-1 flex items-center gap-2">
        <TrackChip trackId={t.trackId} />
        <Link href={`/tasks/${t.key}`} className="font-mono text-[13px] text-muted hover:text-info" onPointerDown={(e) => e.stopPropagation()}>
          {t.key}
        </Link>
        <span className="ml-auto flex items-center gap-1.5">
          <PriorityBadge priority={t.priority} compact />
        </span>
      </div>
      <Link href={`/tasks/${t.key}`} onPointerDown={(e) => e.stopPropagation()} className="line-clamp-2 text-[15px] leading-snug font-medium text-fg hover:underline">
        {t.title}
      </Link>
      {t.progress.total > 0 && (
        <div className="mt-2 flex items-center gap-2">
          <Progress value={t.progress.pct} tone={t.progress.pct === 100 ? "ok" : "info"} className="h-1" label={`${t.key} progress`} />
          <span className="flex shrink-0 items-center gap-0.5 font-mono text-xs text-muted">
            <CheckSquare className="size-3" />
            {t.progress.done}/{t.progress.total}
          </span>
        </div>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        <DifficultyMeter difficulty={t.difficulty} />
        <span className="font-mono text-xs text-faint">{t.estimateHours}h</span>
        <DepIndicator t={t} />
        <PrIndicator pr={t.pr} />
        <TestingIndicator testing={t.testing} />
        {t.evidence && t.testing !== "approved" && <FileCheck2 className="size-3 text-info" aria-label="Evidence submitted" />}
        {t.dueDate && (
          <span className={cn("inline-flex items-center gap-0.5 text-xs", overdue ? "text-danger" : "text-muted")}>
            <CalendarClock className="size-3" /> {day(t.dueDate)}
          </span>
        )}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <AssigneeStack assignees={t.assignees} size={18} />
        <ClaimableHint t={t} />
        {reviewer && (
          <span className="ml-auto flex items-center gap-1 text-xs text-muted" title={`Reviewer: ${reviewer.name}`}>
            <Eye className="size-3" />
            <Avatar name={reviewer.name} color={reviewer.avatarColor} size={14} />
          </span>
        )}
      </div>
    </div>
  );
}

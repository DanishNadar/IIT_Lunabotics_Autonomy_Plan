"use client";

import { Archive, ArrowRightLeft, Link2, PlugZap, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Badge, Button } from "@/components/ui/primitives";
import { useCommand } from "@/components/use-command";
import { useCan } from "@/components/workspace";
import { EXTERNAL_DEP_STATUS } from "@/lib/ui-meta";
import type { TaskDetailData } from "./task-detail";

/** Archive state, key history and external dependencies for a task. */
export function TaskNotices({ data }: { data: TaskDetailData }) {
  const { task } = data;
  const from = useSearchParams().get("from");
  const can = useCan();
  const { run, pending } = useCommand();
  return (
    <>
      {task.archived && (
        <div className="flex flex-wrap items-start gap-3 rounded-lg border border-line-strong bg-panel-2 px-4 py-3 text-[13px]">
          <Archive className="mt-0.5 size-4 text-muted" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-fg">Archived — outside autonomy scope{task.externalTeam ? `; implementation is owned by ${task.externalTeam}` : ""}.</p>
            <p className="mt-0.5 text-fg-2">{task.archivedReason}</p>
            <p className="mt-1 text-muted">Kept for history and existing links. It is hidden from boards, sprints and autonomy completion metrics and cannot be claimed.</p>
          </div>
          {can("task.delete", { task }) && (
            <Button size="sm" disabled={pending} onClick={() => run({ type: "task.archive", taskId: task.id, archived: false, externalTeam: null, reason: "" })}>
              <RotateCcw /> Restore to autonomy backlog
            </Button>
          )}
        </div>
      )}
      {(task.legacyKeys.length > 0 || from) && (
        <div className="flex items-start gap-2 rounded-lg border border-info/30 bg-info-soft px-4 py-2.5 text-[13px]">
          <ArrowRightLeft className="mt-0.5 size-3.5 text-info" />
          <p className="text-fg-2">
            {from && from !== task.key && <>You followed a link to <span className="font-mono">{from}</span>, which is now <span className="font-mono font-semibold">{task.key}</span>. </>}
            {task.legacyKeys.length > 0 && <>Formerly <span className="font-mono">{task.legacyKeys.join(", ")}</span> — re-keyed in the autonomy restructure; assignments, comments, checklist progress and history were preserved.</>}
          </p>
        </div>
      )}
      {data.keyHistory.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-warn/30 bg-warn-soft px-4 py-2.5 text-[13px]">
          <Link2 className="mt-0.5 size-3.5 text-warn" />
          <p className="text-fg-2">
            Before the autonomy restructure (2026-10-25), <span className="font-mono">{task.key}</span> referred to a different task:{" "}
            {data.keyHistory.map((h, i) => (
              <span key={h.key}>
                {i > 0 && ", "}
                <Link href={`/tasks/${h.key}`} className="text-info hover:underline">“{h.title}” (now {h.key})</Link>
              </span>
            ))}
            . Older discussions mentioning {task.key} may mean that task.
          </p>
        </div>
      )}
      {data.externalDependencies.length > 0 && (
        <div className="rounded-lg border border-line bg-panel px-4 py-2.5 text-[13px]">
          <div className="mb-1 flex items-center gap-1.5 font-semibold text-fg"><PlugZap className="size-3.5 text-muted" /> Depends on other teams</div>
          <ul className="space-y-1">
            {data.externalDependencies.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-2">
                <Badge>{d.team}</Badge>
                <span className="text-fg-2">{d.title}</span>
                <Badge tone={EXTERNAL_DEP_STATUS[d.status].tone}>{EXTERNAL_DEP_STATUS[d.status].label}</Badge>
                <span className="text-muted">Until then: {d.workaround}</span>
              </li>
            ))}
          </ul>
          <Link href="/tracks/AG#external" className="mt-1 inline-block text-[13px] text-info hover:underline">Track all external dependencies →</Link>
        </div>
      )}
    </>
  );
}

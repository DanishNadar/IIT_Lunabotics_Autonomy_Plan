"use client";

import { createColumnHelper, flexRender, getCoreRowModel, getSortedRowModel, useReactTable, type SortingState } from "@tanstack/react-table";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useMemo, useState } from "react";
import { AssigneeStack, DepIndicator, DifficultyMeter, PriorityBadge, PrIndicator, StatusBadge, TaskLink, TestingIndicator, TrackChip } from "@/components/tasks/bits";
import { Progress } from "@/components/ui/primitives";
import { useLookup } from "@/components/workspace";
import { TASK_STATUSES } from "@/lib/domain/types";
import type { TaskSummary } from "@/lib/domain/views";
import { day } from "@/lib/utils";

const col = createColumnHelper<TaskSummary>();
const PRIO = { critical: 0, high: 1, medium: 2, low: 3 };
const DIFF = { beginner: 0, intermediate: 1, advanced: 2, expert: 3 };

export function TableView({ tasks }: { tasks: TaskSummary[] }) {
  const { sprint, milestone, subtrack } = useLookup();
  const [sorting, setSorting] = useState<SortingState>([{ id: "key", desc: false }]);
  const columns = useMemo(
    () => [
      col.accessor("key", { header: "ID", cell: (c) => <TaskLink k={c.getValue()} />, size: 70 }),
      col.accessor("title", { header: "Title", cell: (c) => <a href={`/tasks/${c.row.original.key}`} className="line-clamp-1 text-fg hover:underline">{c.getValue()}</a>, size: 320 }),
      col.accessor("trackId", { header: "Track", cell: (c) => <TrackChip trackId={c.getValue()} />, size: 60 }),
      col.accessor((t) => (t.subtrackId ? subtrack.get(t.subtrackId)?.name ?? "" : ""), { id: "subtrack", header: "Subtrack", cell: (c) => <span className="text-muted">{c.getValue()}</span> }),
      col.accessor("status", { header: "Status", cell: (c) => <StatusBadge status={c.getValue()} />, sortingFn: (a, b) => TASK_STATUSES.indexOf(a.original.status) - TASK_STATUSES.indexOf(b.original.status) }),
      col.accessor("priority", { header: "Priority", cell: (c) => <PriorityBadge priority={c.getValue()} />, sortingFn: (a, b) => PRIO[a.original.priority] - PRIO[b.original.priority] }),
      col.accessor("difficulty", { header: "Difficulty", cell: (c) => <DifficultyMeter difficulty={c.getValue()} label />, sortingFn: (a, b) => DIFF[a.original.difficulty] - DIFF[b.original.difficulty] }),
      col.accessor("estimateHours", { header: "Est.", cell: (c) => <span className="font-mono text-muted">{c.getValue()}h</span> }),
      col.accessor((t) => t.progress.pct, { id: "progress", header: "Progress", cell: (c) => <div className="flex w-24 items-center gap-1.5"><Progress value={c.getValue()} className="h-1" /><span className="font-mono text-xs text-muted">{c.getValue()}%</span></div> }),
      col.accessor((t) => t.assignees.length, { id: "assignees", header: "Assignees", cell: (c) => <AssigneeStack assignees={c.row.original.assignees} /> }),
      col.accessor((t) => (t.sprintId ? sprint.get(t.sprintId)?.name ?? "" : ""), { id: "sprint", header: "Sprint", cell: (c) => <span className="text-muted">{c.getValue() || "—"}</span> }),
      col.accessor((t) => (t.milestoneId ? milestone.get(t.milestoneId)?.name.split("·")[0] ?? "" : ""), { id: "milestone", header: "Milestone", cell: (c) => <span className="text-muted">{c.getValue() || "—"}</span> }),
      col.accessor("dueDate", { header: "Due", cell: (c) => <span className="font-mono text-[13px] text-muted">{day(c.getValue())}</span> }),
      col.display({ id: "signals", header: "Signals", cell: (c) => <div className="flex items-center gap-2"><DepIndicator t={c.row.original} /><PrIndicator pr={c.row.original.pr} /><TestingIndicator testing={c.row.original.testing} /></div> }),
    ],
    [sprint, milestone, subtrack],
  );
  const table = useReactTable({ data: tasks, columns, state: { sorting }, onSortingChange: setSorting, getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel() });
  return (
    <div className="p-3">
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full text-[13px]">
          <thead className="sticky top-0 bg-panel-2">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th key={h.id} className="border-b border-line px-2.5 py-2 text-left text-xs font-semibold tracking-wider whitespace-nowrap text-muted uppercase">
                    {h.column.getCanSort() ? (
                      <button onClick={h.column.getToggleSortingHandler()} className="inline-flex items-center gap-1 hover:text-fg">
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {h.column.getIsSorted() === "asc" ? <ArrowUp className="size-3" /> : h.column.getIsSorted() === "desc" ? <ArrowDown className="size-3" /> : null}
                      </button>
                    ) : (
                      flexRender(h.column.columnDef.header, h.getContext())
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((r) => (
              <tr key={r.id} className="border-b border-line bg-panel last:border-0 hover:bg-panel-2">
                {r.getVisibleCells().map((c) => (
                  <td key={c.id} className="px-2.5 py-1.5 whitespace-nowrap">
                    {flexRender(c.column.columnDef.cell, c.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {tasks.length === 0 && <p className="py-10 text-center text-[13px] text-muted">No tasks match these filters.</p>}
      </div>
    </div>
  );
}

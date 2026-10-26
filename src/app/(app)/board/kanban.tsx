"use client";

import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { useEffect, useMemo, useState } from "react";
import { BlockerDialog } from "@/components/tasks/blocker-dialog";
import { TaskCard } from "@/components/tasks/task-card";
import { useToast } from "@/components/ui/toast";
import { useCommand } from "@/components/use-command";
import { STATUS_LABEL, TASK_STATUSES, type TaskStatus } from "@/lib/domain/types";
import type { TaskSummary } from "@/lib/domain/views";
import { STATUS_DOT } from "@/lib/ui-meta";
import { cn } from "@/lib/utils";

function DraggableCard({ t }: { t: TaskSummary }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: t.id, data: { status: t.status } });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className={cn("cursor-grab touch-none outline-none active:cursor-grabbing", isDragging && "opacity-30")} aria-roledescription="Draggable task" aria-label={`${t.key} ${t.title}, status ${STATUS_LABEL[t.status]}`}>
      <TaskCard t={t} />
    </div>
  );
}

function Column({ status, tasks }: { status: TaskStatus; tasks: TaskSummary[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const hours = tasks.reduce((s, t) => s + t.estimateHours, 0);
  return (
    <section ref={setNodeRef} aria-label={`${STATUS_LABEL[status]} column`} className={cn("flex w-[272px] shrink-0 flex-col rounded-lg border border-transparent bg-panel/60 transition-colors", isOver && "border-info/50 bg-info-soft/30")}>
      <header className="flex items-center gap-2 px-2.5 pt-2.5 pb-2">
        <span className={cn("size-2 rounded-full", STATUS_DOT[status])} />
        <h2 className="text-[13px] font-semibold text-fg">{STATUS_LABEL[status]}</h2>
        <span className="font-mono text-xs text-muted">{tasks.length}</span>
        <span className="ml-auto font-mono text-xs text-faint">{hours}h</span>
      </header>
      <div className="flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
        {tasks.map((t) => (
          <DraggableCard key={t.id} t={t} />
        ))}
        {tasks.length === 0 && <div className="rounded-md border border-dashed border-line px-2 py-6 text-center text-[13px] text-faint">Drop here</div>}
      </div>
    </section>
  );
}

/**
 * Kanban with optimistic moves. Drops onto In Review run the review-request
 * command (Definition of Done check); Completed is reachable only by review.
 */
export function KanbanView({ tasks }: { tasks: TaskSummary[] }) {
  const [overrides, setOverrides] = useState<Record<string, TaskStatus>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [blocking, setBlocking] = useState<TaskSummary | null>(null);
  const { run } = useCommand();
  const toast = useToast();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor));

  // Drop overrides once the server data agrees.
  useEffect(() => {
    setOverrides((o) => Object.fromEntries(Object.entries(o).filter(([id, s]) => tasks.find((t) => t.id === id)?.status !== s)));
  }, [tasks]);

  const effective = useMemo(() => tasks.map((t) => (overrides[t.id] ? { ...t, status: overrides[t.id] } : t)), [tasks, overrides]);
  const byStatus = useMemo(() => {
    const m = new Map<TaskStatus, TaskSummary[]>(TASK_STATUSES.map((s) => [s, []]));
    for (const t of effective) m.get(t.status)!.push(t);
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    for (const list of m.values()) list.sort((a, b) => order[a.priority] - order[b.priority] || a.key.localeCompare(b.key));
    return m;
  }, [effective]);

  const onStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const onEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const to = e.over?.id as TaskStatus | undefined;
    const t = effective.find((x) => x.id === e.active.id);
    if (!to || !t || t.status === to) return;
    if (to === "completed") {
      toast("error", "Tasks are completed only by an approving review. Open the task to review it.");
      return;
    }
    if (to === "blocked") {
      setBlocking(t);
      return;
    }
    const prev = overrides[t.id];
    const rollback = () => setOverrides((o) => {
      const n = { ...o };
      if (prev) n[t.id] = prev;
      else delete n[t.id];
      return n;
    });
    setOverrides((o) => ({ ...o, [t.id]: to }));
    if (to === "in_review") void run({ type: "review.request", taskId: t.id, reviewerId: null }, { onError: rollback });
    else void run({ type: "task.move", taskId: t.id, status: to }, { quiet: true, onError: rollback });
  };

  const active = activeId ? effective.find((t) => t.id === activeId) : null;
  return (
    <>
      <DndContext sensors={sensors} onDragStart={onStart} onDragEnd={onEnd} onDragCancel={() => setActiveId(null)}>
        <div className="flex h-full gap-2 p-3">
          {TASK_STATUSES.map((s) => (
            <Column key={s} status={s} tasks={byStatus.get(s)!} />
          ))}
        </div>
        <DragOverlay>{active ? <TaskCard t={active} dragging /> : null}</DragOverlay>
      </DndContext>
      {blocking && <BlockerDialog taskId={blocking.id} taskKey={blocking.key} open onOpenChange={(o) => !o && setBlocking(null)} />}
    </>
  );
}

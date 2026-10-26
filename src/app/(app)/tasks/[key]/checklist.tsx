"use client";

import { Ago } from "@/components/ui/time";
import { Check, ChevronDown, ChevronRight, CornerDownRight, FileCheck2, Plus, Trash2, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Avatar, Badge, Button, Input, Progress, Select } from "@/components/ui/primitives";
import { useCommand } from "@/components/use-command";
import { useCan, useLookup } from "@/components/workspace";
import { checklistProgress, nextIncomplete, orderTree } from "@/lib/domain/checklist";
import type { ChecklistItem } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import { Section } from "./section";
import type { TaskDetailData } from "./task-detail";

export function ChecklistSection({ data }: { data: TaskDetailData }) {
  const { task, assignments } = data;
  const can = useCan();
  const canCheck = can("task.checklist", { task, assignments });
  const canEdit = can("task.edit", { task, assignments });
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({});
  useEffect(() => setOptimistic({}), [data.checklist]);
  const items = useMemo(() => data.checklist.map((c) => (c.id in optimistic ? { ...c, done: optimistic[c.id] } : c)), [data.checklist, optimistic]);
  const progress = checklistProgress(items);
  const next = nextIncomplete(items);
  const roots = orderTree(items).filter((i) => !i.parentId);
  let stepNo = 0;

  return (
    <Section
      id="steps"
      letter="E"
      title="Step-by-step implementation"
      subtitle={canCheck ? "Each step is a checkable TODO. Record evidence and owners as you go." : "Assignees and track leads can check off steps."}
      actions={
        <div className="flex w-40 items-center gap-2">
          <Progress value={progress.pct} tone={progress.pct === 100 ? "ok" : "info"} label="Checklist progress" />
          <span className="font-mono text-[11px] text-muted">{progress.done}/{progress.total}</span>
        </div>
      }
    >
      {next && canCheck && (
        <div className="mb-3 flex items-center gap-2 rounded-md border border-info/30 bg-info-soft px-3 py-2 text-xs">
          <CornerDownRight className="size-3.5 text-info" />
          <span className="text-muted">Next up:</span>
          <a href={`#step-${next.id}`} className="font-medium text-fg hover:underline">{next.text}</a>
        </div>
      )}
      <ol className="space-y-1.5">
        {roots.map((item) => {
          stepNo++;
          return (
            <StepRow
              key={item.id}
              item={item}
              n={stepNo}
              items={items}
              data={data}
              canCheck={canCheck}
              canEdit={canEdit}
              onOptimistic={(changes) => setOptimistic((o) => ({ ...o, ...changes }))}
            />
          );
        })}
      </ol>
      {canCheck && <AddStep taskId={task.id} parentId={null} />}
    </Section>
  );
}

function StepRow({ item, n, items, data, canCheck, canEdit, onOptimistic, depth = 0 }: { item: ChecklistItem; n?: number; items: ChecklistItem[]; data: TaskDetailData; canCheck: boolean; canEdit: boolean; onOptimistic: (c: Record<string, boolean>) => void; depth?: number }) {
  const children = items.filter((i) => i.parentId === item.id).sort((a, b) => a.order - b.order);
  const [open, setOpen] = useState(false);
  const { run } = useCommand();
  const { member } = useLookup();
  const owner = item.ownerId ? member.get(item.ownerId) : null;
  const doneBy = item.doneBy ? member.get(item.doneBy) : null;
  const blockedByChildren = children.some((c) => !c.done);

  const toggle = () => {
    if (!canCheck) return;
    const done = !item.done;
    onOptimistic({ [item.id]: done });
    void run({ type: "checklist.toggle", itemId: item.id, done }, { quiet: true, onError: () => onOptimistic({ [item.id]: !done }) });
  };

  return (
    <li id={`step-${item.id}`} className={cn("scroll-mt-36", depth === 0 && "rounded-md border border-line bg-panel-2")}>
      <div className={cn("flex items-start gap-2.5", depth === 0 ? "px-2.5 py-2" : "py-1 pl-1")}>
        <button
          role="checkbox"
          aria-checked={item.done}
          aria-label={item.text}
          disabled={!canCheck || (!item.done && blockedByChildren)}
          onClick={toggle}
          title={!item.done && blockedByChildren ? "Complete the sub-steps first" : undefined}
          className={cn("mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border transition-colors", item.done ? "border-ok bg-ok text-bg" : "border-line-strong hover:border-info", (!canCheck || (!item.done && blockedByChildren)) && "cursor-not-allowed opacity-60")}
        >
          {item.done && <Check className="size-3" strokeWidth={3} />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            {n !== undefined && <span className="font-mono text-[10px] text-faint">STEP {n}</span>}
            <span className={cn("text-[13px]", item.done ? "text-muted line-through decoration-faint" : "text-fg")}>{item.text}</span>
            {!item.required && <Badge>optional</Badge>}
          </div>
          {item.detail && <p className="mt-0.5 text-xs text-muted">{item.detail}</p>}
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-muted">
            {item.resourceIds.map((id) => data.resourceIndex[id]).filter(Boolean).map((r) => (
              <a key={r.id} href={r.url} target="_blank" rel="noreferrer" className="rounded border border-line px-1 py-px hover:text-info">{r.title}</a>
            ))}
            {owner && <span className="inline-flex items-center gap-1"><Avatar name={owner.name} color={owner.avatarColor} size={14} /> {owner.name}</span>}
            {item.evidence && <span className="inline-flex items-center gap-1 text-info"><FileCheck2 className="size-3" /> evidence</span>}
            {item.done && doneBy && <span>✓ {doneBy.name} · <Ago iso={item.doneAt} /></span>}
          </div>
        </div>
        {(canCheck || item.evidence) && (
          <button onClick={() => setOpen(!open)} className="rounded p-0.5 text-faint hover:bg-panel-3 hover:text-fg" aria-label="Step details" aria-expanded={open}>
            {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
          </button>
        )}
      </div>
      {open && <StepDetails item={item} data={data} canCheck={canCheck} canEdit={canEdit} />}
      {children.length > 0 && (
        <ul className={cn("border-l border-line", depth === 0 ? "mx-2.5 mb-2 ml-[18px] pl-3" : "ml-2 pl-3")}>
          {children.map((c) => (
            <StepRow key={c.id} item={c} items={items} data={data} canCheck={canCheck} canEdit={canEdit} onOptimistic={onOptimistic} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

function StepDetails({ item, data, canCheck, canEdit }: { item: ChecklistItem; data: TaskDetailData; canCheck: boolean; canEdit: boolean }) {
  const { run, pending } = useCommand();
  const { member } = useLookup();
  const [evidence, setEvidence] = useState(item.evidence);
  return (
    <div className="mx-2.5 mb-2 space-y-2 rounded border border-line bg-panel p-2.5 text-xs">
      {canCheck ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <UserRound className="size-3.5 text-muted" />
            <span className="text-muted">Owner</span>
            <Select className="h-7 w-48 text-xs" value={item.ownerId ?? ""} onChange={(e) => run({ type: "checklist.update", itemId: item.id, ownerId: e.target.value || null }, { quiet: true })}>
              <option value="">Unassigned</option>
              {data.assignments.map((a) => (
                <option key={a.memberId} value={a.memberId}>{member.get(a.memberId)?.name}</option>
              ))}
            </Select>
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void run({ type: "checklist.update", itemId: item.id, evidence });
            }}
          >
            <Input value={evidence} onChange={(e) => setEvidence(e.target.value)} placeholder="Completion evidence: link to commit, plot, bag, notes…" className="h-7 text-xs" />
            <Button type="submit" size="sm" disabled={pending || evidence === item.evidence}>Save</Button>
          </form>
          <AddStep taskId={item.taskId} parentId={item.id} compact />
          {canEdit && (
            <button onClick={() => confirm("Remove this step and its sub-steps?") && run({ type: "checklist.delete", itemId: item.id })} className="inline-flex items-center gap-1 text-[11px] text-danger hover:underline">
              <Trash2 className="size-3" /> Remove step
            </button>
          )}
        </>
      ) : (
        <p className="text-fg-2">Evidence: {item.evidence}</p>
      )}
    </div>
  );
}

function AddStep({ taskId, parentId, compact }: { taskId: string; parentId: string | null; compact?: boolean }) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const { run, pending } = useCommand();
  if (!open)
    return (
      <button onClick={() => setOpen(true)} className={cn("inline-flex items-center gap-1 text-[11px] text-muted hover:text-fg", !compact && "mt-2")}>
        <Plus className="size-3" /> {parentId ? "Add sub-step" : "Add step"}
      </button>
    );
  return (
    <form
      className={cn("flex gap-2", !compact && "mt-2")}
      onSubmit={(e) => {
        e.preventDefault();
        void run({ type: "checklist.add", taskId, parentId, text, required: true }, { quiet: true, onSuccess: () => { setText(""); setOpen(false); } });
      }}
    >
      <Input autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder={parentId ? "Sub-step description" : "Step description"} className="h-7 text-xs" minLength={3} required />
      <Button type="submit" size="sm" variant="primary" disabled={pending}>Add</Button>
      <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
    </form>
  );
}

"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/overlay";
import { Button, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { useCommand } from "@/components/use-command";
import { useWorkspace } from "@/components/workspace";
import { DIFFICULTIES, PRIORITIES, type Task } from "@/lib/domain/types";
import { DIFFICULTY_LABEL, PRIORITY_LABEL } from "@/lib/ui-meta";

export function EditTaskDialog({ task, open, onOpenChange }: { task: Task; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { subtracks, sprints, milestones, members } = useWorkspace();
  const { run, pending } = useCommand();
  const [tab, setTab] = useState<"meta" | "spec">("meta");
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={`Edit ${task.key}`} description="Changes are audited. Leads may edit any field; specifications drive what members follow." wide>
      <div className="mb-3 flex gap-1 rounded-md border border-line bg-panel-2 p-0.5 text-xs">
        {(["meta", "spec"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 rounded px-2 py-1 ${tab === t ? "bg-panel-3 text-fg" : "text-muted"}`}>
            {t === "meta" ? "Planning & ownership" : "Specification text"}
          </button>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const s = (k: string) => (f.get(k) as string) ?? "";
          const cmd =
            tab === "meta"
              ? {
                  type: "task.update" as const,
                  taskId: task.id,
                  patch: {
                    title: s("title"),
                    priority: s("priority") as Task["priority"],
                    difficulty: s("difficulty") as Task["difficulty"],
                    estimateHours: Number(s("estimate")),
                    subtrackId: s("subtrackId") || null,
                    sprintId: s("sprintId") || null,
                    milestoneId: s("milestoneId") || null,
                    startDate: s("startDate") || null,
                    dueDate: s("dueDate") || null,
                    reviewerId: s("reviewerId") || null,
                    requiresIndependentReview: f.get("independent") === "on",
                    claimable: f.get("claimable") === "on",
                    labels: s("labels").split(",").map((x) => x.trim()).filter(Boolean),
                  },
                }
              : { type: "task.update" as const, taskId: task.id, patch: {}, spec: { problem: s("problem"), goal: s("goal"), background: s("background"), design: s("design"), integrate: s("integrate") } };
          void run(cmd, { onSuccess: () => onOpenChange(false) });
        }}
      >
        {tab === "meta" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Title" className="sm:col-span-2"><Input name="title" defaultValue={task.title} required minLength={4} /></Field>
            <Field label="Priority">
              <Select name="priority" defaultValue={task.priority}>{PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}</Select>
            </Field>
            <Field label="Difficulty">
              <Select name="difficulty" defaultValue={task.difficulty}>{DIFFICULTIES.map((d) => <option key={d} value={d}>{DIFFICULTY_LABEL[d]}</option>)}</Select>
            </Field>
            <Field label="Estimate (hours)"><Input name="estimate" type="number" min={1} max={400} defaultValue={task.estimateHours} /></Field>
            <Field label="Subtrack">
              <Select name="subtrackId" defaultValue={task.subtrackId ?? ""}>
                <option value="">—</option>
                {subtracks.filter((s) => s.trackId === task.trackId).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </Field>
            <Field label="Sprint">
              <Select name="sprintId" defaultValue={task.sprintId ?? ""}>
                <option value="">No sprint</option>
                {sprints.filter((s) => s.status !== "completed" || s.id === task.sprintId).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </Field>
            <Field label="Milestone">
              <Select name="milestoneId" defaultValue={task.milestoneId ?? ""}>
                <option value="">No milestone</option>
                {milestones.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </Select>
            </Field>
            <Field label="Start date"><Input name="startDate" type="date" defaultValue={task.startDate?.slice(0, 10) ?? ""} /></Field>
            <Field label="Target date" hint="Internal planning date."><Input name="dueDate" type="date" defaultValue={task.dueDate?.slice(0, 10) ?? ""} /></Field>
            <Field label="Reviewer">
              <Select name="reviewerId" defaultValue={task.reviewerId ?? ""}>
                <option value="">Any track lead</option>
                {members.filter((m) => m.active && m.role !== "viewer" && m.role !== "member").map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </Select>
            </Field>
            <Field label="Labels" hint="Comma separated."><Input name="labels" defaultValue={task.labels.join(", ")} /></Field>
            <label className="flex items-center gap-2 text-xs text-fg-2"><input type="checkbox" name="independent" defaultChecked={task.requiresIndependentReview} /> Requires independent review (no self-approval)</label>
            <label className="flex items-center gap-2 text-xs text-fg-2"><input type="checkbox" name="claimable" defaultChecked={task.claimable} /> Members may claim / request this task</label>
          </div>
        ) : (
          <div className="space-y-3">
            <Field label="Problem"><Textarea name="problem" defaultValue={task.spec.problem} /></Field>
            <Field label="Goal"><Textarea name="goal" defaultValue={task.spec.goal} /></Field>
            <Field label="Background (Markdown)"><Textarea name="background" defaultValue={task.spec.background} className="min-h-28" /></Field>
            <Field label="Design — how it fits our architecture"><Textarea name="design" defaultValue={task.spec.design} className="min-h-28" /></Field>
            <Field label="Integrate — downstream consumers"><Textarea name="integrate" defaultValue={task.spec.integrate} /></Field>
          </div>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={pending}>Save changes</Button>
        </div>
      </form>
    </Dialog>
  );
}

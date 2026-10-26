"use client";

import type { ChecklistItem } from "@/lib/domain/types";
import { Dialog } from "../ui/overlay";
import { Button, Field, Input, Select, Textarea } from "../ui/primitives";
import { useCommand } from "../use-command";

export function LogSessionDialog({ taskId, taskKey, steps, defaultStepId, open, onOpenChange }: { taskId: string; taskKey: string; steps: ChecklistItem[]; defaultStepId?: string | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { run, pending } = useCommand();
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={`Log a work session · ${taskKey}`} description="Record what you did so reviewers and teammates can follow along. Hours are optional and never used to rank people." wide>
      <form
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const s = (k: string) => String(f.get(k) ?? "");
          void run(
            { type: "progress.add", taskId, checklistItemId: s("step") || null, workedOn: s("workedOn"), changed: s("changed"), problems: s("problems"), experiments: s("experiments"), learned: s("learned"), nextSteps: s("next"), hours: s("hours") ? Number(s("hours")) : null },
            { onSuccess: () => onOpenChange(false) },
          );
        }}
      >
        <Field label="Step worked on" className="sm:col-span-2">
          <Select name="step" defaultValue={defaultStepId ?? ""}>
            <option value="">General</option>
            {steps.filter((s) => !s.parentId).map((s) => <option key={s.id} value={s.id}>{s.text}</option>)}
          </Select>
        </Field>
        <Field label="What you worked on" className="sm:col-span-2"><Textarea name="workedOn" required minLength={3} /></Field>
        <Field label="What changed"><Textarea name="changed" /></Field>
        <Field label="Problems encountered"><Textarea name="problems" /></Field>
        <Field label="Experiments performed"><Textarea name="experiments" /></Field>
        <Field label="What you learned"><Textarea name="learned" /></Field>
        <Field label="Next steps"><Textarea name="next" /></Field>
        <Field label="Hours (optional)"><Input name="hours" type="number" min={0} max={24} step={0.5} /></Field>
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={pending}>Save log</Button>
        </div>
      </form>
    </Dialog>
  );
}

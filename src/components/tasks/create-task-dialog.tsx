"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { DIFFICULTIES, PRIORITIES, type TrackId } from "@/lib/domain/types";
import { DIFFICULTY_LABEL, PRIORITY_LABEL } from "@/lib/ui-meta";
import { Dialog } from "../ui/overlay";
import { Button, Field, Input, Select, Textarea } from "../ui/primitives";
import { useCommand } from "../use-command";
import { useCan, useWorkspace } from "../workspace";

export function CreateTaskDialog({ trigger, defaultTrack }: { trigger: ReactNode; defaultTrack?: TrackId }) {
  const { tracks, subtracks } = useWorkspace();
  const can = useCan();
  const allowed = tracks.filter((t) => can("task.create", { task: { id: "", trackId: t.id } }));
  const [open, setOpen] = useState(false);
  const [trackId, setTrackId] = useState<TrackId>(defaultTrack && allowed.some((t) => t.id === defaultTrack) ? defaultTrack : allowed[0]?.id ?? "SF");
  const { run, pending } = useCommand();
  const router = useRouter();
  if (!allowed.length) return null;
  return (
    <Dialog open={open} onOpenChange={setOpen} trigger={trigger} title="Create engineering task" description="Start with the problem and goal. The full specification (references, steps, deliverables) can be completed on the task page." wide>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          void run(
            {
              type: "task.create",
              title: String(f.get("title")),
              trackId,
              subtrackId: (f.get("subtrackId") as string) || null,
              priority: f.get("priority") as (typeof PRIORITIES)[number],
              difficulty: f.get("difficulty") as (typeof DIFFICULTIES)[number],
              estimateHours: Number(f.get("estimate")),
              backlog: f.get("backlog") as "initial" | "advanced",
              problem: String(f.get("problem")),
              goal: String(f.get("goal")),
            },
            {
              onSuccess: (r) => {
                setOpen(false);
                if (r.data?.key) router.push(`/tasks/${r.data.key}`);
              },
            },
          );
        }}
        className="grid gap-3 sm:grid-cols-2"
      >
        <Field label="Title" className="sm:col-span-2">
          <Input name="title" required minLength={4} maxLength={160} placeholder="e.g. IMU noise characterization" />
        </Field>
        <Field label="Track">
          <Select value={trackId} onChange={(e) => setTrackId(e.target.value as TrackId)}>
            {allowed.map((t) => (
              <option key={t.id} value={t.id}>
                {t.emoji} {t.name} ({t.discordChannel})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Subtrack">
          <Select name="subtrackId" defaultValue="">
            <option value="">—</option>
            {subtracks.filter((s) => s.trackId === trackId).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Priority">
          <Select name="priority" defaultValue="medium">
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABEL[p]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Difficulty">
          <Select name="difficulty" defaultValue="intermediate">
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {DIFFICULTY_LABEL[d]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Estimated effort (hours)" hint="A planning estimate, not a productivity target.">
          <Input name="estimate" type="number" min={1} max={400} defaultValue={16} required />
        </Field>
        <Field label="Backlog">
          <Select name="backlog" defaultValue="initial">
            <option value="initial">Initial</option>
            <option value="advanced">Advanced backlog</option>
          </Select>
        </Field>
        <Field label="Problem — what challenge does this solve?" className="sm:col-span-2">
          <Textarea name="problem" required minLength={10} />
        </Field>
        <Field label="Goal — what will exist when it is done?" className="sm:col-span-2">
          <Textarea name="goal" required minLength={10} />
        </Field>
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={pending}>
            Create task
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

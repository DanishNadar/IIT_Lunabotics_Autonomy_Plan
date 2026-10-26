"use client";

import { PlugZap } from "lucide-react";
import { useState } from "react";
import { TaskLink } from "@/components/tasks/bits";
import { Badge, Button, Field, Input, Panel, PanelHeader, Select, Textarea } from "@/components/ui/primitives";
import { useCommand } from "@/components/use-command";
import { useCan } from "@/components/workspace";
import type { ExternalDependency } from "@/lib/domain/types";
import { EXTERNAL_DEP_STATUS } from "@/lib/ui-meta";
import { cn } from "@/lib/utils";

type Dep = ExternalDependency & { tasks: { key: string; title: string }[] };

/** Interfaces and data autonomy needs from Controls, Electrical, Mechanical and hardware teams. */
export function ExternalDependencies({ deps }: { deps: Dep[] }) {
  const can = useCan();
  const editable = can("external.manage");
  return (
    <Panel id="external" className="scroll-mt-16">
      <PanelHeader
        title="External team interfaces"
        icon={<PlugZap />}
        subtitle="What autonomy needs from other teams — we specify interfaces and use mocks; we do not build their systems. Not counted in autonomy completion."
      />
      <ul className="divide-y divide-line">
        {deps.map((d) => (
          <DepRow key={d.id} d={d} editable={editable} />
        ))}
      </ul>
    </Panel>
  );
}

function DepRow({ d, editable }: { d: Dep; editable: boolean }) {
  const [open, setOpen] = useState(false);
  const { run, pending } = useCommand();
  const st = EXTERNAL_DEP_STATUS[d.status];
  return (
    <li className="px-3 py-2.5 text-[13px]">
      <div className="flex flex-wrap items-center gap-2">
        <Badge>{d.team}</Badge>
        <span className="min-w-0 flex-1 font-medium text-fg">{d.title}</span>
        <Badge tone={st.tone}>{st.label}</Badge>
        <button onClick={() => setOpen(!open)} className="text-[13px] text-muted hover:text-fg" aria-expanded={open}>{open ? "Hide" : "Details"}</button>
      </div>
      <p className="mt-1 text-fg-2">{d.description}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-muted">
        <span>Affects:</span>
        {d.tasks.map((t) => <TaskLink key={t.key} k={t.key} />)}
        <span className="text-faint">· until delivered: {d.workaround}</span>
      </div>
      {open && (
        <div className="mt-2 grid gap-3 rounded-md border border-line bg-panel-2 p-3 md:grid-cols-2">
          <div>
            <h4 className="mb-1 text-[13px] font-semibold tracking-wide text-muted uppercase">What autonomy needs</h4>
            <ul className="list-disc space-y-0.5 pl-4 text-fg-2">{d.needs.map((n) => <li key={n}>{n}</li>)}</ul>
            {d.contact && <p className="mt-2 text-muted">Contact: <span className="text-fg">{d.contact}</span></p>}
            {d.notes && <p className="mt-1 whitespace-pre-wrap text-muted">{d.notes}</p>}
          </div>
          {editable ? (
            <form
              className="space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                void run({ type: "externalDep.update", dependencyId: d.id, patch: { status: f.get("status") as Dep["status"], contact: String(f.get("contact") ?? ""), notes: String(f.get("notes") ?? "") } }, { onSuccess: () => setOpen(false) });
              }}
            >
              <Field label="Status">
                <Select name="status" defaultValue={d.status}>
                  {Object.entries(EXTERNAL_DEP_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </Select>
              </Field>
              <Field label="Contact on the other team"><Input name="contact" defaultValue={d.contact} placeholder="Name or Discord handle" /></Field>
              <Field label="Notes"><Textarea name="notes" defaultValue={d.notes} placeholder="Agreements, open questions, links to their docs" /></Field>
              <Button type="submit" size="sm" variant="primary" disabled={pending}>Save</Button>
            </form>
          ) : (
            <p className={cn("text-[13px] text-muted")}>Track leads and the Autonomy Lead update these as other teams respond.</p>
          )}
        </div>
      )}
    </li>
  );
}

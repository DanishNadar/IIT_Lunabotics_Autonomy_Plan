"use client";

import { PlugZap } from "lucide-react";
import { useState } from "react";
import { TaskLink } from "@/components/tasks/bits";
import { Badge, Button, Field, Input, Select, Textarea } from "@/components/ui/primitives";
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
    <section id="external" className="scroll-mt-16 space-y-5">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent"><PlugZap className="size-5" /></span>
        <div>
          <h2 className="text-[19px] font-semibold">External team interfaces</h2>
          <p className="mt-0.5 max-w-3xl text-[15px] text-muted">Things autonomy needs from other teams. We describe exactly what we need and use a stand-in until they deliver; we don&apos;t build their systems.</p>
        </div>
      </div>
      <ul className="grid gap-5 lg:grid-cols-2">
        {deps.map((d) => (
          <DepRow key={d.id} d={d} editable={editable} />
        ))}
      </ul>
    </section>
  );
}

function DepRow({ d, editable }: { d: Dep; editable: boolean }) {
  const [open, setOpen] = useState(false);
  const { run, pending } = useCommand();
  const st = EXTERNAL_DEP_STATUS[d.status];
  return (
    <li className="flex flex-col gap-4 rounded-xl border border-line bg-panel/90 p-6 text-[15px]">
      <div className="flex flex-wrap items-center gap-2">
        <Badge>{d.team} team</Badge>
        <span className="flex-1" />
        <Badge tone={st.tone}>{st.label}</Badge>
      </div>
      <div>
        <h3 className="text-[17px] font-semibold text-fg">{d.title}</h3>
        <p className="mt-1 text-fg-2">{d.description}</p>
      </div>
      <div className="rounded-lg bg-panel-2 px-4 py-3">
        <div className="text-[13px] font-medium text-muted">Until it arrives we use</div>
        <div className="mt-0.5 text-fg-2">{d.workaround}</div>
      </div>
      <div>
        <div className="mb-2 text-[13px] font-medium text-muted">Our tasks waiting on this</div>
        <ul className="space-y-1.5">
          {d.tasks.map((t) => <li key={t.key}><TaskLink k={t.key} title={t.title} wrap /></li>)}
        </ul>
      </div>
      <button onClick={() => setOpen(!open)} className="self-start text-[14px] font-medium text-info hover:underline" aria-expanded={open}>{open ? "Hide details" : editable ? "Details & update status" : "What exactly we need"}</button>
      {open && (
        <div className="grid gap-4 rounded-lg border border-line bg-panel-2 p-4">
          <div>
            <h4 className="mb-1 font-semibold text-fg">What autonomy needs from them</h4>
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
            <p className={cn("text-[14px] text-muted")}>Leads update this as the other team responds.</p>
          )}
        </div>
      )}
    </li>
  );
}

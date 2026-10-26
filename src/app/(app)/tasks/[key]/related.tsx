"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { StatusBadge, TaskLink, TrackChip } from "@/components/tasks/bits";
import { Badge, Button, Select } from "@/components/ui/primitives";
import { useCommand } from "@/components/use-command";
import { useCan } from "@/components/workspace";
import type { TaskDependency } from "@/lib/domain/types";
import type { TaskSummary } from "@/lib/domain/views";
import { Section } from "./section";
import type { TaskDetailData } from "./task-detail";

function Row({ t, dep, onRemove }: { t: TaskSummary; dep?: TaskDependency; onRemove?: () => void }) {
  return (
    <li className="flex items-center gap-2 py-1 text-xs">
      <TrackChip trackId={t.trackId} />
      <TaskLink k={t.key} title={t.title} className="min-w-0 flex-1" />
      {dep && <Badge tone={dep.kind === "blocks" ? "warn" : "neutral"} title={dep.note}>{dep.kind === "blocks" ? "hard prerequisite" : "integration"}</Badge>}
      <StatusBadge status={t.status} />
      {onRemove && (
        <button onClick={onRemove} className="text-faint hover:text-danger" aria-label={`Remove dependency ${t.key}`}><X className="size-3.5" /></button>
      )}
    </li>
  );
}

export function RelatedSection({ data }: { data: TaskDetailData }) {
  const can = useCan();
  const { run } = useCommand();
  const canDep = can("task.dependency", { task: data.task });
  const [adding, setAdding] = useState(false);
  const [from, setFrom] = useState("");
  const [kind, setKind] = useState<"blocks" | "integrates">("integrates");
  const partners = [...data.prereqs, ...data.dependents].filter((x) => x.dep.kind === "integrates" && x.task.trackId !== data.task.trackId);
  return (
    <Section
      id="related"
      letter="M"
      title="Related tasks"
      subtitle="Prerequisites, downstream dependents, integration partners and neighbours in the same subtrack"
      actions={canDep && !adding ? <Button size="xs" onClick={() => setAdding(true)}><Plus /> Add prerequisite</Button> : null}
    >
      {adding && (
        <form
          className="mb-3 flex flex-wrap gap-2 rounded-md border border-line bg-panel-2 p-2"
          onSubmit={(e) => {
            e.preventDefault();
            void run({ type: "dependency.add", fromTaskId: from, toTaskId: data.task.id, kind, note: "" }, { onSuccess: () => { setAdding(false); setFrom(""); } });
          }}
        >
          <Select value={from} onChange={(e) => setFrom(e.target.value)} required className="h-7 min-w-64 flex-1 text-xs" aria-label="Prerequisite task">
            <option value="">Select prerequisite task…</option>
            {data.allTasks.filter((t) => t.id !== data.task.id).map((t) => <option key={t.id} value={t.id}>{t.key} — {t.title}</option>)}
          </Select>
          <Select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} className="h-7 w-44 text-xs" aria-label="Dependency kind">
            <option value="integrates">Integration (soft)</option>
            <option value="blocks">Hard prerequisite</option>
          </Select>
          <Button type="submit" size="sm" variant="primary">Add</Button>
          <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
          <p className="w-full text-[10px] text-faint">Cycles are rejected. Hard prerequisites prevent the task from becoming Available until they complete.</p>
        </form>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <h3 className="mb-1 text-[11px] font-semibold tracking-wider text-muted uppercase">Prerequisites ({data.prereqs.length})</h3>
          <ul className="divide-y divide-line">
            {data.prereqs.map((p) => <Row key={p.dep.id} t={p.task} dep={p.dep} onRemove={canDep ? () => run({ type: "dependency.remove", dependencyId: p.dep.id }) : undefined} />)}
            {!data.prereqs.length && <li className="py-1 text-xs text-faint">None</li>}
          </ul>
        </div>
        <div>
          <h3 className="mb-1 text-[11px] font-semibold tracking-wider text-muted uppercase">Downstream dependents ({data.dependents.length})</h3>
          <ul className="divide-y divide-line">
            {data.dependents.map((p) => <Row key={p.dep.id} t={p.task} dep={p.dep} />)}
            {!data.dependents.length && <li className="py-1 text-xs text-faint">None</li>}
          </ul>
        </div>
        {partners.length > 0 && (
          <div>
            <h3 className="mb-1 text-[11px] font-semibold tracking-wider text-muted uppercase">Cross-track integration partners</h3>
            <ul className="divide-y divide-line">{partners.map((p) => <Row key={p.dep.id} t={p.task} />)}</ul>
          </div>
        )}
        <div>
          <h3 className="mb-1 text-[11px] font-semibold tracking-wider text-muted uppercase">Same subtrack</h3>
          <ul className="divide-y divide-line">
            {data.sameSubtrack.map((t) => <Row key={t.id} t={t} />)}
            {!data.sameSubtrack.length && <li className="py-1 text-xs text-faint">None</li>}
          </ul>
        </div>
        {data.sameTrack.length > 0 && (
          <div>
            <h3 className="mb-1 text-[11px] font-semibold tracking-wider text-muted uppercase">Elsewhere in this track</h3>
            <ul className="divide-y divide-line">{data.sameTrack.map((t) => <Row key={t.id} t={t} />)}</ul>
          </div>
        )}
      </div>
    </Section>
  );
}

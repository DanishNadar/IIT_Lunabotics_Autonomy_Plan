"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { Experiment, MetricDefinition, TrackId } from "@/lib/domain/types";
import { Button, Field, Input, Select, Textarea } from "./ui/primitives";
import { useCommand } from "./use-command";
import { useWorkspace } from "./workspace";

type Kv = { k: string; v: string };

/** Create/edit form. Metrics must reference a defined metric (unit + provenance). */
export function ExperimentForm({ experiment, metrics, tasks, onDone }: { experiment?: Experiment; metrics: MetricDefinition[]; tasks: { id: string; key: string; title: string; trackId: TrackId }[]; onDone: (id: string) => void }) {
  const { tracks } = useWorkspace();
  const { run, pending } = useCommand();
  const [trackId, setTrackId] = useState<TrackId>(experiment?.trackId ?? "SF");
  const [params, setParams] = useState<Kv[]>(experiment ? Object.entries(experiment.parameters).map(([k, v]) => ({ k, v })) : [{ k: "", v: "" }]);
  const [vals, setVals] = useState<{ metricKey: string; value: string; note: string }[]>(experiment?.metrics.map((m) => ({ metricKey: m.metricKey, value: String(m.value), note: m.note ?? "" })) ?? []);
  const [artifacts, setArtifacts] = useState<{ label: string; url: string }[]>(experiment?.artifacts ?? []);
  return (
    <form
      className="grid gap-3 md:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const s = (k: string) => String(f.get(k) ?? "");
        void run(
          {
            type: "experiment.save",
            experimentId: experiment?.id ?? null,
            name: s("name"),
            trackId,
            taskId: s("taskId") || null,
            hypothesis: s("hypothesis"),
            environment: s("environment"),
            commit: s("commit"),
            dataset: s("dataset"),
            parameters: Object.fromEntries(params.filter((p) => p.k).map((p) => [p.k, p.v])),
            metrics: vals.filter((v) => v.metricKey && v.value !== "").map((v) => ({ metricKey: v.metricKey, value: Number(v.value), note: v.note || undefined })),
            results: s("results"),
            notes: s("notes"),
            conclusions: s("conclusions"),
            artifacts: artifacts.filter((a) => a.url),
            status: s("status") as Experiment["status"],
          },
          { onSuccess: (r) => onDone(String(r.data?.id)) },
        );
      }}
    >
      <Field label="Name" className="md:col-span-2"><Input name="name" defaultValue={experiment?.name} required minLength={3} /></Field>
      <Field label="Track"><Select value={trackId} onChange={(e) => setTrackId(e.target.value as TrackId)}>{tracks.map((t) => <option key={t.id} value={t.id}>{t.id} — {t.name}</option>)}</Select></Field>
      <Field label="Related task"><Select name="taskId" defaultValue={experiment?.taskId ?? ""}><option value="">—</option>{tasks.filter((t) => t.trackId === trackId).map((t) => <option key={t.id} value={t.id}>{t.key} — {t.title}</option>)}</Select></Field>
      <Field label="Hypothesis" className="md:col-span-2"><Textarea name="hypothesis" defaultValue={experiment?.hypothesis} /></Field>
      <Field label="Environment" hint="Simulator/version, machine, OS"><Input name="environment" defaultValue={experiment?.environment} /></Field>
      <Field label="Code commit"><Input name="commit" defaultValue={experiment?.commit} placeholder="git SHA" className="font-mono" /></Field>
      <Field label="Dataset / bag / scenario"><Input name="dataset" defaultValue={experiment?.dataset} /></Field>
      <Field label="Status"><Select name="status" defaultValue={experiment?.status ?? "planned"}><option value="planned">Planned</option><option value="running">Running</option><option value="complete">Complete</option><option value="invalid">Invalid</option></Select></Field>
      <div className="md:col-span-2">
        <div className="mb-1 text-[13px] font-medium text-muted uppercase">Parameters</div>
        {params.map((p, i) => (
          <div key={i} className="mb-1 flex gap-2">
            <Input value={p.k} onChange={(e) => setParams(params.map((x, j) => (j === i ? { ...x, k: e.target.value } : x)))} placeholder="name" className="h-7 text-[13px]" />
            <Input value={p.v} onChange={(e) => setParams(params.map((x, j) => (j === i ? { ...x, v: e.target.value } : x)))} placeholder="value" className="h-7 text-[13px]" />
            <Button size="icon" variant="ghost" onClick={() => setParams(params.filter((_, j) => j !== i))} aria-label="Remove parameter"><Trash2 /></Button>
          </div>
        ))}
        <Button size="xs" variant="ghost" onClick={() => setParams([...params, { k: "", v: "" }])}><Plus /> Parameter</Button>
      </div>
      <div className="md:col-span-2">
        <div className="mb-1 text-[13px] font-medium text-muted uppercase">Measured metrics — record only values you measured</div>
        {vals.map((v, i) => {
          const def = metrics.find((m) => m.key === v.metricKey);
          return (
            <div key={i} className="mb-1 flex flex-wrap gap-2">
              <Select value={v.metricKey} onChange={(e) => setVals(vals.map((x, j) => (j === i ? { ...x, metricKey: e.target.value } : x)))} className="h-7 w-64 text-[13px]" aria-label="Metric">
                <option value="">Select metric…</option>
                {metrics.map((m) => <option key={m.key} value={m.key}>{m.domain} · {m.name} ({m.unit})</option>)}
              </Select>
              <Input value={v.value} onChange={(e) => setVals(vals.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} type="number" step="any" placeholder={def?.unit ?? "value"} className="h-7 w-28 text-[13px]" aria-label="Value" />
              <Input value={v.note} onChange={(e) => setVals(vals.map((x, j) => (j === i ? { ...x, note: e.target.value } : x)))} placeholder="note" className="h-7 flex-1 text-[13px]" />
              <Button size="icon" variant="ghost" onClick={() => setVals(vals.filter((_, j) => j !== i))} aria-label="Remove metric"><Trash2 /></Button>
              {def && <p className="w-full text-xs text-faint">{def.definition} Provenance: {def.provenance}</p>}
            </div>
          );
        })}
        <Button size="xs" variant="ghost" onClick={() => setVals([...vals, { metricKey: "", value: "", note: "" }])}><Plus /> Metric</Button>
      </div>
      <Field label="Results" className="md:col-span-2"><Textarea name="results" defaultValue={experiment?.results} /></Field>
      <Field label="Notes"><Textarea name="notes" defaultValue={experiment?.notes} /></Field>
      <Field label="Conclusions"><Textarea name="conclusions" defaultValue={experiment?.conclusions} /></Field>
      <div className="md:col-span-2">
        <div className="mb-1 text-[13px] font-medium text-muted uppercase">Artifacts (screenshots, bags, reports)</div>
        {artifacts.map((a, i) => (
          <div key={i} className="mb-1 flex gap-2">
            <Input value={a.label} onChange={(e) => setArtifacts(artifacts.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} placeholder="label" className="h-7 w-48 text-[13px]" />
            <Input value={a.url} onChange={(e) => setArtifacts(artifacts.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} placeholder="https://" type="url" className="h-7 flex-1 text-[13px]" />
            <Button size="icon" variant="ghost" onClick={() => setArtifacts(artifacts.filter((_, j) => j !== i))} aria-label="Remove artifact"><Trash2 /></Button>
          </div>
        ))}
        <Button size="xs" variant="ghost" onClick={() => setArtifacts([...artifacts, { label: "", url: "" }])}><Plus /> Artifact</Button>
      </div>
      <div className="flex justify-end md:col-span-2"><Button type="submit" variant="primary" disabled={pending}>{experiment ? "Save changes" : "Record experiment"}</Button></div>
    </form>
  );
}

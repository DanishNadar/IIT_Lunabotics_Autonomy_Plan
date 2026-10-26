"use client";

import { AlertTriangle, ArrowDownRight, ArrowUpRight, BookMarked, ChevronDown, ChevronRight, Code2, ExternalLink, FileCode2, FolderGit2, HelpCircle, Lightbulb, Plus, ShieldCheck, Target, Wrench } from "lucide-react";
import { useEffect, useState } from "react";
import { CodeBlock, Markdown } from "@/components/ui/markdown";
import { Badge, Button, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { Dialog } from "@/components/ui/overlay";
import { useCommand } from "@/components/use-command";
import { useCan } from "@/components/workspace";
import { RESOURCE_TYPES, RESOURCE_TYPE_LABEL, TASK_RESOURCE_CATEGORIES, type RepoReference, type Resource, type TaskResourceCategory } from "@/lib/domain/types";
import { cn, day } from "@/lib/utils";
import { Section } from "./section";
import type { TaskDetailData } from "./task-detail";

export function WhySection({ data }: { data: TaskDetailData }) {
  const { spec } = data.task;
  return (
    <Section id="why" letter="B" title="Why this matters" subtitle="The engineering problem, why the rover needs it, and who depends on it">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <Block icon={<HelpCircle />} label="Problem">{spec.problem}</Block>
          <Block icon={<Target />} label="Goal">{spec.goal}</Block>
        </div>
        <div className="space-y-3">
          {spec.why.need && <Block icon={<Lightbulb />} label="Why the rover needs this">{spec.why.need}</Block>}
          {spec.why.contribution && <Block icon={<ArrowUpRight />} label="Contribution to autonomy">{spec.why.contribution}</Block>}
          {spec.why.failureImpact && (
            <Block icon={<AlertTriangle className="text-warn" />} label="When it fails">
              {spec.why.failureImpact}
            </Block>
          )}
        </div>
      </div>
      {spec.why.consumers.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-muted">Consumers of its outputs:</span>
          {spec.why.consumers.map((c) => (
            <Badge key={c} tone="info">
              <ArrowDownRight /> {c}
            </Badge>
          ))}
        </div>
      )}
      {spec.background && (
        <div className="mt-4 border-t border-line pt-3">
          <h3 className="mb-1.5 text-[11px] font-semibold tracking-wider text-muted uppercase">Background — engineering principles</h3>
          <Markdown>{spec.background}</Markdown>
        </div>
      )}
    </Section>
  );
}

function Block({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-0.5 flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-muted uppercase [&_svg]:size-3.5">
        {icon}
        {label}
      </div>
      <p className="text-[13px] leading-relaxed text-fg-2">{children}</p>
    </div>
  );
}

function ResourceChip({ r }: { r: Resource }) {
  return (
    <a href={r.url} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-1 rounded border border-line bg-panel-2 px-1.5 py-0.5 text-[11px] text-fg-2 hover:border-info/50 hover:text-info" title={r.why}>
      <BookMarked className="size-3 shrink-0" />
      <span className="truncate">{r.title}</span>
      <span className="text-faint">· {RESOURCE_TYPE_LABEL[r.type]}</span>
    </a>
  );
}

export function PrerequisitesSection({ data }: { data: TaskDetailData }) {
  const { spec } = data.task;
  return (
    <Section id="prereqs" letter="C" title="What you need to understand first" subtitle="Concepts to be comfortable with before implementing — learn them alongside the task, not as a gate">
      {spec.prerequisites.length === 0 ? (
        <p className="text-xs text-muted">No prerequisites recorded yet.</p>
      ) : (
        <ul className="space-y-2.5">
          {spec.prerequisites.map((p) => (
            <li key={p.concept} className="rounded-md border border-line bg-panel-2 p-2.5">
              <div className="text-[13px] font-medium text-fg">{p.concept}</div>
              <p className="text-xs text-muted">{p.why}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {p.resourceIds.map((id) => data.resourceIndex[id]).filter(Boolean).map((r) => (
                  <ResourceChip key={r.id} r={r} />
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
      {spec.readFirst.length > 0 && (
        <div className="mt-3">
          <h3 className="mb-1 text-[11px] font-semibold tracking-wider text-muted uppercase">Read first, in this order</h3>
          <ol className="list-decimal space-y-0.5 pl-5 text-xs text-fg-2">
            {spec.readFirst.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ol>
        </div>
      )}
    </Section>
  );
}

function SourcePreview({ url }: { url: string }) {
  const [state, setState] = useState<{ loading: boolean; text?: string; error?: string; truncated?: boolean }>({ loading: true });
  useEffect(() => {
    let alive = true;
    void fetch(`/api/github/file?url=${encodeURIComponent(url)}`)
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (alive) setState(r.ok ? { loading: false, ...body } : { loading: false, error: body.error ?? `HTTP ${r.status}` });
      })
      .catch(() => alive && setState({ loading: false, error: "Network error" }));
    return () => {
      alive = false;
    };
  }, [url]);
  if (state.loading) return <div className="h-40 animate-pulse rounded-md bg-panel-3" />;
  if (state.error) return <p className="rounded border border-warn/30 bg-warn-soft px-2 py-1.5 text-[11px] text-warn">Preview unavailable: {state.error}</p>;
  const ext = url.split(".").pop() ?? "text";
  return (
    <div className="max-h-[480px] overflow-auto">
      <CodeBlock code={state.text ?? ""} language={ext} title={state.truncated ? "Preview (truncated)" : "Source preview"} />
    </div>
  );
}

function ReferenceCard({ r }: { r: RepoReference }) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState(false);
  return (
    <div className="rounded-md border border-line bg-panel-2">
      <button onClick={() => setOpen(!open)} className="flex w-full items-start gap-2 px-3 py-2 text-left" aria-expanded={open}>
        {open ? <ChevronDown className="mt-0.5 size-3.5 shrink-0 text-muted" /> : <ChevronRight className="mt-0.5 size-3.5 shrink-0 text-muted" />}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {r.isFolder ? <FolderGit2 className="size-3.5 text-violet" /> : <FileCode2 className="size-3.5 text-info" />}
            <span className="font-mono text-[11px] text-muted">{r.repo}</span>
          </div>
          <div className="font-mono text-[12px] break-all text-fg">{r.path}</div>
          <p className="mt-0.5 line-clamp-2 text-xs text-fg-2">{r.summary}</p>
        </div>
        <a href={r.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex shrink-0 items-center gap-1 rounded border border-line px-2 py-1 text-[11px] text-fg-2 hover:border-info/50 hover:text-info">
          <ExternalLink className="size-3" /> Open on GitHub
        </a>
      </button>
      {open && (
        <div className="space-y-3 border-t border-line px-3 py-3 text-xs">
          <p className="text-fg-2">{r.summary}</p>
          {r.inspect.length > 0 && (
            <div>
              <h4 className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-muted uppercase">
                <Code2 className="size-3.5" /> Inspect {r.isFolder ? "these files/folders" : "these functions / classes"}
                <Badge tone="ok" title={`Symbols confirmed by reading the source on ${r.verifiedOn}`}>Verified {r.verifiedOn}</Badge>
              </h4>
              <ul className="space-y-0.5">
                {r.inspect.map((s) => (
                  <li key={s} className="font-mono text-[11px] text-fg-2">
                    <Markdown className="[&_p]:m-0">{`• ${s}`}</Markdown>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <h4 className="mb-0.5 text-[11px] font-semibold tracking-wide text-muted uppercase">Why it&apos;s relevant</h4>
            <p className="text-fg-2">{r.relevance}</p>
          </div>
          {r.questions.length > 0 && (
            <div>
              <h4 className="mb-0.5 text-[11px] font-semibold tracking-wide text-muted uppercase">Answer after studying it</h4>
              <ol className="list-decimal space-y-0.5 pl-5 text-fg-2">
                {r.questions.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ol>
            </div>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <h4 className="mb-0.5 flex items-center gap-1 text-[11px] font-semibold tracking-wide text-muted uppercase"><Wrench className="size-3.5" /> How we adapt it</h4>
              <p className="text-fg-2">{r.adaptation}</p>
            </div>
            <div>
              <h4 className="mb-0.5 flex items-center gap-1 text-[11px] font-semibold tracking-wide text-warn uppercase"><AlertTriangle className="size-3.5" /> Limitations & assumptions</h4>
              <ul className="list-disc space-y-0.5 pl-4 text-fg-2">
                {r.limitations.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </div>
          </div>
          {!r.isFolder && !r.repo.startsWith("huggingface") && (
            <div>
              {preview ? <SourcePreview url={r.url} /> : <Button size="xs" onClick={() => setPreview(true)}><Code2 /> Preview source via GitHub</Button>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ReferencesSection({ data }: { data: TaskDetailData }) {
  const { spec } = data.task;
  return (
    <Section id="references" letter="D" title="Study these existing implementations" subtitle="Files and symbols below were confirmed to exist in the source; questions guide what to look for">
      {spec.references.length === 0 ? (
        <p className="text-xs text-muted">No verified source references yet{spec.researchNeeded?.length ? " — see research notes above." : "."}</p>
      ) : (
        <div className="space-y-2">
          {spec.references.map((r) => (
            <ReferenceCard key={r.url} r={r} />
          ))}
        </div>
      )}
      {spec.analyze.length > 0 && (
        <div className="mt-3 rounded-md border border-line bg-panel-2 p-3">
          <h3 className="mb-1 text-[11px] font-semibold tracking-wider text-muted uppercase">Analyze — answer these across the references</h3>
          <ol className="list-decimal space-y-0.5 pl-5 text-xs text-fg-2">
            {spec.analyze.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ol>
        </div>
      )}
      {spec.design && (
        <div className="mt-3">
          <h3 className="mb-1 text-[11px] font-semibold tracking-wider text-muted uppercase">Design — how it fits our architecture</h3>
          <p className="text-[13px] leading-relaxed text-fg-2">{spec.design}</p>
        </div>
      )}
    </Section>
  );
}

export function GuidanceSection({ data }: { data: TaskDetailData }) {
  const g = data.task.spec.guidance;
  const empty = !g.packageStructure && !g.inputs.length && !g.snippets.length && !g.pitfalls.length;
  return (
    <Section id="guidance" letter="F" title="Practical implementation guidance" subtitle="Topic names follow the team's proposed conventions until AG-04's contracts are approved">
      {empty ? (
        <p className="text-xs text-muted">Guidance not written yet. A lead can add it once the approach is decided.</p>
      ) : (
        <div className="space-y-4">
          {g.packageStructure && (
            <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
              <CodeBlock code={g.packageStructure} language="tree" title="Recommended package structure" label="illustrative" />
              <div className="space-y-3">
                {g.files.length > 0 && (
                  <div>
                    <h3 className="mb-1 text-[11px] font-semibold tracking-wider text-muted uppercase">Suggested files</h3>
                    <div className="flex flex-wrap gap-1">{g.files.map((f) => <code key={f} className="rounded bg-panel-3 px-1.5 py-0.5 font-mono text-[11px] text-fg-2">{f}</code>)}</div>
                  </div>
                )}
                {g.expectedBehavior && (
                  <div>
                    <h3 className="mb-1 text-[11px] font-semibold tracking-wider text-muted uppercase">Expected behavior</h3>
                    <p className="text-xs text-fg-2">{g.expectedBehavior}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          {(g.inputs.length > 0 || g.outputs.length > 0) && (
            <div className="grid gap-3 md:grid-cols-2">
              {[["Input topics", g.inputs], ["Output topics", g.outputs]].map(([label, list]) => (
                <div key={label as string}>
                  <h3 className="mb-1 text-[11px] font-semibold tracking-wider text-muted uppercase">{label as string}</h3>
                  <table className="w-full text-[11px]">
                    <tbody>
                      {(list as typeof g.inputs).map((t) => (
                        <tr key={t.name} className="border-b border-line last:border-0">
                          <td className="py-1 pr-2 font-mono text-fg">{t.name}</td>
                          <td className="py-1 pr-2 font-mono text-info">{t.type}</td>
                          <td className="py-1 text-faint">{t.note}</td>
                        </tr>
                      ))}
                      {(list as typeof g.inputs).length === 0 && <tr><td className="py-1 text-faint">—</td></tr>}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
          {g.parameters.length > 0 && (
            <div>
              <h3 className="mb-1 text-[11px] font-semibold tracking-wider text-muted uppercase">Configuration parameters</h3>
              <table className="w-full text-[11px]">
                <thead><tr className="text-left text-faint"><th className="pb-1 font-medium">Parameter</th><th className="pb-1 font-medium">Default / source</th><th className="pb-1 font-medium">Purpose</th></tr></thead>
                <tbody>
                  {g.parameters.map((p) => (
                    <tr key={p.name} className="border-t border-line">
                      <td className="py-1 pr-2 font-mono text-fg">{p.name}</td>
                      <td className="py-1 pr-2 font-mono text-muted">{p.default}</td>
                      <td className="py-1 text-fg-2">{p.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {g.snippets.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-[11px] font-semibold tracking-wider text-muted uppercase">Commands & examples</h3>
              {g.snippets.map((s) => (
                <CodeBlock key={s.title} code={s.code} language={s.language} title={s.title} label={s.label} note={s.note} />
              ))}
            </div>
          )}
          {g.pitfalls.length > 0 && (
            <div className="rounded-md border border-warn/25 bg-warn-soft p-3">
              <h3 className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-warn uppercase"><AlertTriangle className="size-3.5" /> Common pitfalls</h3>
              <ul className="list-disc space-y-0.5 pl-4 text-xs text-fg-2">
                {g.pitfalls.map((p) => <li key={p}>{p}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </Section>
  );
}

const CATEGORY_LABEL: Record<TaskResourceCategory, string> = {
  primary_source: "Primary source implementation",
  official_docs: "Official documentation",
  text_tutorial: "Text tutorial",
  video_tutorial: "Video tutorial",
  paper: "Academic paper",
  dataset: "Dataset",
  visualization: "Visualization",
  reference_architecture: "Reference architecture",
  internal: "Related internal task",
};

export function ResourcesSection({ data }: { data: TaskDetailData }) {
  const can = useCan();
  const groups = TASK_RESOURCE_CATEGORIES.map((c) => ({ c, items: data.resources.filter((r) => r.category === c) })).filter((g) => g.items.length);
  return (
    <Section id="resources" letter="G" title="Resources" subtitle="Curated per task; every seeded link was checked for reachability on its verified date" actions={can("resource.add") ? <AddTaskResource taskId={data.task.id} /> : null}>
      {groups.length === 0 ? (
        <p className="text-xs text-muted">No resources yet.</p>
      ) : (
        <div className="space-y-3">
          {groups.map(({ c, items }) => (
            <div key={c}>
              <h3 className="mb-1.5 text-[11px] font-semibold tracking-wider text-muted uppercase">{CATEGORY_LABEL[c]}</h3>
              <div className="grid gap-2 md:grid-cols-2">
                {items.map(({ resource: r, why, stepRefs, id }) => (
                  <a key={id} href={r.url} target="_blank" rel="noreferrer" className="group rounded-md border border-line bg-panel-2 p-2.5 hover:border-line-strong">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="line-clamp-1 text-[13px] font-medium text-fg group-hover:text-info">{r.title}</div>
                        <div className="truncate text-[11px] text-muted">{r.publisher} · {RESOURCE_TYPE_LABEL[r.type]}{r.difficulty ? ` · ${r.difficulty}` : ""}{r.duration ? ` · ${r.duration}` : ""}</div>
                      </div>
                      <ExternalLink className="size-3.5 shrink-0 text-faint" />
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-fg-2">{why || r.why}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px]">
                      {stepRefs.length > 0 && <span className="text-muted">Helps with step {stepRefs.join(", ")}</span>}
                      {r.lastVerified ? (
                        <span className="inline-flex items-center gap-0.5 text-ok"><ShieldCheck className="size-3" /> Verified {day(r.lastVerified, "MMM d, yyyy")}</span>
                      ) : (
                        <span className="text-warn">Unverified — awaiting lead check</span>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

function AddTaskResource({ taskId }: { taskId: string }) {
  const [open, setOpen] = useState(false);
  const { run, pending } = useCommand();
  return (
    <Dialog open={open} onOpenChange={setOpen} title="Add a resource to this task" description="Only add links you have opened yourself. Members' suggestions are marked unverified until a lead checks them." trigger={<Button size="xs"><Plus /> Add</Button>}>
      <form
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          void run(
            {
              type: "resource.add",
              taskId,
              category: f.get("category") as TaskResourceCategory,
              resource: { title: f.get("title"), url: f.get("url"), publisher: f.get("publisher"), type: f.get("type"), why: f.get("why"), duration: (f.get("duration") as string) || null, difficulty: null, topics: [], trackIds: [] },
            },
            { onSuccess: () => setOpen(false) },
          );
        }}
      >
        <Field label="Title" className="sm:col-span-2"><Input name="title" required minLength={3} /></Field>
        <Field label="URL" className="sm:col-span-2"><Input name="url" type="url" required placeholder="https://" /></Field>
        <Field label="Publisher"><Input name="publisher" required /></Field>
        <Field label="Type"><Select name="type" defaultValue="tutorial">{RESOURCE_TYPES.map((t) => <option key={t} value={t}>{RESOURCE_TYPE_LABEL[t]}</option>)}</Select></Field>
        <Field label="Category on this task"><Select name="category" defaultValue="text_tutorial">{TASK_RESOURCE_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}</Select></Field>
        <Field label="Duration" hint="Only if you measured it."><Input name="duration" placeholder="e.g. 25 min" /></Field>
        <Field label="Why it matters" className="sm:col-span-2"><Textarea name="why" required minLength={10} /></Field>
        <div className="flex justify-end sm:col-span-2"><Button type="submit" variant="primary" disabled={pending}>Add resource</Button></div>
      </form>
    </Dialog>
  );
}

export function TemplateSection({ data }: { data: TaskDetailData }) {
  const { spec } = data.task;
  return (
    <Section id="test" title="Test · Measure · Document · Integrate" subtitle="How the work is evaluated and who consumes it">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <h3 className="mb-1 text-[11px] font-semibold tracking-wider text-muted uppercase">Testing plan</h3>
          <ul className="list-disc space-y-0.5 pl-4 text-xs text-fg-2">{spec.testPlan.map((t) => <li key={t}>{t}</li>)}</ul>
        </div>
        <div>
          <h3 className="mb-1 text-[11px] font-semibold tracking-wider text-muted uppercase">Document</h3>
          <ul className="list-disc space-y-0.5 pl-4 text-xs text-fg-2">{spec.document.map((t) => <li key={t}>{t}</li>)}</ul>
          {spec.integrate && (
            <>
              <h3 className="mt-3 mb-1 text-[11px] font-semibold tracking-wider text-muted uppercase">Integrate</h3>
              <p className="text-xs text-fg-2">{spec.integrate}</p>
            </>
          )}
        </div>
      </div>
      {spec.measure.length > 0 && (
        <div className="mt-4">
          <h3 className="mb-1 text-[11px] font-semibold tracking-wider text-muted uppercase">Measure</h3>
          <table className="w-full text-[11px]">
            <thead><tr className="text-left text-faint"><th className="pb-1 font-medium">Metric</th><th className="pb-1 font-medium">Definition</th><th className="pb-1 font-medium">Internal target & rationale</th></tr></thead>
            <tbody>
              {spec.measure.map((m) => (
                <tr key={m.metric} className="border-t border-line align-top">
                  <td className="py-1.5 pr-2 font-medium text-fg">{m.metric}</td>
                  <td className="py-1.5 pr-2 text-fg-2">{m.definition}</td>
                  <td className={cn("py-1.5", m.target ? "text-fg-2" : "text-faint")}>{m.target ? <><span className="text-info">{m.target}</span>{m.rationale && <span className="block text-muted">{m.rationale}</span>}</> : "Report the measured value"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-1 text-[10px] text-faint">Targets are internal engineering goals, not competition requirements.</p>
        </div>
      )}
      {data.experiments.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="text-muted">Linked experiments:</span>
          {data.experiments.map((e) => (
            <a key={e.id} href={`/experiments/${e.id}`} className="rounded border border-line px-1.5 py-0.5 text-fg-2 hover:text-info">{e.name}{e.isDemo && " (demo)"}</a>
          ))}
        </div>
      )}
    </Section>
  );
}

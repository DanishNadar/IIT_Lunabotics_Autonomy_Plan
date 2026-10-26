"use client";

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Circle,
  Code2,
  Compass,
  ExternalLink,
  FlaskConical,
  Lightbulb,
  ListChecks,
  PackageCheck,
  PlayCircle,
  Search,
  Target,
  Wrench,
  X,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CodeBlock, Markdown } from "@/components/ui/markdown";
import { GrowBar } from "@/components/ui/motion";
import type { ChecklistItem, Resource, TopicContract } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import type { TaskDetailData } from "./task-detail";

interface Step {
  id: string;
  group: string;
  title: string;
  icon: ReactNode;
  body: ReactNode;
}

const storageKey = (taskId: string) => `acc-walkthrough:${taskId}`;

function loadDone(taskId: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(storageKey(taskId)) ?? "[]");
  } catch {
    return [];
  }
}

function saveDone(taskId: string, done: string[]) {
  try {
    localStorage.setItem(storageKey(taskId), JSON.stringify(done));
  } catch {
    // private mode: progress just isn't remembered
  }
}

/** Builds the ordered walkthrough from the task's spec, checklist and resources. Empty sections are skipped. */
function buildSteps(data: TaskDetailData): Step[] {
  const { task } = data;
  const spec = task.spec;
  const res = new Map<string, Resource>([...Object.entries(data.resourceIndex), ...data.resources.map((r) => [r.resource.id, r.resource] as const)]);
  const steps: Step[] = [];

  steps.push({
    id: "why",
    group: "Understand",
    title: "Why this task matters",
    icon: <Target />,
    body: (
      <div className="space-y-6">
        <Callout tone="accent" title="The problem">{spec.problem}</Callout>
        <Callout tone="ok" title="Your goal">{spec.goal}</Callout>
        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Why the rover needs it">{spec.why.need}</Card>
          <Card title="If it fails">{spec.why.failureImpact}</Card>
        </div>
        {spec.why.consumers.length > 0 && (
          <div>
            <h4 className="mb-2 text-[15px] font-semibold text-fg-2">Who uses your work</h4>
            <div className="flex flex-wrap gap-2">
              {spec.why.consumers.map((c) => (
                <span key={c} className="rounded-full border border-info/30 bg-info-soft px-3 py-1 text-[14px] text-info">
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    ),
  });

  if (spec.background) {
    steps.push({
      id: "background",
      group: "Understand",
      title: "The idea in plain terms",
      icon: <Lightbulb />,
      body: <Markdown className="prose-tech text-[16px]">{spec.background}</Markdown>,
    });
  }

  if (spec.prerequisites.length) {
    steps.push({
      id: "learn",
      group: "Learn",
      title: "Learn these concepts first",
      icon: <BookOpen />,
      body: (
        <div className="space-y-4">
          <p className="text-[16px] text-muted">You don&apos;t need to master everything up front. Skim each concept, then come back to it while you build.</p>
          {spec.prerequisites.map((p, i) => (
            <motion.div key={p.concept} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 * i }} className="rounded-lg border border-line bg-panel-2 p-5">
              <div className="flex items-start gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[14px] font-bold text-accent">{i + 1}</span>
                <div className="min-w-0 flex-1 space-y-3">
                  <div>
                    <h4 className="text-[17px] font-semibold">{p.concept}</h4>
                    <p className="text-[15px] text-muted">{p.why}</p>
                  </div>
                  <ResourceLinks ids={p.resourceIds} res={res} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ),
    });
  }

  if (spec.references.length) {
    steps.push({
      id: "study",
      group: "Learn",
      title: "Study how other teams did it",
      icon: <Search />,
      body: (
        <div className="space-y-5">
          {spec.readFirst.length > 0 && (
            <Callout tone="info" title="Read these first">
              <ul className="list-disc space-y-1 pl-5">
                {spec.readFirst.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </Callout>
          )}
          {spec.references.map((r) => (
            <div key={r.url} className="space-y-4 rounded-lg border border-line bg-panel-2 p-5">
              <a href={r.url} target="_blank" rel="noreferrer" className="group flex items-start gap-3">
                <Code2 className="mt-1 size-5 shrink-0 text-info" />
                <div className="min-w-0">
                  <div className="font-mono text-[13px] text-muted">{r.repo}</div>
                  <div className="font-mono text-[15px] break-all text-fg group-hover:underline">{r.path}</div>
                </div>
                <ExternalLink className="ml-auto size-4 shrink-0 text-faint group-hover:text-fg" />
              </a>
              <p className="text-[15px] leading-relaxed text-fg-2">{r.summary}</p>
              {r.inspect.length > 0 && (
                <div>
                  <h5 className="mb-2 text-[14px] font-semibold text-muted">Look for</h5>
                  <div className="flex flex-wrap gap-2">
                    {r.inspect.map((x) => (
                      <code key={x} className="rounded-md bg-panel-3 px-2 py-1 text-[13px]">
                        {x}
                      </code>
                    ))}
                  </div>
                </div>
              )}
              {r.questions.length > 0 && (
                <div className="rounded-md border border-violet/30 bg-violet/10 p-4">
                  <h5 className="mb-2 flex items-center gap-2 text-[14px] font-semibold text-violet">
                    <Lightbulb className="size-4" /> Answer these as you read
                  </h5>
                  <ol className="list-decimal space-y-1.5 pl-5 text-[15px] text-fg-2">
                    {r.questions.map((q) => (
                      <li key={q}>{q}</li>
                    ))}
                  </ol>
                </div>
              )}
              {r.adaptation && <Card title="How to adapt it for our rover">{r.adaptation}</Card>}
            </div>
          ))}
        </div>
      ),
    });
  }

  if (spec.analyze.length || spec.design) {
    steps.push({
      id: "design",
      group: "Plan",
      title: "Plan your design",
      icon: <Compass />,
      body: (
        <div className="space-y-5">
          {spec.analyze.length > 0 && (
            <div>
              <h4 className="mb-3 text-[15px] font-semibold text-fg-2">Before writing code, work out</h4>
              <ul className="space-y-2">
                {spec.analyze.map((a) => (
                  <li key={a} className="flex gap-3 rounded-md bg-panel-2 p-3 text-[15px]">
                    <Search className="mt-0.5 size-4 shrink-0 text-info" /> {a}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {spec.design && <Callout tone="ok" title="Suggested design">{spec.design}</Callout>}
        </div>
      ),
    });
  }

  const g = spec.guidance;
  if (g.packageStructure || g.inputs.length || g.outputs.length) {
    steps.push({
      id: "setup",
      group: "Build",
      title: "Set up the package and its connections",
      icon: <PackageCheck />,
      body: (
        <div className="space-y-6">
          {(g.inputs.length > 0 || g.outputs.length > 0) && (
            <div>
              <h4 className="mb-3 text-[15px] font-semibold text-fg-2">How your node connects to the rest of the rover</h4>
              <TopicDiagram inputs={g.inputs} outputs={g.outputs} label={task.key} />
            </div>
          )}
          {g.packageStructure && <CodeBlock code={g.packageStructure} language="text" title="Suggested package layout" />}
          {g.parameters.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-line">
              <table className="w-full text-[14px]">
                <thead className="bg-panel-2 text-left text-muted">
                  <tr>
                    <th className="px-4 py-2 font-medium">Parameter</th>
                    <th className="px-4 py-2 font-medium">Default</th>
                    <th className="px-4 py-2 font-medium">What it does</th>
                  </tr>
                </thead>
                <tbody>
                  {g.parameters.map((p) => (
                    <tr key={p.name} className="border-t border-line">
                      <td className="px-4 py-2 font-mono text-[13px]">{p.name}</td>
                      <td className="px-4 py-2 font-mono text-[13px] text-muted">{p.default}</td>
                      <td className="px-4 py-2 text-fg-2">{p.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ),
    });
  }

  const top = data.checklist.filter((c) => c.parentId === null).sort((a, b) => a.order - b.order);
  top.forEach((item, i) => {
    const subs = data.checklist.filter((c) => c.parentId === item.id).sort((a, b) => a.order - b.order);
    steps.push({
      id: `step-${item.id}`,
      group: "Build",
      title: `Step ${i + 1}: ${item.text}`,
      icon: <Wrench />,
      body: <ChecklistStep item={item} subs={subs} res={res} snippet={pickSnippet(item, g.snippets)} />,
    });
  });

  if (g.snippets.length) {
    steps.push({
      id: "snippets",
      group: "Build",
      title: "Code you can start from",
      icon: <Code2 />,
      body: (
        <div className="space-y-5">
          <p className="text-[15px] text-muted">
            Labels tell you how much to trust each snippet: <b className="text-ok">verified</b> commands work as written, <b className="text-info">illustrative</b> code shows the idea, <b className="text-warn">adapt</b> needs changes for our setup.
          </p>
          {g.snippets.map((s) => (
            <CodeBlock key={s.title} code={s.code} language={s.language} title={s.title} label={s.label} note={s.note} />
          ))}
        </div>
      ),
    });
  }

  if (g.pitfalls.length || g.expectedBehavior) {
    steps.push({
      id: "pitfalls",
      group: "Build",
      title: "Avoid these common mistakes",
      icon: <AlertTriangle />,
      body: (
        <div className="space-y-5">
          {g.expectedBehavior && <Callout tone="ok" title="What success looks like">{g.expectedBehavior}</Callout>}
          <ul className="space-y-3">
            {g.pitfalls.map((p, i) => (
              <motion.li key={p} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.06 * i }} className="flex gap-3 rounded-md border border-warn/30 bg-warn-soft p-4 text-[15px] text-fg-2">
                <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warn" /> {p}
              </motion.li>
            ))}
          </ul>
        </div>
      ),
    });
  }

  if (spec.testPlan.length || spec.measure.length) {
    steps.push({
      id: "test",
      group: "Verify",
      title: "Test and measure it",
      icon: <FlaskConical />,
      body: (
        <div className="space-y-6">
          {spec.testPlan.length > 0 && (
            <div>
              <h4 className="mb-3 text-[15px] font-semibold text-fg-2">Run these tests</h4>
              <ol className="space-y-2">
                {spec.testPlan.map((t, i) => (
                  <li key={t} className="flex gap-3 rounded-md bg-panel-2 p-3 text-[15px]">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-info-soft text-[13px] font-bold text-info">{i + 1}</span> {t}
                  </li>
                ))}
              </ol>
            </div>
          )}
          {spec.measure.length > 0 && (
            <div className="grid gap-3 md:grid-cols-2">
              {spec.measure.map((m) => (
                <div key={m.metric} className="rounded-lg border border-line bg-panel-2 p-4">
                  <div className="text-[16px] font-semibold">{m.metric}</div>
                  <p className="text-[14px] text-muted">{m.definition}</p>
                  {m.target && <p className="mt-2 text-[14px] text-ok">Target: {m.target}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      ),
    });
  }

  if (data.deliverables.length || data.acceptance.length) {
    steps.push({
      id: "deliver",
      group: "Verify",
      title: "Deliver and get it reviewed",
      icon: <ListChecks />,
      body: (
        <div className="space-y-6">
          {data.deliverables.length > 0 && (
            <div>
              <h4 className="mb-3 text-[15px] font-semibold text-fg-2">Hand in</h4>
              <div className="grid gap-2 md:grid-cols-2">
                {data.deliverables.map((d) => (
                  <div key={d.id} className="flex items-center gap-3 rounded-md bg-panel-2 p-3 text-[15px]">
                    <PackageCheck className="size-5 shrink-0 text-accent" /> {d.title}
                    {!d.required && <span className="ml-auto text-xs text-muted">optional</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {data.acceptance.length > 0 && (
            <div>
              <h4 className="mb-3 text-[15px] font-semibold text-fg-2">A reviewer will check that</h4>
              <ul className="space-y-2">
                {data.acceptance.map((a) => (
                  <li key={a.id} className="flex gap-3 rounded-md border border-ok/30 bg-ok-soft p-3 text-[15px] text-fg-2">
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-ok" /> {a.text}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {spec.integrate && <Card title="How it plugs into the mission">{spec.integrate}</Card>}
        </div>
      ),
    });
  }
  return steps;
}

/** Shows a snippet whose title shares a word with the step, if any. */
function pickSnippet(item: ChecklistItem, snippets: TaskDetailData["task"]["spec"]["guidance"]["snippets"]) {
  const words = new Set(item.text.toLowerCase().split(/\W+/).filter((w) => w.length > 4));
  return snippets.find((s) => s.title.toLowerCase().split(/\W+/).some((w) => words.has(w)));
}

function ChecklistStep({ item, subs, res, snippet }: { item: ChecklistItem; subs: ChecklistItem[]; res: Map<string, Resource>; snippet?: TaskDetailData["task"]["spec"]["guidance"]["snippets"][number] }) {
  return (
    <div className="space-y-5">
      <p className="text-[18px] leading-relaxed text-fg">{item.text}</p>
      {item.detail && <Callout tone="info" title="How to approach it">{item.detail}</Callout>}
      {subs.length > 0 && (
        <div>
          <h4 className="mb-3 text-[15px] font-semibold text-fg-2">Break it down</h4>
          <ol className="space-y-2">
            {subs.map((s, i) => (
              <motion.li key={s.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.07 * i }} className="flex items-start gap-3 rounded-md bg-panel-2 p-3 text-[15px]">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-line-strong text-[13px] text-muted">{String.fromCharCode(97 + i)}</span>
                <span>{s.text}</span>
              </motion.li>
            ))}
          </ol>
        </div>
      )}
      {item.resourceIds.length > 0 && (
        <div>
          <h4 className="mb-3 text-[15px] font-semibold text-fg-2">Helpful for this step</h4>
          <ResourceLinks ids={item.resourceIds} res={res} />
        </div>
      )}
      {snippet && <CodeBlock code={snippet.code} language={snippet.language} title={snippet.title} label={snippet.label} note={snippet.note} />}
      {item.done && <Callout tone="ok" title="Already done on the team board">A team member has checked this step off.</Callout>}
    </div>
  );
}

function ResourceLinks({ ids, res }: { ids: string[]; res: Map<string, Resource> }) {
  const list = ids.map((id) => res.get(id)).filter(Boolean) as Resource[];
  if (!list.length) return null;
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {list.map((r) => (
        <a key={r.id} href={r.url} target="_blank" rel="noreferrer" className="lift group flex items-center gap-3 rounded-md border border-line bg-panel p-3">
          <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-md", r.type === "video" ? "bg-accent-soft text-accent" : "bg-info-soft text-info")}>
            {r.type === "video" ? <PlayCircle className="size-5" /> : <BookOpen className="size-5" />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[14px] font-medium">{r.title}</div>
            <div className="truncate text-xs text-muted">
              {r.type} · {r.publisher}
            </div>
          </div>
          <ExternalLink className="size-4 shrink-0 text-faint group-hover:text-fg" />
        </a>
      ))}
    </div>
  );
}

/** Inputs flow into the node, outputs flow out, with animated dashed connectors. */
function TopicDiagram({ inputs, outputs, label }: { inputs: TopicContract[]; outputs: TopicContract[]; label: string }) {
  const Side = ({ items, side }: { items: TopicContract[]; side: "in" | "out" }) => (
    <div className="flex flex-col justify-center gap-2">
      {items.length === 0 && <span className="text-[13px] text-faint">{side === "in" ? "No inputs" : "No outputs"}</span>}
      {items.map((t, i) => (
        <motion.div
          key={t.name}
          initial={{ opacity: 0, x: side === "in" ? -16 : 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 + i * 0.07 }}
          className={cn("rounded-md border px-3 py-2", side === "in" ? "border-info/30 bg-info-soft" : "border-ok/30 bg-ok-soft")}
          title={t.note}
        >
          <div className="font-mono text-[13px] break-all text-fg">{t.name}</div>
          <div className="truncate text-xs text-muted">{t.type}</div>
        </motion.div>
      ))}
    </div>
  );
  const Connector = () => (
    <svg viewBox="0 0 60 20" className="h-5 w-full self-center text-line-strong" preserveAspectRatio="none" aria-hidden>
      <line x1="0" y1="10" x2="52" y2="10" stroke="currentColor" strokeWidth="2" className="animate-dash" />
      <path d="M50 4 L58 10 L50 16" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_40px_auto_40px_minmax(0,1fr)] items-stretch gap-2 rounded-lg border border-line bg-panel-2 p-4">
      <Side items={inputs} side="in" />
      <Connector />
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center justify-center rounded-lg border-2 border-accent/50 bg-accent-soft px-4 py-6 text-center">
        <Wrench className="mb-1 size-6 text-accent" />
        <div className="text-[15px] font-semibold">Your node</div>
        <div className="font-mono text-xs text-muted">{label}</div>
      </motion.div>
      <Connector />
      <Side items={outputs} side="out" />
    </div>
  );
}

function Callout({ tone, title, children }: { tone: "accent" | "ok" | "info"; title: string; children: ReactNode }) {
  const styles = { accent: "border-accent/30 bg-accent-soft", ok: "border-ok/30 bg-ok-soft", info: "border-info/30 bg-info-soft" }[tone];
  const text = { accent: "text-accent", ok: "text-ok", info: "text-info" }[tone];
  return (
    <div className={cn("rounded-lg border p-5", styles)}>
      <h4 className={cn("mb-1.5 text-[14px] font-semibold tracking-wide uppercase", text)}>{title}</h4>
      <div className="text-[16px] leading-relaxed text-fg">{children}</div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-panel-2 p-5">
      <h4 className="mb-1.5 text-[15px] font-semibold text-fg-2">{title}</h4>
      <p className="text-[15px] leading-relaxed text-muted">{children}</p>
    </div>
  );
}

/** Banner on the task page that opens the full-screen walkthrough. */
export function GuidedWalkthrough({ data }: { data: TaskDetailData }) {
  const steps = useMemo(() => buildSteps(data), [data]);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [done, setDone] = useState<string[]>([]);
  const reduce = useReducedMotion();
  const taskId = data.task.id;

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    setDone(loadDone(taskId));
  }, [taskId]);

  const go = useCallback(
    (to: number) => {
      const next = Math.max(0, Math.min(steps.length - 1, to));
      setDirection(next >= index ? 1 : -1);
      setIndex(next);
    },
    [index, steps.length],
  );

  const markDone = (id: string, value: boolean) => {
    const next = value ? Array.from(new Set([...done, id])) : done.filter((x) => x !== id);
    setDone(next);
    saveDone(taskId, next);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input, textarea, select")) return;
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowRight") go(index + 1);
      if (e.key === "ArrowLeft") go(index - 1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, index, go]);

  if (!steps.length) return null;
  const completed = steps.filter((s) => done.includes(s.id)).length;
  const pctDone = Math.round((completed / steps.length) * 100);
  const firstOpen = steps.findIndex((s) => !done.includes(s.id));
  const step = steps[index];
  const groups = Array.from(new Set(steps.map((s) => s.group)));

  const start = (at = firstOpen === -1 ? 0 : firstOpen) => {
    setIndex(at);
    setDirection(1);
    setOpen(true);
  };

  return (
    <>
      <motion.section
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-xl border border-accent/30 bg-gradient-to-br from-accent-soft via-panel to-panel p-6 shadow-[var(--shadow)]"
      >
        <div aria-hidden className="pointer-events-none absolute -top-16 -right-16 size-56 rounded-full bg-accent/20 blur-3xl" />
        <div className="relative flex items-start gap-5">
          <div className="flex size-14 shrink-0 animate-float items-center justify-center rounded-xl bg-accent text-white shadow-lg">
            <Compass className="size-7" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <h2 className="text-2xl font-semibold">Guided walkthrough</h2>
            <p className="text-[16px] leading-relaxed text-fg-2">
              {steps.length} steps from &ldquo;why&rdquo; to &ldquo;reviewed&rdquo;: concepts, code to study, a build plan, snippets, tests and hand-in. About {data.task.estimateHours} hours of work.
            </p>
          </div>
        </div>
        <div className="relative mt-5 flex flex-wrap gap-2">
          {groups.map((grp) => (
            <span key={grp} className="rounded-full border border-line bg-panel/70 px-3 py-1 text-[13px] text-fg-2">
              {grp} · {steps.filter((s) => s.group === grp).length}
            </span>
          ))}
        </div>
        <div className="relative mt-5 flex flex-wrap items-center gap-4">
          <button onClick={() => start()} className="group inline-flex h-12 items-center gap-2 rounded-md bg-accent px-6 text-[16px] font-semibold text-white transition-all hover:shadow-[0_8px_24px_-8px_var(--accent)] hover:brightness-110">
            {completed === 0 ? "Start walkthrough" : completed === steps.length ? "Review walkthrough" : "Continue"}
            <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
          </button>
          <div className="flex min-w-[220px] flex-1 items-center gap-3">
            <GrowBar value={pctDone} className="max-w-xs" />
            <span className="text-[13px] whitespace-nowrap text-muted">
              {completed}/{steps.length} done · saved in this browser
            </span>
          </div>
        </div>
      </motion.section>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-label={`Guided walkthrough for ${data.task.key}`}
                className="fixed inset-0 z-50 flex flex-col bg-bg"
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <header className="flex items-center gap-4 border-b border-line px-4 py-3 sm:px-6">
                  <Compass className="size-5 text-accent" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-semibold">
                      <span className="font-mono text-muted">{data.task.key}</span> {data.task.title}
                    </div>
                    <div className="mt-1.5 flex items-center gap-3">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-panel-3">
                        <motion.div className="h-full rounded-full bg-accent" animate={{ width: `${((index + 1) / steps.length) * 100}%` }} transition={{ duration: 0.4 }} />
                      </div>
                      <span className="text-[13px] whitespace-nowrap text-muted">
                        Step {index + 1} of {steps.length}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => setOpen(false)} className="rounded-md p-2 text-muted hover:bg-panel-3 hover:text-fg" aria-label="Close walkthrough (Esc)">
                    <X className="size-5" />
                  </button>
                </header>

                <div className="flex min-h-0 flex-1">
                  <nav aria-label="Walkthrough steps" className="hidden w-80 shrink-0 overflow-y-auto border-r border-line p-4 lg:block">
                    {groups.map((grp) => (
                      <div key={grp} className="mb-4">
                        <div className="mb-1.5 px-2 text-xs font-semibold tracking-wider text-faint uppercase">{grp}</div>
                        {steps.map((s, i) =>
                          s.group !== grp ? null : (
                            <button
                              key={s.id}
                              onClick={() => go(i)}
                              className={cn(
                                "flex w-full items-start gap-2.5 rounded-md px-2 py-2 text-left text-[14px] transition-colors",
                                i === index ? "bg-accent-soft text-fg" : "text-muted hover:bg-panel-2 hover:text-fg",
                              )}
                            >
                              {done.includes(s.id) ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ok" /> : <Circle className={cn("mt-0.5 size-4 shrink-0", i === index ? "text-accent" : "text-faint")} />}
                              <span className="line-clamp-2">{s.title}</span>
                            </button>
                          ),
                        )}
                      </div>
                    ))}
                  </nav>

                  <main className="min-w-0 flex-1 overflow-y-auto">
                    <AnimatePresence mode="wait" custom={direction}>
                      <motion.article
                        key={step.id}
                        custom={direction}
                        initial={reduce ? false : { opacity: 0, x: 40 * direction }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={reduce ? undefined : { opacity: 0, x: -40 * direction }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        className="mx-auto max-w-3xl space-y-6 px-5 py-8 sm:px-8 sm:py-10"
                      >
                        <div className="flex items-center gap-4">
                          <span className="flex size-12 items-center justify-center rounded-xl bg-accent-soft text-accent [&_svg]:size-6">{step.icon}</span>
                          <div>
                            <div className="text-[13px] font-semibold tracking-wider text-muted uppercase">{step.group}</div>
                            <h2 className="text-2xl leading-tight font-bold sm:text-3xl">{step.title}</h2>
                          </div>
                        </div>
                        {step.body}
                        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-line bg-panel-2 p-4 text-[15px] hover:border-line-strong">
                          <input type="checkbox" className="size-5 accent-[var(--ok)]" checked={done.includes(step.id)} onChange={(e) => markDone(step.id, e.target.checked)} />
                          I&apos;ve finished this step <span className="text-[13px] text-muted">(remembered in this browser only)</span>
                        </label>
                      </motion.article>
                    </AnimatePresence>
                  </main>
                </div>

                <footer className="flex items-center gap-3 border-t border-line px-4 py-3 sm:px-6">
                  <button onClick={() => go(index - 1)} disabled={index === 0} className="inline-flex h-11 items-center gap-2 rounded-md border border-line px-4 text-[15px] hover:bg-panel-2 disabled:opacity-40">
                    <ArrowLeft className="size-4" /> Back
                  </button>
                  <span className="hidden flex-1 text-center text-[13px] text-faint sm:block">Use ← → to move between steps · Esc to close</span>
                  <span className="flex-1 sm:hidden" />
                  {index < steps.length - 1 ? (
                    <button
                      onClick={() => {
                        markDone(step.id, true);
                        go(index + 1);
                      }}
                      className="group inline-flex h-11 items-center gap-2 rounded-md bg-accent px-5 text-[15px] font-semibold text-white hover:brightness-110"
                    >
                      Done, next step <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        markDone(step.id, true);
                        setOpen(false);
                      }}
                      className="inline-flex h-11 items-center gap-2 rounded-md bg-ok px-5 text-[15px] font-semibold text-white hover:brightness-110"
                    >
                      <Check className="size-4" /> Finish walkthrough
                    </button>
                  )}
                </footer>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}

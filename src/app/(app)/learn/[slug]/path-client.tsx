"use client";

import { ArrowLeft, ArrowRight, BookMarked, Check, ChevronDown, Dumbbell, ExternalLink, PlayCircle, Sparkles, Target } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { StatusBadge, TrackChip } from "@/components/tasks/bits";
import { Reveal, Ring } from "@/components/ui/motion";
import { Panel, PanelHeader } from "@/components/ui/primitives";
import { useCommand } from "@/components/use-command";
import { useWorkspace } from "@/components/workspace";
import { RESOURCE_TYPE_LABEL, type LearningModule, type LearningPath, type Resource } from "@/lib/domain/types";
import type { TaskSummary } from "@/lib/domain/views";
import { isGuestId } from "@/lib/guest";
import { cn, pct } from "@/lib/utils";

const localKey = (pathId: string) => `acc-learning:${pathId}`;

export function PathClient({ path, modules, resources, done, followOn }: { path: LearningPath; modules: LearningModule[]; resources: Record<string, Resource>; done: string[]; followOn: TaskSummary[] }) {
  const { run } = useCommand();
  const { actor } = useWorkspace();
  const guest = isGuestId(actor.id);
  const reduce = useReducedMotion();
  const [local, setLocal] = useState(new Set(done));
  const [open, setOpen] = useState<string | null>(null);

  // Visitors keep their progress in this browser; signed-in personas save it to the team store.
  useEffect(() => {
    if (!guest) return setLocal(new Set(done));
    try {
      setLocal(new Set(JSON.parse(localStorage.getItem(localKey(path.id)) ?? "[]")));
    } catch {
      setLocal(new Set());
    }
  }, [done, guest, path.id]);

  useEffect(() => {
    const first = modules.find((m) => !local.has(m.id));
    setOpen((o) => o ?? first?.id ?? modules[0]?.id ?? null);
  }, [modules, local]);

  const count = modules.filter((m) => local.has(m.id)).length;
  const progress = pct(count, modules.length);

  const toggle = (id: string) => {
    const on = !local.has(id);
    const next = new Set(local);
    if (on) next.add(id);
    else next.delete(id);
    setLocal(next);
    if (on) {
      const after = modules.find((m) => !next.has(m.id));
      if (after) setOpen(after.id);
    }
    if (guest) {
      try {
        localStorage.setItem(localKey(path.id), JSON.stringify([...next]));
      } catch {
        // private mode: not remembered
      }
      return;
    }
    void run({ type: "learning.toggle", moduleId: id, done: on }, { quiet: true, onError: () => setLocal(new Set(done)) });
  };

  return (
    <div className="mx-auto max-w-[1200px] space-y-8 px-4 py-8 sm:px-8">
      <Reveal>
        <Link href="/learn" className="inline-flex items-center gap-1.5 text-[14px] text-muted hover:text-fg">
          <ArrowLeft className="size-4" /> All learning paths
        </Link>
        <div className="mt-4 flex flex-wrap items-center gap-8 rounded-xl border border-line bg-panel/80 p-6 shadow-[var(--shadow)] sm:p-8">
          <div className="min-w-0 flex-1 space-y-3">
            <p className="text-[14px] font-medium text-accent">{path.audience}</p>
            <h1 className="text-3xl font-bold sm:text-4xl">{path.title}</h1>
            <p className="max-w-2xl text-[17px] leading-relaxed text-fg-2">{path.summary}</p>
            {guest && <p className="text-[13px] text-faint">Your progress is saved in this browser.</p>}
          </div>
          <Ring value={progress} size={150} stroke={12} color="var(--ok)">
            <span className="text-3xl font-bold">{count}/{modules.length}</span>
            <span className="text-[13px] text-muted">modules</span>
          </Ring>
        </div>
      </Reveal>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <ol className="relative space-y-4" aria-label="Modules">
          <div aria-hidden className="absolute top-6 bottom-6 left-[23px] w-0.5 bg-line" />
          <motion.div aria-hidden className="absolute top-6 left-[23px] max-h-[calc(100%-3rem)] w-0.5 bg-ok" animate={{ height: `${(count / Math.max(1, modules.length)) * 100}%` }} transition={{ duration: 0.6 }} />
          {modules.map((m, i) => {
            const on = local.has(m.id);
            const expanded = open === m.id;
            const res = m.resourceIds.map((id) => resources[id]).filter(Boolean);
            return (
              <motion.li key={m.id} initial={reduce ? false : { opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: Math.min(i * 0.05, 0.3) }} className="relative pl-16">
                <button
                  role="checkbox"
                  aria-checked={on}
                  aria-label={`Mark module ${m.title} complete`}
                  onClick={() => toggle(m.id)}
                  className={cn("absolute top-3 left-0 z-10 flex size-12 items-center justify-center rounded-full border-2 text-[16px] font-bold transition-all duration-300", on ? "scale-100 border-ok bg-ok text-white" : expanded ? "animate-pulse-ring border-accent bg-panel text-accent" : "border-line-strong bg-panel text-muted hover:border-ok")}
                >
                  {on ? <Check className="size-6" strokeWidth={3} /> : i + 1}
                </button>
                <div className={cn("overflow-hidden rounded-xl border bg-panel/90 shadow-[var(--shadow)] transition-colors", on ? "border-ok/40" : expanded ? "border-accent/40" : "border-line")}>
                  <button onClick={() => setOpen(expanded ? null : m.id)} className="flex w-full items-center gap-3 px-5 py-4 text-left" aria-expanded={expanded}>
                    <div className="min-w-0 flex-1">
                      <h2 className={cn("text-[18px] font-semibold", on && "text-muted line-through decoration-ok/60")}>{m.title}</h2>
                      <p className="flex items-center gap-1.5 text-[14px] text-muted">
                        <Target className="size-4 shrink-0" /> {m.objective}
                      </p>
                    </div>
                    <ChevronDown className={cn("size-5 shrink-0 text-muted transition-transform", expanded && "rotate-180")} />
                  </button>
                  <AnimatePresence initial={false}>
                    {expanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}>
                        <div className="space-y-5 border-t border-line px-5 py-5">
                          <div>
                            <h3 className="mb-2 text-[14px] font-semibold tracking-wide text-muted uppercase">Do this</h3>
                            <ul className="space-y-2">
                              {m.checklist.map((c) => (
                                <li key={c} className="flex gap-3 rounded-md bg-panel-2 px-4 py-2.5 text-[15px] text-fg-2">
                                  <ArrowRight className="mt-0.5 size-4 shrink-0 text-accent" /> {c}
                                </li>
                              ))}
                            </ul>
                          </div>
                          {res.length > 0 && (
                            <div>
                              <h3 className="mb-2 text-[14px] font-semibold tracking-wide text-muted uppercase">Learn from</h3>
                              <div className="grid gap-2 sm:grid-cols-2">
                                {res.map((r) => (
                                  <a key={r.id} href={r.url} target="_blank" rel="noreferrer" className="lift group flex items-center gap-3 rounded-md border border-line bg-panel-2 p-3">
                                    <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-md", r.type === "video" ? "bg-accent-soft text-accent" : "bg-info-soft text-info")}>
                                      {r.type === "video" ? <PlayCircle className="size-5" /> : <BookMarked className="size-5" />}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                      <span className="block truncate text-[14px] font-medium">{r.title}</span>
                                      <span className="block text-xs text-muted">{RESOURCE_TYPE_LABEL[r.type]}</span>
                                    </span>
                                    <ExternalLink className="size-4 shrink-0 text-faint group-hover:text-fg" />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                          {m.exercise && (
                            <div className="flex gap-3 rounded-lg border border-info/30 bg-info-soft p-4 text-[15px] text-fg-2">
                              <Dumbbell className="mt-0.5 size-5 shrink-0 text-info" />
                              <span>
                                <strong className="text-info">Try it:</strong> {m.exercise}
                              </span>
                            </div>
                          )}
                          <button onClick={() => toggle(m.id)} className={cn("inline-flex h-11 items-center gap-2 rounded-md px-5 text-[15px] font-semibold transition-all", on ? "border border-line text-muted hover:bg-panel-2" : "bg-ok text-white hover:brightness-110")}>
                            <Check className="size-4" /> {on ? "Mark as not done" : "I've finished this module"}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.li>
            );
          })}
          {count === modules.length && modules.length > 0 && (
            <motion.li initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative rounded-xl border border-ok/40 bg-ok-soft p-6 pl-16 text-[16px]">
              <Sparkles className="absolute top-6 left-4 size-7 text-ok" />
              <strong className="text-ok">Path complete!</strong> Pick one of the follow-on tasks to put it into practice.
            </motion.li>
          )}
        </ol>

        <div className="space-y-6">
          <Panel>
            <PanelHeader title="Before you start" />
            <ul className="space-y-2 p-5 text-[15px] text-fg-2">
              {path.prerequisites.map((x) => (
                <li key={x} className="flex gap-2">
                  <Check className="mt-1 size-4 shrink-0 text-muted" /> {x}
                </li>
              ))}
            </ul>
          </Panel>
          <Panel>
            <PanelHeader title="You'll be able to" />
            <ul className="space-y-2 p-5 text-[15px] text-fg-2">
              {path.objectives.map((x) => (
                <li key={x} className="flex gap-2">
                  <Target className="mt-1 size-4 shrink-0 text-accent" /> {x}
                </li>
              ))}
            </ul>
          </Panel>
          <Panel>
            <PanelHeader title="Then try a real task" />
            <ul className="space-y-2 p-4">
              {followOn.map((t) => (
                <li key={t.id}>
                  <Link href={`/tasks/${t.key}`} className="lift flex items-center gap-3 rounded-md border border-line bg-panel-2 p-3">
                    <TrackChip trackId={t.trackId} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-mono text-xs text-muted">{t.key}</span>
                      <span className="block truncate text-[15px] font-medium">{t.title}</span>
                    </span>
                    <StatusBadge status={t.status} />
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}

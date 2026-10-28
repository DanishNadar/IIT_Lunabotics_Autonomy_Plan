"use client";

import { ArrowLeft, ArrowRight, Check, Crown, HandHelping, Mail, Search, Sparkles, UserPlus, Users } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { DifficultyMeter, StatusBadge, TaskLink } from "@/components/tasks/bits";
import { GrowBar } from "@/components/ui/motion";
import { Avatar, Badge, Button, Input } from "@/components/ui/primitives";
import { Card } from "@/components/ui/tabs";
import { useCommand } from "@/components/use-command";
import { useLookup, useWorkspace } from "@/components/workspace";
import { DIFFICULTIES, ROLE_LABEL, type Role, type TrackId } from "@/lib/domain/types";
import type { TaskSummary } from "@/lib/domain/views";
import { cn } from "@/lib/utils";

export interface Person {
  id: string;
  name: string;
  color: string;
  role: Role;
  primaryTrackId: TrackId | null;
  experience: "new" | "some" | "experienced";
  availabilityHours: number;
  isDemo: boolean;
  email: string;
}

const STEPS = ["Pick a person", "Pick tasks", "Choose their role", "Review & assign"] as const;
const EXPERIENCE = { new: "new to robotics", some: "somewhat experienced", experienced: "experienced" } as const;
/** Hardest difficulty that is a comfortable first pick for each experience level. */
const FIT: Record<Person["experience"], number> = { new: 0, some: 1, experienced: 3 };

export function AssignWizard({ people, tasks, onEmail, onAddPerson }: { people: Person[]; tasks: TaskSummary[]; onEmail: (memberId: string) => void; onAddPerson: () => void }) {
  const reduce = useReducedMotion();
  const { run } = useCommand();
  const { tracks } = useWorkspace();
  const { member, track } = useLookup();
  const [step, setStep] = useState(0);
  const [personId, setPersonId] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [role, setRole] = useState<"owner" | "contributor">("owner");
  const [note, setNote] = useState("");
  const [cat, setCat] = useState<TrackId | "all">("all");
  const [q, setQ] = useState("");
  const [showOwned, setShowOwned] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: string[]; failed: string[] } | null>(null);

  const person = people.find((p) => p.id === personId) ?? null;
  const openCount = (id: string) => tasks.filter((t) => t.status !== "completed" && t.assignees.some((a) => a.memberId === id)).length;

  const candidates = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return tasks
      .filter((t) => t.status !== "completed")
      .filter((t) => showOwned || !t.assignees.some((a) => a.role === "owner"))
      .filter((t) => cat === "all" || t.trackId === cat)
      .filter((t) => !needle || t.key.toLowerCase().includes(needle) || t.title.toLowerCase().includes(needle))
      .sort((a, b) => Number(b.status === "available") - Number(a.status === "available") || DIFFICULTIES.indexOf(a.difficulty) - DIFFICULTIES.indexOf(b.difficulty) || a.key.localeCompare(b.key, undefined, { numeric: true }));
  }, [tasks, showOwned, cat, q]);

  const chosen = tasks.filter((t) => picked.includes(t.id));
  const hours = chosen.reduce((s, t) => s + t.estimateHours, 0);

  const choosePerson = (p: Person) => {
    setPersonId(p.id);
    setCat(p.primaryTrackId ?? "all");
    setPicked([]);
    setStep(1);
  };

  const assign = async () => {
    if (!person) return;
    setBusy(true);
    const ok: string[] = [];
    const failed: string[] = [];
    for (const t of chosen) {
      const r = await run({ type: "task.assign", taskId: t.id, memberId: person.id, role, responsibility: note }, { quiet: true });
      (r.ok ? ok : failed).push(t.key);
    }
    setBusy(false);
    setResult({ ok, failed });
  };

  const reset = () => {
    setStep(0);
    setPersonId(null);
    setPicked([]);
    setNote("");
    setRole("owner");
    setResult(null);
  };

  return (
    <Card title="Assign tasks, step by step" icon={<Sparkles />} subtitle="Four short steps. You can go back at any time.">
      {/* Progress through the four steps */}
      <ol className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STEPS.map((s, i) => (
          <li key={s}>
            <button
              disabled={i > step || !!result}
              onClick={() => setStep(i)}
              className={cn("flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left text-[14px] transition-colors", i === step && !result ? "border-accent/60 bg-accent-soft text-fg" : i < step || result ? "border-ok/40 text-fg-2" : "border-line text-muted")}
            >
              <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold", i < step || result ? "bg-ok text-white" : i === step ? "bg-accent text-white" : "bg-panel-3")}>{i < step || result ? <Check className="size-4" /> : i + 1}</span>
              <span className="font-medium">{s}</span>
            </button>
          </li>
        ))}
      </ol>

      <AnimatePresence mode="wait">
        <motion.div key={result ? "done" : step} initial={reduce ? false : { opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.22 }}>
          {result && person ? (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <span className="flex size-16 animate-float items-center justify-center rounded-full bg-ok-soft text-ok"><Check className="size-8" /></span>
              <h3 className="text-2xl font-bold">{result.ok.length ? `${person.name} now has ${result.ok.length} new task${result.ok.length === 1 ? "" : "s"}` : "Nothing was assigned"}</h3>
              {result.ok.length > 0 && <p className="text-[15px] text-muted">{result.ok.join(", ")}. Their tasks now show their name on the board.</p>}
              {result.failed.length > 0 && <p className="text-[15px] text-danger">Could not assign {result.failed.join(", ")}. The message at the bottom of the screen says why.</p>}
              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <Button variant="primary" onClick={() => onEmail(person.id)}><Mail /> Email {person.name.split(" ")[0]} their task list</Button>
                <Button onClick={reset}><UserPlus /> Assign someone else</Button>
              </div>
            </div>
          ) : step === 0 ? (
            <div className="space-y-4">
              <p className="text-[16px] text-fg-2">Who are you giving work to?</p>
              {people.length ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {people.map((p) => {
                    const t = p.primaryTrackId ? track.get(p.primaryTrackId) : null;
                    const n = openCount(p.id);
                    return (
                      <button key={p.id} onClick={() => choosePerson(p)} className={cn("lift flex items-center gap-4 rounded-xl border bg-panel-2 p-4 text-left", personId === p.id ? "border-accent" : "border-line hover:border-line-strong")}>
                        <Avatar name={p.name} color={p.color} size={44} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[16px] font-semibold">{p.name}{p.isDemo && <span className="ml-1 text-xs font-normal text-muted">(demo)</span>}</div>
                          <div className="text-[13px] text-muted">{t ? `${t.emoji} ${t.shortName}` : "No category yet"} · {ROLE_LABEL[p.role]}</div>
                          <div className={cn("mt-1 text-[13px]", n ? "text-fg-2" : "text-info")}>{n ? `On ${n} open task${n === 1 ? "" : "s"}` : "Free: no tasks yet"}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[15px] text-muted">There&apos;s nobody to assign yet.</p>
              )}
              <button onClick={onAddPerson} className="flex items-center gap-2 text-[15px] font-medium text-info hover:underline"><UserPlus className="size-4" /> Someone missing? Add them first</button>
            </div>
          ) : step === 1 && person ? (
            <div className="space-y-5">
              <p className="text-[16px] text-fg-2">
                Tick the tasks for <b>{person.name}</b>. Their profile says they&apos;re <b>{EXPERIENCE[person.experience]}</b>, so tasks marked <Badge tone="ok">Good first pick</Badge> suit them best.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {(["all", ...tracks.map((t) => t.id)] as const).map((id) => {
                  const t = id === "all" ? null : track.get(id);
                  return (
                    <button key={id} onClick={() => setCat(id)} className={cn("rounded-full border px-3 py-1.5 text-[14px]", cat === id ? "border-accent/50 bg-accent-soft text-fg" : "border-line text-fg-2 hover:border-line-strong")}>
                      {t ? `${t.emoji} ${t.shortName}` : "All categories"}
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <div className="relative w-full max-w-sm">
                  <Search className="pointer-events-none absolute top-3.5 left-3.5 size-4 text-faint" />
                  <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or code" className="pl-10" aria-label="Search tasks to assign" />
                </div>
                <label className="flex items-center gap-2 text-[14px] text-fg-2"><input type="checkbox" checked={showOwned} onChange={(e) => setShowOwned(e.target.checked)} className="size-4" /> Also show tasks that already have an owner</label>
              </div>
              <ul className="max-h-[480px] space-y-2 overflow-y-auto pr-1">
                {candidates.map((t) => {
                  const mine = t.assignees.some((a) => a.memberId === person.id);
                  const owner = t.assignees.find((a) => a.role === "owner");
                  const on = picked.includes(t.id);
                  const fit = t.status === "available" && !t.missingDeps.length && DIFFICULTIES.indexOf(t.difficulty) <= FIT[person.experience];
                  return (
                    <li key={t.id}>
                      <label className={cn("flex cursor-pointer items-start gap-4 rounded-xl border p-4 transition-colors", mine ? "cursor-not-allowed opacity-50" : on ? "border-accent bg-accent-soft" : "border-line bg-panel-2 hover:border-line-strong")}>
                        <input type="checkbox" className="mt-1 size-5 accent-[var(--accent)]" disabled={mine} checked={on} onChange={() => setPicked(on ? picked.filter((x) => x !== t.id) : [...picked, t.id])} aria-label={`Pick ${t.key}`} />
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-[13px] text-muted"><span aria-hidden className="mr-1 font-sans">{track.get(t.trackId)?.emoji}</span>{t.key}</span>
                            <span className="text-[16px] font-semibold text-fg">{t.title}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted">
                            <span>{track.get(t.trackId)?.name}</span>
                            <DifficultyMeter difficulty={t.difficulty} />
                            <span>about {t.estimateHours} h</span>
                            {owner && <span>Owner: {member.get(owner.memberId)?.name ?? "someone"}</span>}
                            {t.missingDeps.length > 0 && <span className="text-warn" title={`Unfinished: ${t.missingDeps.join(", ")}`}>Can&apos;t start until {t.missingDeps.length} other task{t.missingDeps.length === 1 ? " is" : "s are"} done</span>}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <StatusBadge status={t.status} />
                          {mine ? <Badge>Already on it</Badge> : fit && <Badge tone="ok">Good first pick</Badge>}
                        </div>
                      </label>
                    </li>
                  );
                })}
                {!candidates.length && <li className="rounded-xl border border-dashed border-line py-10 text-center text-[15px] text-muted">No unowned tasks here. Try another category or tick “Also show tasks that already have an owner”.</li>}
              </ul>
              <Nav back={() => setStep(0)} next={() => setStep(2)} nextDisabled={!picked.length} nextLabel={picked.length ? `Continue with ${picked.length} task${picked.length === 1 ? "" : "s"}` : "Pick at least one task"} />
            </div>
          ) : step === 2 && person ? (
            <div className="space-y-5">
              <p className="text-[16px] text-fg-2">What should {person.name.split(" ")[0]} be on {picked.length === 1 ? "this task" : "these tasks"}?</p>
              <div className="grid gap-4 md:grid-cols-2">
                {([
                  ["owner", <Crown key="o" />, "Owner", "Responsible for finishing it. Each task has one owner; if someone else owned it, they become a helper. An available task moves to “Assigned”."],
                  ["contributor", <HandHelping key="c" />, "Contributor", "Helps the owner. A task can have several contributors. Its status doesn't change."],
                ] as const).map(([id, icon, label, desc]) => (
                  <button key={id} onClick={() => setRole(id)} className={cn("lift flex gap-4 rounded-xl border p-5 text-left", role === id ? "border-accent bg-accent-soft" : "border-line bg-panel-2 hover:border-line-strong")} aria-pressed={role === id}>
                    <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-lg [&_svg]:size-5", role === id ? "bg-accent text-white" : "bg-panel-3 text-muted")}>{icon}</span>
                    <span>
                      <span className="block text-[17px] font-semibold">{label}</span>
                      <span className="mt-1 block text-[14px] text-muted">{desc}</span>
                    </span>
                  </button>
                ))}
              </div>
              <label className="block space-y-1.5">
                <span className="text-[15px] font-medium">What exactly are they doing? <span className="font-normal text-muted">(optional)</span></span>
                <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="e.g. Write the calibration launch file" />
              </label>
              <Nav back={() => setStep(1)} next={() => setStep(3)} nextLabel="Review" />
            </div>
          ) : step === 3 && person ? (
            <div className="space-y-5">
              <div className="flex items-center gap-4 rounded-xl border border-line bg-panel-2 p-5">
                <Avatar name={person.name} color={person.color} size={48} />
                <div className="flex-1">
                  <div className="text-[18px] font-semibold">{person.name}</div>
                  <div className="text-[14px] text-muted">will be the <b className="text-fg">{role === "owner" ? "owner" : "contributor"}</b> of {chosen.length} task{chosen.length === 1 ? "" : "s"}{note && <> · “{note}”</>}</div>
                </div>
              </div>
              <ul className="space-y-2">
                {chosen.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 rounded-lg border border-line px-4 py-3">
                    <TaskLink k={t.key} title={t.title} wrap className="min-w-0 flex-1 text-[15px]" />
                    <span className="text-[13px] text-muted">about {t.estimateHours} h</span>
                  </li>
                ))}
              </ul>
              <div className="space-y-2 rounded-xl border border-line p-5">
                <div className="flex justify-between text-[15px]"><span>Estimated work</span><b>{hours} hours total</b></div>
                <GrowBar value={Math.min(100, (hours / Math.max(1, person.availabilityHours * 4)) * 100)} color={hours > person.availabilityHours * 4 ? "var(--warn)" : "var(--ok)"} />
                <p className="text-[13px] text-muted">
                  They said they have about {person.availabilityHours} h a week, so this is roughly {Math.max(1, Math.round(hours / Math.max(1, person.availabilityHours)))} week{Math.round(hours / Math.max(1, person.availabilityHours)) === 1 ? "" : "s"} of work.
                  {hours > person.availabilityHours * 4 && " That's more than a month; consider fewer tasks."}
                </p>
              </div>
              <Nav back={() => setStep(2)} next={assign} nextDisabled={busy} nextLabel={busy ? "Assigning…" : `Assign ${chosen.length} task${chosen.length === 1 ? "" : "s"}`} primaryIcon={<Check />} />
            </div>
          ) : null}
        </motion.div>
      </AnimatePresence>
      <p className="mt-8 flex items-center gap-2 border-t border-line pt-4 text-[13px] text-muted">
        <Users className="size-4" /> You can also assign from any task page with the <b className="text-fg-2">Assign</b> button in its sidebar. <Link href="/guide/assigning" className="text-info hover:underline">Full guide →</Link>
      </p>
    </Card>
  );
}

function Nav({ back, next, nextLabel, nextDisabled, primaryIcon }: { back: () => void; next: () => void; nextLabel: string; nextDisabled?: boolean; primaryIcon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line pt-5">
      <Button variant="ghost" onClick={back}><ArrowLeft /> Back</Button>
      <Button variant="primary" onClick={next} disabled={nextDisabled}>{nextLabel} {primaryIcon ?? <ArrowRight />}</Button>
    </div>
  );
}

"use client";

import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Code2,
  Compass,
  FlaskConical,
  GraduationCap,
  Hammer,
  Hand,
  ListChecks,
  MessagesSquare,
  PlayCircle,
  Search,
  Target,
  UserCheck,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { CountUp, Reveal, Stagger, StaggerItem } from "@/components/ui/motion";
import { useWorkspace } from "@/components/workspace";
import { cn } from "@/lib/utils";

const MISSION = [
  { title: "Know where it is", body: "Fuse wheel odometry, IMU and LiDAR into one confident pose estimate.", track: "SF" },
  { title: "See the terrain", body: "Turn point clouds into a map of safe, risky and unknown ground.", track: "PM" },
  { title: "Drive to the dig zone", body: "Plan a safe path and follow it, replanning around new obstacles.", track: "NV" },
  { title: "Ask to excavate", body: "Mission logic requests a dig; the Controls team's software runs the motors.", track: "AG" },
  { title: "Return to the berm", body: "Navigate back and line up precisely before depositing.", track: "NV" },
  { title: "Deposit and repeat", body: "Request a dump, confirm it worked, then start the next cycle.", track: "AG" },
];

const LIFECYCLE: { name: string; icon: ReactNode; body: string; color: string }[] = [
  { name: "Available", icon: <Hand />, body: "Fully specified and ready. Anyone can read the guide; the lead assigns an owner.", color: "var(--info)" },
  { name: "Assigned", icon: <UserCheck />, body: "Someone owns it. They start with the walkthrough: why, concepts, reference code.", color: "var(--violet)" },
  { name: "Building", icon: <Hammer />, body: "Researching, designing and implementing, step by step, logging progress as they go.", color: "var(--violet)" },
  { name: "Testing", icon: <FlaskConical />, body: "Running the test plan in simulation and measuring the metrics the task defines.", color: "var(--warn)" },
  { name: "In review", icon: <ClipboardCheck />, body: "A reviewer checks the deliverables against the acceptance criteria and Definition of Done.", color: "var(--info)" },
  { name: "Completed", icon: <CheckCircle2 />, body: "Approved. It now counts toward mission readiness and unblocks the tasks that depend on it.", color: "var(--ok)" },
];

const ANATOMY: { icon: ReactNode; title: string; body: string }[] = [
  { icon: <Compass />, title: "Guided walkthrough", body: "The big red banner. Opens a step-by-step mode that walks you through the whole task." },
  { icon: <Target />, title: "Why this matters", body: "The problem, the goal, and which other tasks depend on your work." },
  { icon: <BookOpen />, title: "Understand first", body: "Concepts to learn, each with hand-picked tutorials and videos." },
  { icon: <Search />, title: "Study implementations", body: "Real code from other Lunabotics teams, with what to look for and questions to answer." },
  { icon: <ListChecks />, title: "Implementation steps", body: "A checklist that breaks the build into small, concrete steps." },
  { icon: <Code2 />, title: "Practical guidance", body: "Package layout, ROS topics in and out, parameters, snippets and pitfalls." },
  { icon: <FlaskConical />, title: "Test · Measure · Document", body: "How to prove it works, with the exact metrics to report." },
  { icon: <MessagesSquare />, title: "Discussion & log", body: "Questions and progress stay with the task for the next person." },
];

export function StartClient({ firstByTrack, counts }: { firstByTrack: Record<string, { key: string; title: string } | null>; counts: { tasks: number; resources: number; paths: number; videos: number } }) {
  const { tracks } = useWorkspace();
  return (
    <div className="mx-auto max-w-[1200px] space-y-20 px-4 py-10 sm:px-8">
      <Reveal className="space-y-6 text-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 180, damping: 14 }} className="mx-auto flex size-20 animate-float items-center justify-center rounded-2xl bg-accent text-white shadow-xl">
          <Compass className="size-10" />
        </motion.div>
        <h1 className="text-4xl font-bold sm:text-5xl">
          Welcome to the <span className="text-shimmer">Autonomy Team</span>
        </h1>
        <p className="mx-auto max-w-2xl text-[18px] leading-relaxed text-fg-2">
          We write the software that lets Illinois Tech&apos;s NASA Lunabotics rover dig and dump lunar regolith on its own. This 2-minute tour shows what the rover has to do, how work is organized, and how to start contributing.
        </p>
        <div className="mx-auto grid max-w-2xl grid-cols-2 gap-4 pt-4 sm:grid-cols-4">
          {[
            ["guided tasks", counts.tasks],
            ["learning paths", counts.paths],
            ["resources", counts.resources],
            ["verified videos", counts.videos],
          ].map(([label, n]) => (
            <div key={label} className="rounded-lg border border-line bg-panel/80 p-4">
              <div className="text-3xl font-bold">
                <CountUp value={n as number} />
              </div>
              <div className="text-[14px] text-muted">{label}</div>
            </div>
          ))}
        </div>
      </Reveal>

      <Section n={1} title="What the rover has to do by itself" sub="One autonomous cycle. Hover or tap a stage to see which category builds it.">
        <MissionLoop />
      </Section>

      <Section n={2} title="Five categories, one per Discord channel" sub="Every task belongs to exactly one. Pick the one that excites you.">
        <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tracks.map((t) => (
            <StaggerItem key={t.id}>
              <div className="lift flex h-full flex-col gap-3 rounded-lg border border-line bg-panel/90 p-6 shadow-[var(--shadow)]" style={{ borderTop: `4px solid ${t.color}` }}>
                <div className="flex items-center gap-3">
                  <span className="text-4xl" aria-hidden>
                    {t.emoji}
                  </span>
                  <div>
                    <h3 className="text-[18px] font-semibold">{t.name}</h3>
                    <p className="font-mono text-[13px] text-muted">#{t.discordChannel}</p>
                  </div>
                </div>
                <p className="flex-1 text-[15px] leading-relaxed text-fg-2">{t.mission}</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Link href={`/tracks/${t.id}`} className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-2 text-[14px] hover:border-line-strong">
                    See tasks <ArrowRight className="size-4" />
                  </Link>
                  {firstByTrack[t.id] && (
                    <Link href={`/tasks/${firstByTrack[t.id]!.key}`} className="inline-flex items-center gap-1.5 rounded-md bg-accent-soft px-3 py-2 text-[14px] text-accent hover:bg-accent/20">
                      <PlayCircle className="size-4" /> Starter: {firstByTrack[t.id]!.key}
                    </Link>
                  )}
                </div>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </Section>

      <Section n={3} title="How a task moves from idea to done" sub="Click each stage. Completion only counts after a reviewer approves the work.">
        <Lifecycle />
      </Section>

      <Section n={4} title="How to read a task page" sub="Every task follows the same layout, so once you know one you know them all.">
        <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ANATOMY.map((a, i) => (
            <StaggerItem key={a.title}>
              <div className="lift h-full rounded-lg border border-line bg-panel/90 p-5 shadow-[var(--shadow)]">
                <div className="mb-3 flex items-center gap-3">
                  <span className={cn("flex size-10 items-center justify-center rounded-md [&_svg]:size-5", i === 0 ? "bg-accent text-white" : "bg-panel-3 text-fg-2")}>{a.icon}</span>
                  <span className="text-[13px] font-semibold text-faint">{String(i + 1).padStart(2, "0")}</span>
                </div>
                <h3 className="text-[16px] font-semibold">{a.title}</h3>
                <p className="mt-1 text-[14px] leading-relaxed text-muted">{a.body}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </Section>

      <Reveal>
        <div className="relative overflow-hidden rounded-xl border border-accent/30 bg-gradient-to-br from-accent-soft via-panel to-panel p-10 text-center shadow-[var(--shadow)]">
          <h2 className="text-3xl font-bold">Ready to build something?</h2>
          <p className="mx-auto mt-2 max-w-xl text-[17px] text-fg-2">Learn the basics with a short path, or jump straight into a starter task. The walkthrough will guide you.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/learn" className="inline-flex h-12 items-center gap-2 rounded-md border border-line bg-panel px-6 text-[16px] font-medium hover:border-line-strong">
              <GraduationCap className="size-5" /> Learning paths
            </Link>
            <Link href="/" className="group inline-flex h-12 items-center gap-2 rounded-md bg-accent px-6 text-[16px] font-semibold text-white hover:brightness-110">
              Good first tasks <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </Reveal>
    </div>
  );
}

function Section({ n, title, sub, children }: { n: number; title: string; sub: string; children: ReactNode }) {
  return (
    <section className="space-y-8">
      <Reveal className="flex items-start gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-accent text-xl font-bold text-accent">{n}</span>
        <div>
          <h2 className="text-3xl font-bold">{title}</h2>
          <p className="mt-1 text-[16px] text-muted">{sub}</p>
        </div>
      </Reveal>
      {children}
    </section>
  );
}

function MissionLoop() {
  const { tracks } = useWorkspace();
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);
  const [hovering, setHovering] = useState(false);
  useEffect(() => {
    if (hovering || reduce) return;
    const id = setInterval(() => setActive((a) => (a + 1) % MISSION.length), 2600);
    return () => clearInterval(id);
  }, [hovering, reduce]);
  const R = 150;
  const track = tracks.find((t) => t.id === MISSION[active].track);
  return (
    <div className="grid items-center gap-10 lg:grid-cols-[400px_minmax(0,1fr)]">
      <div className="relative mx-auto size-[360px]" onMouseLeave={() => setHovering(false)}>
        <svg viewBox="0 0 360 360" className="absolute inset-0" aria-hidden>
          <circle cx="180" cy="180" r={R} fill="none" stroke="var(--line-strong)" strokeWidth="2" className="animate-dash" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-5xl" aria-hidden>
            🛰️
          </span>
          <span className="mt-1 text-[13px] font-semibold tracking-wider text-muted uppercase">Autonomy loop</span>
        </div>
        {MISSION.map((m, i) => {
          const a = (i / MISSION.length) * 2 * Math.PI - Math.PI / 2;
          const x = 180 + R * Math.cos(a);
          const y = 180 + R * Math.sin(a);
          const t = tracks.find((tr) => tr.id === m.track);
          return (
            <button
              key={m.title}
              onMouseEnter={() => {
                setHovering(true);
                setActive(i);
              }}
              onFocus={() => setActive(i)}
              onClick={() => setActive(i)}
              className={cn("absolute flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 bg-panel text-2xl transition-all duration-300", i === active ? "scale-125 shadow-lg" : "opacity-70 hover:opacity-100")}
              style={{ left: x, top: y, borderColor: i === active ? t?.color : "var(--line)" }}
              aria-label={`Stage ${i + 1}: ${m.title}`}
            >
              {t?.emoji}
              <span className="absolute -top-1 -right-1 flex size-6 items-center justify-center rounded-full bg-panel-3 text-xs font-bold text-fg-2">{i + 1}</span>
            </button>
          );
        })}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={active} initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} transition={{ duration: 0.3 }} className="rounded-xl border border-line bg-panel/90 p-8 shadow-[var(--shadow)]">
          <div className="text-[14px] font-semibold tracking-wider text-muted uppercase">Stage {active + 1} of {MISSION.length}</div>
          <h3 className="mt-2 text-3xl font-bold">{MISSION[active].title}</h3>
          <p className="mt-3 text-[18px] leading-relaxed text-fg-2">{MISSION[active].body}</p>
          {track && (
            <Link href={`/tracks/${track.id}`} className="mt-6 inline-flex items-center gap-3 rounded-lg border border-line bg-panel-2 px-4 py-3 hover:border-line-strong">
              <span className="text-2xl" aria-hidden>
                {track.emoji}
              </span>
              <span>
                <span className="block text-[13px] text-muted">Built by</span>
                <span className="block text-[16px] font-semibold">{track.name}</span>
              </span>
              <ArrowRight className="size-4 text-muted" />
            </Link>
          )}
          <div className="mt-6 flex gap-1.5">
            {MISSION.map((_, i) => (
              <span key={i} className={cn("h-1.5 flex-1 rounded-full transition-colors duration-500", i <= active ? "bg-accent" : "bg-panel-3")} />
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Lifecycle() {
  const [active, setActive] = useState(0);
  const reduce = useReducedMotion();
  return (
    <div className="space-y-6">
      <div className="relative grid grid-cols-3 gap-y-6 md:grid-cols-6">
        <div className="absolute top-8 right-[8%] left-[8%] hidden h-1 rounded-full bg-panel-3 md:block" aria-hidden>
          <motion.div className="h-full rounded-full bg-accent" animate={{ width: `${(active / (LIFECYCLE.length - 1)) * 100}%` }} transition={{ duration: 0.5 }} />
        </div>
        {LIFECYCLE.map((s, i) => (
          <button key={s.name} onClick={() => setActive(i)} className="group relative flex flex-col items-center gap-2 text-center" aria-pressed={i === active}>
            <motion.span
              animate={{ scale: i === active ? 1.15 : 1 }}
              className={cn("relative z-10 flex size-16 items-center justify-center rounded-full border-2 bg-panel transition-colors [&_svg]:size-7", i <= active ? "text-white" : "text-muted group-hover:text-fg")}
              style={{ borderColor: i <= active ? s.color : "var(--line)", background: i <= active ? s.color : undefined }}
            >
              {s.icon}
            </motion.span>
            <span className={cn("text-[15px] font-medium", i === active ? "text-fg" : "text-muted")}>{s.name}</span>
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={active} initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="mx-auto max-w-2xl rounded-xl border border-line bg-panel/90 p-6 text-center shadow-[var(--shadow)]">
          <h3 className="text-xl font-semibold" style={{ color: LIFECYCLE[active].color }}>
            {LIFECYCLE[active].name}
          </h3>
          <p className="mt-2 text-[17px] leading-relaxed text-fg-2">{LIFECYCLE[active].body}</p>
          <div className="mt-4 flex justify-center gap-3">
            <button onClick={() => setActive((a) => Math.max(0, a - 1))} disabled={active === 0} className="rounded-md border border-line px-4 py-2 text-[14px] hover:bg-panel-2 disabled:opacity-40">
              ← Previous
            </button>
            <button onClick={() => setActive((a) => Math.min(LIFECYCLE.length - 1, a + 1))} disabled={active === LIFECYCLE.length - 1} className="rounded-md bg-accent px-4 py-2 text-[14px] font-medium text-white hover:brightness-110 disabled:opacity-40">
              Next stage →
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

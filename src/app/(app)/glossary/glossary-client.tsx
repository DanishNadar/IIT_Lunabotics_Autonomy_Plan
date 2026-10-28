"use client";

import { BookA, Search } from "lucide-react";
import { useState } from "react";
import { Reveal, Stagger, StaggerItem } from "@/components/ui/motion";
import { Input } from "@/components/ui/primitives";
import { useWorkspace } from "@/components/workspace";
import { GLOSSARY, type Term } from "@/lib/glossary";
import { cn } from "@/lib/utils";

const GROUPS: { id: Term["group"]; title: string; sub: string }[] = [
  { id: "Board", title: "How this board works", sub: "Words you'll see on tasks, cards and the dashboard." },
  { id: "Robotics", title: "Robotics", sub: "The ideas behind the tasks." },
  { id: "Software", title: "Software & tools", sub: "What the code runs on and how we work together." },
];

export function GlossaryClient() {
  const { tracks } = useWorkspace();
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const match = (t: Term) => !needle || [t.term, t.meaning, ...(t.aka ?? [])].some((s) => s.toLowerCase().includes(needle));

  return (
    <div className="mx-auto max-w-[1100px] space-y-14 px-4 py-10 sm:px-8">
      <Reveal className="space-y-4">
        <span className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-[14px] font-medium text-accent"><BookA className="size-4" /> Glossary</span>
        <h1 className="text-4xl font-bold">Every code and term, in plain English</h1>
        <p className="max-w-2xl text-[17px] text-fg-2">New to robotics or to this board? Look anything up here. Hovering over a task code anywhere on the site also tells you what it means.</p>
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute top-3.5 left-3.5 size-4 text-faint" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a word, like SLAM or owner" className="pl-10" aria-label="Search the glossary" />
        </div>
      </Reveal>

      {!needle && (
        <section className="space-y-5">
          <div>
            <h2 className="text-2xl font-bold">Task codes</h2>
            <p className="mt-1 text-[16px] text-muted">The letters at the start of a task code tell you its category. The number is just its position in that category&apos;s list.</p>
          </div>
          <div className="rounded-2xl border border-line bg-panel/80 p-6 text-center">
            <div className="inline-flex items-baseline gap-1 font-mono text-5xl font-bold">
              <span style={{ color: tracks.find((t) => t.id === "SF")?.color }}>SF</span>
              <span className="text-faint">-</span>
              <span className="text-fg">01</span>
            </div>
            <div className="mt-3 flex justify-center gap-10 text-[15px] text-muted">
              <span>↑ category: Sensor Fusion</span>
              <span>↑ task number 1</span>
            </div>
          </div>
          <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tracks.map((t) => (
              <StaggerItem key={t.id}>
                <div className="lift h-full rounded-xl border border-line bg-panel/90 p-5">
                  <div className="flex items-center gap-3">
                    <span className="rounded-lg px-2.5 py-1 font-mono text-xl font-bold" style={{ color: t.color, background: `${t.color}1f` }}>{t.id}</span>
                    <span className="text-2xl" aria-hidden>{t.emoji}</span>
                  </div>
                  <div className="mt-3 text-[17px] font-semibold">{t.name}</div>
                  <p className="mt-1 text-[14px] text-muted">{t.mission}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </section>
      )}

      {GROUPS.map((g) => {
        const terms = GLOSSARY.filter((t) => t.group === g.id && match(t));
        if (!terms.length) return null;
        return (
          <section key={g.id} className="space-y-5">
            <div>
              <h2 className="text-2xl font-bold">{g.title}</h2>
              <p className="mt-1 text-[16px] text-muted">{g.sub}</p>
            </div>
            <dl className="grid gap-4 md:grid-cols-2">
              {terms.map((t) => (
                <div key={t.term} className={cn("rounded-xl border border-line bg-panel/90 p-5")}>
                  <dt className="text-[17px] font-semibold text-fg">{t.term}</dt>
                  <dd className="mt-1.5 text-[15px] leading-relaxed text-fg-2">{t.meaning}</dd>
                </div>
              ))}
            </dl>
          </section>
        );
      })}
      {needle && !GLOSSARY.some(match) && <p className="text-[16px] text-muted">Nothing matches “{q}”. Try a shorter word.</p>}
    </div>
  );
}

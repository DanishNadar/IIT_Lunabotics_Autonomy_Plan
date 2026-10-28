"use client";

import { ArrowRight, Crown, HandHelping, KeyRound, ListChecks, Mail, MousePointerClick, ShieldCheck, Telescope, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Reveal, Stagger, StaggerItem } from "@/components/ui/motion";
import { buttonClass } from "@/components/ui/primitives";
import { Step } from "@/components/ui/tabs";
import { useWorkspace } from "@/components/workspace";

const STAGES = [
  ["Available", "Ready, nobody owns it", "var(--info)"],
  ["Assigned", "Has an owner", "var(--violet)"],
  ["Researching → Implementing → Testing", "The owner is working", "var(--accent)"],
  ["In review", "A lead checks the result", "var(--info)"],
  ["Completed", "Done and approved", "var(--ok)"],
] as const;

export function AssigningGuide() {
  const { actor } = useWorkspace();
  const isAdmin = actor.role === "admin";
  return (
    <div className="mx-auto max-w-[1000px] space-y-16 px-4 py-10 sm:px-8">
      <Reveal className="space-y-4">
        <span className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-[14px] font-medium text-accent"><Users className="size-4" /> Guide for leads</span>
        <h1 className="text-4xl font-bold">How to assign tasks</h1>
        <p className="max-w-2xl text-[17px] leading-relaxed text-fg-2">Giving someone work takes about a minute. This page walks you through it from the start, then explains what happens afterwards.</p>
        <Link href="/admin" className={buttonClass("primary", "md")}>{isAdmin ? "Go to the assign page" : "Open the admin page"} <ArrowRight /></Link>
      </Reveal>

      <Section icon={<ShieldCheck />} title="Who can assign">
        <Stagger className="grid gap-4 md:grid-cols-3">
          {[
            ["Admin", "Anyone with the admin password. Can assign any task to anyone."],
            ["Track lead", "Runs one category (like Sensor Fusion) and can assign tasks in it."],
            ["Members", "Can ask for a task themselves from its page. Depending on settings, it's theirs right away or a lead approves it."],
          ].map(([t, d]) => (
            <StaggerItem key={t}>
              <div className="h-full rounded-xl border border-line bg-panel/90 p-5">
                <div className="text-[17px] font-semibold">{t}</div>
                <p className="mt-1 text-[15px] text-muted">{d}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </Section>

      <Section icon={<ListChecks />} title="Step by step">
        <ol className="space-y-8">
          <Step n={1} title={<span className="flex items-center gap-2"><KeyRound className="size-4 text-muted" /> Unlock the admin page</span>}>
            <p>Go to <Link href="/admin" className="text-info hover:underline">/admin</Link> and type the admin password. Ask the team lead if you don&apos;t have it. Nobody else sees the admin page or its button.</p>
          </Step>
          <Step n={2} title={<span className="flex items-center gap-2"><UserPlus className="size-4 text-muted" /> Add the person, if they&apos;re new</span>}>
            <p>Open the <b>Team members</b> tab. Fill in their name, main category and email address, then press <b>Add member</b>. The email is only used to send them their task list.</p>
          </Step>
          <Step n={3} title={<span className="flex items-center gap-2"><MousePointerClick className="size-4 text-muted" /> Use the “Assign tasks” tab</span>}>
            <p>It takes you through four screens:</p>
            <ol className="list-decimal space-y-1 pl-5">
              <li><b>Pick a person.</b> Each card shows how many open tasks they already have.</li>
              <li><b>Pick tasks.</b> The list starts on their category and shows only tasks nobody owns. For newcomers choose tasks marked <i>Good first pick</i>. A task that says <i>Can&apos;t start until …</i> needs other tasks finished first.</li>
              <li><b>Choose their role:</b> owner or contributor (explained below).</li>
              <li><b>Review & assign.</b> You&apos;ll see the total estimated hours compared with the time they said they have each week.</li>
            </ol>
          </Step>
          <Step n={4} title={<span className="flex items-center gap-2"><Mail className="size-4 text-muted" /> Tell them</span>}>
            <p>Right after assigning, press <b>Email … their task list</b>, or open the <b>Email task lists</b> tab any time. You get a preview of the email: every task with its full name, category, their role, the first step, and a link. Press <b>Open in Gmail</b> or <b>Open in my email app</b> to send it yourself. If the server is set up for email, <b>Send</b> sends to everyone you ticked at once.</p>
          </Step>
          <Step n={5} title={<span className="flex items-center gap-2"><Telescope className="size-4 text-muted" /> Keep an eye on it</span>}>
            <p>Their name now appears on the task everywhere on the board. The Overview&apos;s <b>Needs attention</b> tab flags important tasks with no owner, blocked work, and members asking for tasks.</p>
          </Step>
        </ol>
        <div className="rounded-xl border border-line bg-panel-2 p-5 text-[15px] text-fg-2">
          <b className="text-fg">Shortcut:</b> on any task page, the <b>People</b> box on the right has an <b>Assign</b> button. Use it when you&apos;re already looking at a task. The small × next to a name removes them.
        </div>
      </Section>

      <Section icon={<Crown />} title="Owner or contributor?">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-line bg-panel/90 p-5">
            <div className="flex items-center gap-2 text-[17px] font-semibold"><Crown className="size-5 text-accent" /> Owner</div>
            <p className="mt-2 text-[15px] text-fg-2">The one person responsible for finishing the task. Each task has one owner. Picking a new owner turns the previous one into a contributor.</p>
          </div>
          <div className="rounded-xl border border-line bg-panel/90 p-5">
            <div className="flex items-center gap-2 text-[17px] font-semibold"><HandHelping className="size-5 text-info" /> Contributor</div>
            <p className="mt-2 text-[15px] text-fg-2">Helps the owner with part of the work. A task can have several. Add a short note saying what they&apos;re doing, like “writes the tests”.</p>
          </div>
        </div>
      </Section>

      <Section icon={<ArrowRight />} title="What happens to the task afterwards">
        <ol className="grid gap-3 md:grid-cols-5">
          {STAGES.map(([name, desc, color], i) => (
            <li key={name} className="relative rounded-xl border border-line bg-panel/90 p-4">
              <span className="mb-2 block h-1.5 w-10 rounded-full" style={{ background: color }} />
              <div className="text-[15px] font-semibold">{name}</div>
              <div className="mt-1 text-[13px] text-muted">{desc}</div>
              {i < STAGES.length - 1 && <ArrowRight className="absolute top-1/2 -right-3 hidden size-4 -translate-y-1/2 text-faint md:block" />}
            </li>
          ))}
        </ol>
        <p className="text-[15px] text-muted">
          Giving a task an owner moves it from <i>Available</i> to <i>Assigned</i> automatically. If it still waits on another task, it keeps its current status until that one is done. Not sure what a word means? See the <Link href="/glossary" className="text-info hover:underline">glossary</Link>.
        </p>
      </Section>

      <Section icon={<ListChecks />} title="Tips for handing out work">
        <ul className="grid gap-3 md:grid-cols-2">
          {[
            "Give newcomers one task first. Add more once they've finished it.",
            "Keep each person to about a month of work at a time; the review screen shows the estimate.",
            "Prefer tasks marked Available: they can start today.",
            "Pair a newcomer as a contributor with an experienced owner on harder tasks.",
            "Every task page has a guided walkthrough, so point people to “Start walkthrough”.",
            "Re-send the task list email whenever you change someone's tasks.",
          ].map((t) => (
            <li key={t} className="rounded-xl border border-line bg-panel/90 px-5 py-4 text-[15px] text-fg-2">{t}</li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <Reveal className="space-y-5">
      <h2 className="flex items-center gap-3 text-2xl font-bold">
        <span className="flex size-10 items-center justify-center rounded-lg bg-accent-soft text-accent [&_svg]:size-5">{icon}</span>
        {title}
      </h2>
      {children}
    </Reveal>
  );
}

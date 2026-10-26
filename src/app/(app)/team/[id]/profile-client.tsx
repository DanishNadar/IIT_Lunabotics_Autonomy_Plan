"use client";

import { Ago } from "@/components/ui/time";
import { Pencil } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { StatusBadge, TaskLink, TrackChip } from "@/components/tasks/bits";
import { Dialog } from "@/components/ui/overlay";
import { Avatar, Badge, Button, Field, Input, Panel, PanelHeader, Progress, Select, Stat, Textarea } from "@/components/ui/primitives";
import { useCommand } from "@/components/use-command";
import { useCan, useWorkspace } from "@/components/workspace";
import { ROLE_LABEL, type AuditEvent, type PublicMember, type TrackId } from "@/lib/domain/types";
import type { TaskSummary } from "@/lib/domain/views";
import { loadLabel, type Workload } from "@/lib/domain/workload";


export function ProfileClient({ member: m, tasks, workload, activity, paths, reviews, logs }: { member: PublicMember; tasks: TaskSummary[]; workload: Workload; activity: AuditEvent[]; paths: { slug: string; title: string; done: number; total: number }[]; reviews: number; logs: number }) {
  const { actor } = useWorkspace();
  const can = useCan();
  const self = actor.id === m.id;
  const wl = loadLabel(workload.load);
  return (
    <div className="mx-auto max-w-[1200px] space-y-4 p-4">
      <Panel className="p-4">
        <div className="flex flex-wrap items-start gap-4">
          <Avatar name={m.name} color={m.avatarColor} size={56} />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold">{m.name}</h1>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[13px] text-muted">
              <span>{ROLE_LABEL[m.role]}</span>
              {m.isDemo && <Badge tone="warn">demo account — not a real person</Badge>}
              {m.leadTrackIds.map((t) => <Badge key={t} tone="accent">Leads {t}</Badge>)}
              {m.email && <span>· {m.email}</span>}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-[13px]">
              {m.primaryTrackId && <span>Preferred: <TrackChip trackId={m.primaryTrackId} withName /></span>}
              {m.secondaryTrackId && <span>Secondary: <TrackChip trackId={m.secondaryTrackId} withName /></span>}
              {m.githubUsername && <a href={`https://github.com/${m.githubUsername}`} className="font-mono text-info" target="_blank" rel="noreferrer">github.com/{m.githubUsername}</a>}
              {m.discordHandle && <span className="text-muted">Discord: {m.discordHandle}</span>}
            </div>
            {m.bio && <p className="mt-2 max-w-2xl text-[15px] text-fg-2">{m.bio}</p>}
            {m.skills.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{m.skills.map((s) => <Badge key={s}>{s}</Badge>)}</div>}
          </div>
          {(self || can("member.manage")) && <EditProfile member={m} />}
        </div>
      </Panel>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        <Stat label="Experience" value={<span className="text-base">{m.experience}</span>} />
        <Stat label="Availability" value={`${m.availabilityHours}h`} sub="per week (self-reported)" />
        <Stat label="Workload" value={<span className="text-base">{wl.label}</span>} sub={`~${workload.remainingHours}h remaining est.`} tone={wl.tone === "warn" ? "warn" : undefined} />
        <Stat label="Completed" value={tasks.filter((t) => t.status === "completed").length} />
        <Stat label="Reviews · logs" value={`${reviews} · ${logs}`} />
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Panel>
          <PanelHeader title="Assignments" />
          <ul className="divide-y divide-line">
            {tasks.map((t) => <li key={t.id} className="flex items-center gap-2 px-3 py-1.5 text-[13px]"><TrackChip trackId={t.trackId} /><TaskLink k={t.key} title={t.title} className="min-w-0 flex-1" /><span className="text-xs text-muted">{t.assignees.find((a) => a.memberId === m.id)?.role}</span><StatusBadge status={t.status} /></li>)}
            {!tasks.length && <li className="px-3 py-4 text-[13px] text-muted">No assignments.</li>}
          </ul>
        </Panel>
        <div className="space-y-4">
          <Panel>
            <PanelHeader title="Learning paths" />
            <ul className="divide-y divide-line">{paths.map((p) => <li key={p.slug}><Link href={`/learn/${p.slug}`} className="flex items-center gap-2 px-3 py-1.5 text-[13px] hover:bg-panel-2"><span className="flex-1 truncate">{p.title}</span><div className="w-20"><Progress value={(p.done / Math.max(1, p.total)) * 100} tone="ok" className="h-1" /></div><span className="font-mono text-xs text-muted">{p.done}/{p.total}</span></Link></li>)}</ul>
          </Panel>
          <Panel>
            <PanelHeader title="Recent activity" />
            <ul className="divide-y divide-line">
              {activity.map((a) => <li key={a.id} className="px-3 py-1.5 text-[13px]"><span className="text-fg-2">{a.href ? <Link href={a.href} className="hover:underline">{a.summary}</Link> : a.summary}</span><div className="text-xs text-faint"><Ago iso={a.createdAt} /></div></li>)}
              {!activity.length && <li className="px-3 py-4 text-[13px] text-muted">No activity yet.</li>}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function EditProfile({ member: m }: { member: PublicMember }) {
  const [open, setOpen] = useState(false);
  const { run, pending } = useCommand();
  const { tracks } = useWorkspace();
  return (
    <Dialog open={open} onOpenChange={setOpen} title="Edit profile" trigger={<Button><Pencil /> Edit profile</Button>} wide>
      <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const s = (k: string) => String(f.get(k) ?? "").trim();
        void run({ type: "profile.update", memberId: m.id, patch: { name: s("name"), primaryTrackId: (s("primary") || null) as TrackId | null, secondaryTrackId: (s("secondary") || null) as TrackId | null, githubUsername: s("github") || null, discordHandle: s("discord") || null, skills: s("skills").split(",").map((x) => x.trim()).filter(Boolean), experience: s("experience") as PublicMember["experience"], availabilityHours: Number(s("hours")), bio: s("bio") } }, { onSuccess: () => setOpen(false) });
      }}>
        <Field label="Name"><Input name="name" defaultValue={m.name} required minLength={2} /></Field>
        <Field label="GitHub username"><Input name="github" defaultValue={m.githubUsername ?? ""} pattern="[A-Za-z0-9-]{1,39}" /></Field>
        <Field label="Preferred track"><Select name="primary" defaultValue={m.primaryTrackId ?? ""}><option value="">—</option>{tracks.map((t) => <option key={t.id} value={t.id}>{t.id} — {t.name}</option>)}</Select></Field>
        <Field label="Secondary track"><Select name="secondary" defaultValue={m.secondaryTrackId ?? ""}><option value="">—</option>{tracks.map((t) => <option key={t.id} value={t.id}>{t.id} — {t.name}</option>)}</Select></Field>
        <Field label="Experience"><Select name="experience" defaultValue={m.experience}><option value="new">New to robotics</option><option value="some">Some experience</option><option value="experienced">Experienced</option></Select></Field>
        <Field label="Availability (hours / week)"><Input name="hours" type="number" min={0} max={60} defaultValue={m.availabilityHours} /></Field>
        <Field label="Discord (optional)"><Input name="discord" defaultValue={m.discordHandle ?? ""} /></Field>
        <Field label="Skills" hint="Comma separated"><Input name="skills" defaultValue={m.skills.join(", ")} /></Field>
        <Field label="Bio" className="sm:col-span-2"><Textarea name="bio" defaultValue={m.bio} /></Field>
        <div className="flex justify-end sm:col-span-2"><Button type="submit" variant="primary" disabled={pending}>Save</Button></div>
      </form>
    </Dialog>
  );
}

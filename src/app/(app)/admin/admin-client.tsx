"use client";

import { CheckCircle2, Database, Mail, RotateCcw, Settings, Shield, Sparkles, UserCog, UserPlus, Users, XCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { resetDemoData } from "@/app/actions/admin";
import { Reveal } from "@/components/ui/motion";
import { Avatar, Badge, Button, Field, Input, Panel, PanelHeader, Select } from "@/components/ui/primitives";
import { Step, TabBar, TabPanel, type TabDef } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { useCommand } from "@/components/use-command";
import { useWorkspace } from "@/components/workspace";
import type { AssignmentDigest } from "@/lib/domain/email";
import { ROLES, ROLE_LABEL, type AppSettings, type PublicMember, type Role, type TrackId } from "@/lib/domain/types";
import type { TaskSummary } from "@/lib/domain/views";
import { AssignWizard, type Person } from "./assign-wizard";
import { EmailPanel } from "./email-panel";

interface Props {
  members: PublicMember[];
  tasks: TaskSummary[];
  people: Person[];
  digests: AssignmentDigest[];
  settings: AppSettings;
  integrations: { storage: { kind: string; description: string; shared: boolean }; supabase: boolean; githubToken: boolean; adminPassword: boolean; discord: boolean; demoAccounts: boolean; sessionSecret: boolean; email: boolean };
  counts: { tasks: number; resources: number; documents: number; audit: number };
}

type TabId = "assign" | "email" | "team" | "settings";

function Status({ ok, label, hint }: { ok: boolean; label: string; hint: string }) {
  return (
    <li className="flex items-start gap-3 px-5 py-3 text-[15px]">
      {ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ok" /> : <XCircle className="mt-0.5 size-4 shrink-0 text-faint" />}
      <div><div className="text-fg">{label}</div><div className="text-[13px] text-muted">{hint}</div></div>
    </li>
  );
}

export function AdminClient({ members, tasks, people, digests, settings, integrations, counts }: Props) {
  const [tab, setTab] = useState<TabId>("assign");
  const [emailFocus, setEmailFocus] = useState<string | null>(null);
  const tabs: TabDef<TabId>[] = [
    { id: "assign", label: "Assign tasks", icon: <Sparkles /> },
    { id: "email", label: "Email task lists", icon: <Mail /> },
    { id: "team", label: "Team members", icon: <Users /> },
    { id: "settings", label: "Settings", icon: <Settings /> },
  ];
  return (
    <div className="mx-auto max-w-[1300px] space-y-8 px-4 py-8 sm:px-8">
      <Reveal>
        <h1 className="text-4xl font-bold">Administration</h1>
        <p className="mt-2 text-[17px] text-muted">Hand out work, let people know, and manage the team. Visitors never see this page.</p>
      </Reveal>
      <TabBar tabs={tabs} value={tab} onChange={setTab} label="Administration" />
      <TabPanel id={tab}>
        {tab === "assign" && (
          <div className="space-y-6">
            <HowAssigningWorks />
            <AssignWizard
              people={people}
              tasks={tasks}
              onAddPerson={() => setTab("team")}
              onEmail={(id) => {
                setEmailFocus(id);
                setTab("email");
              }}
            />
          </div>
        )}
        {tab === "email" && <EmailPanel people={people} digests={digests} configured={integrations.email} focus={emailFocus} />}
        {tab === "team" && <TeamTab members={members} />}
        {tab === "settings" && <SettingsTab settings={settings} integrations={integrations} counts={counts} />}
      </TabPanel>
    </div>
  );
}

function HowAssigningWorks() {
  return (
    <div className="rounded-xl border border-line bg-panel/90 p-6">
      <h2 className="text-[19px] font-semibold">How assigning works</h2>
      <p className="mt-1 text-[15px] text-muted">
        The short version. <Link href="/guide/assigning" className="text-info hover:underline">Read the full guide</Link> for the details.
      </p>
      <ol className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <Step n={1} title="Make sure they're on the team">Add new people under <b>Team members</b>, with their email address.</Step>
        <Step n={2} title="Give them tasks">Use the steps below. Start new members on tasks marked <i>Good first pick</i>.</Step>
        <Step n={3} title="Tell them">Under <b>Email task lists</b>, send each person their tasks with links.</Step>
        <Step n={4} title="Watch progress">Their tasks move across the board as they work. The Overview flags anything stuck.</Step>
      </ol>
    </div>
  );
}

function TeamTab({ members }: { members: PublicMember[] }) {
  const { run, pending } = useCommand();
  const { tracks, actor } = useWorkspace();
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <Panel>
        <PanelHeader title="Members & roles" icon={<UserCog />} subtitle="Change someone's role, email or whether they're active" />
        <ul className="divide-y divide-line">
          {members.map((m) => (
            <MemberRow key={m.id} m={m} self={m.id === actor.id} />
          ))}
        </ul>
      </Panel>

      <Panel className="self-start">
        <PanelHeader title="Add a team member" icon={<UserPlus />} subtitle="Members don't sign in; they appear on the board so you can assign them" />
        <form
          className="space-y-4 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const f = new FormData(form);
            void run(
              {
                type: "member.create",
                name: String(f.get("name")),
                role: f.get("role") as Role,
                primaryTrackId: (f.get("track") as TrackId) || null,
                leadTrackIds: f.getAll("tracks") as TrackId[],
                discordHandle: String(f.get("discord") || "") || null,
                githubUsername: String(f.get("github") || "") || null,
                email: String(f.get("email") || "").trim(),
              },
              { onSuccess: () => form.reset() },
            );
          }}
        >
          <Field label="Name"><Input name="name" required minLength={2} /></Field>
          <Field label="Email (optional)" hint="Only used to email them their task list. Only admins can see it."><Input name="email" type="email" placeholder="name@hawk.iit.edu" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Role"><Select name="role" defaultValue="member">{ROLES.filter((r) => r !== "admin").map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</Select></Field>
            <Field label="Main category"><Select name="track" defaultValue=""><option value="">Not decided</option>{tracks.map((t) => <option key={t.id} value={t.id}>{t.emoji} {t.shortName}</option>)}</Select></Field>
            <Field label="Discord (optional)"><Input name="discord" /></Field>
            <Field label="GitHub username (optional)"><Input name="github" /></Field>
          </div>
          <fieldset className="space-y-2 text-[14px]">
            <legend className="mb-1 text-muted">Leads these categories (only for the Track lead role):</legend>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {tracks.map((t) => <label key={t.id} className="flex items-center gap-2"><input type="checkbox" name="tracks" value={t.id} className="size-4" />{t.emoji} {t.shortName}</label>)}
            </div>
          </fieldset>
          <Button type="submit" variant="primary" disabled={pending}><UserPlus /> Add member</Button>
        </form>
      </Panel>
    </div>
  );
}

function SettingsTab({ settings, integrations, counts }: Pick<Props, "settings" | "integrations" | "counts">) {
  const { run, pending } = useCommand();
  const toast = useToast();
  const [busy, start] = useTransition();
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel className="self-start">
        <PanelHeader title="Application settings" icon={<Settings />} />
        <form className="space-y-4 p-5" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); void run({ type: "settings.update", patch: { organization: String(f.get("org")), team: String(f.get("team")), claimMode: f.get("claim") as AppSettings["claimMode"] } }); }}>
          <Field label="Organization"><Input name="org" defaultValue={settings.organization} /></Field>
          <Field label="Team"><Input name="team" defaultValue={settings.team} /></Field>
          <Field label="Can members take tasks themselves?" hint="Open: they claim directly. Approval: a lead approves each request. Disabled: only leads assign.">
            <Select name="claim" defaultValue={settings.claimMode}><option value="open">Open: claim directly</option><option value="approval">Approval required</option><option value="disabled">Disabled: leads assign</option></Select>
          </Field>
          <Button type="submit" variant="primary" disabled={pending}>Save settings</Button>
        </form>
      </Panel>

      <Panel>
        <PanelHeader title="Storage & integrations" icon={<Database />} subtitle="Set these as environment variables in Vercel" />
        <ul className="divide-y divide-line">
          <Status ok={integrations.storage.kind === "supabase"} label={`Storage: ${integrations.storage.kind}`} hint={integrations.storage.description + (integrations.storage.kind !== "supabase" ? " Serverless hosts lose this file between instances; configure Supabase for production." : "")} />
          <Status ok={integrations.supabase} label="Supabase database" hint="NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (server only)" />
          <Status ok={integrations.adminPassword} label="Admin password" hint="ADMIN_PASSWORD unlocks editing. Changing it signs every admin out." />
          <Status ok={integrations.sessionSecret} label="Session secret" hint="SESSION_SECRET signs the admin session cookie; required in production" />
          <Status ok={integrations.email} label="Sending email from this page (optional)" hint="GMAIL_USER and GMAIL_APP_PASSWORD (or RESEND_API_KEY and EMAIL_FROM). Without them, emails open in Gmail or your email app for you to send." />
          <Status ok={integrations.githubToken} label="GitHub API token (optional)" hint="GITHUB_TOKEN: fine-grained, read-only. Raises rate limits; required for private repos." />
          <Status ok={integrations.discord} label="Discord team summaries (optional)" hint="DISCORD_WEBHOOK_URL posts blockers, review requests and sprint starts only" />
          <Status ok={!integrations.demoAccounts} label={integrations.demoAccounts ? "Demo accounts are ENABLED" : "Demo accounts disabled"} hint="DEMO_ACCOUNTS=false hides and disables the labeled demo identities" />
        </ul>
        <div className="border-t border-line px-5 py-3 text-[14px] text-muted">{counts.tasks} tasks · {counts.resources} resources · {counts.documents} documents · {counts.audit} audit events</div>
        {integrations.storage.kind !== "supabase" && (
          <div className="border-t border-line px-5 py-4">
            <Button variant="danger" size="sm" disabled={busy} onClick={() => confirm("Reset ALL data on this server to the seed? Members, progress and comments will be lost.") && start(async () => { const r = await resetDemoData(); toast(r.ok ? "ok" : "error", r.ok ? "Data reset to seed." : r.error ?? "Failed"); })}><RotateCcw /> Reset local data to seed</Button>
          </div>
        )}
      </Panel>
    </div>
  );
}

function MemberRow({ m, self }: { m: PublicMember; self: boolean }) {
  const { run } = useCommand();
  const { tracks } = useWorkspace();
  const [role, setRole] = useState<Role>(m.role);
  const [leads, setLeads] = useState<TrackId[]>(m.leadTrackIds);
  const [email, setEmail] = useState(m.email ?? "");
  useEffect(() => setEmail(m.email ?? ""), [m.email]);
  const dirty = role !== m.role || leads.join() !== m.leadTrackIds.join();
  const emailDirty = email.trim() !== (m.email ?? "");
  return (
    <li className="space-y-3 px-5 py-4">
      <div className="flex flex-wrap items-center gap-3">
        <Avatar name={m.name} color={m.avatarColor} size={36} />
        <div className="min-w-0 flex-1">
          <div className="text-[16px] font-semibold text-fg">{m.name}{self && " (you)"}{m.isDemo && <span className="ml-1 text-xs font-normal text-muted">demo</span>}</div>
          {m.active ? <Badge tone="ok">Active</Badge> : <Badge>Deactivated</Badge>}
        </div>
        <Select value={role} onChange={(e) => setRole(e.target.value as Role)} className="h-9 w-40 text-[14px]" aria-label={`Role for ${m.name}`}>{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</Select>
        {dirty && <Button size="sm" variant="primary" onClick={() => run({ type: "member.setRole", memberId: m.id, role, leadTrackIds: leads })}><Shield /> Save role</Button>}
        {!self && <Button size="sm" variant="ghost" onClick={() => run({ type: "member.setActive", memberId: m.id, active: !m.active })}>{m.active ? "Deactivate" : "Reactivate"}</Button>}
      </div>
      {role === "track_lead" && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pl-12 text-[14px]">
          <span className="text-muted">Leads:</span>
          {tracks.map((t) => <label key={t.id} className="flex items-center gap-1.5"><input type="checkbox" className="size-4" checked={leads.includes(t.id)} onChange={() => setLeads(leads.includes(t.id) ? leads.filter((x) => x !== t.id) : [...leads, t.id])} />{t.emoji} {t.shortName}</label>)}
        </div>
      )}
      {!self && (
        <form className="flex gap-2 pl-12" onSubmit={(e) => { e.preventDefault(); void run({ type: "profile.update", memberId: m.id, patch: { email: email.trim() } }); }}>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address (optional)" aria-label={`Email for ${m.name}`} className="h-9 max-w-sm text-[14px]" />
          {emailDirty && <Button size="sm" type="submit" variant="primary">Save email</Button>}
        </form>
      )}
    </li>
  );
}

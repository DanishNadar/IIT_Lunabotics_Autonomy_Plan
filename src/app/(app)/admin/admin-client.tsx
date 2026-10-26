"use client";

import { CheckCircle2, Database, RotateCcw, Settings, Shield, UserCog, UserPlus, XCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { resetDemoData } from "@/app/actions/admin";
import { Avatar, Badge, Button, Field, Input, Panel, PanelHeader, Select } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { useCommand } from "@/components/use-command";
import { useWorkspace } from "@/components/workspace";
import { ROLES, ROLE_LABEL, type AppSettings, type PublicMember, type Role, type TrackId } from "@/lib/domain/types";


interface Props {
  members: PublicMember[];
  settings: AppSettings;
  integrations: { storage: { kind: string; description: string; shared: boolean }; supabase: boolean; githubToken: boolean; adminPassword: boolean; discord: boolean; demoAccounts: boolean; sessionSecret: boolean };
  counts: { tasks: number; resources: number; documents: number; audit: number };
}

function Status({ ok, label, hint }: { ok: boolean; label: string; hint: string }) {
  return (
    <li className="flex items-start gap-2 px-3 py-2 text-xs">
      {ok ? <CheckCircle2 className="mt-0.5 size-3.5 text-ok" /> : <XCircle className="mt-0.5 size-3.5 text-faint" />}
      <div><div className="text-fg">{label}</div><div className="text-[11px] text-muted">{hint}</div></div>
    </li>
  );
}

export function AdminClient({ members, settings, integrations, counts }: Props) {
  const { run, pending } = useCommand();
  const { tracks, actor } = useWorkspace();
  const toast = useToast();
  const [busy, start] = useTransition();

  return (
    <div className="mx-auto max-w-[1300px] space-y-4 p-4">
      <h1 className="text-xl font-semibold">Administration</h1>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Panel>
          <PanelHeader title="Members & roles" icon={<UserCog />} subtitle="Roles are enforced on the server for every command" />
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-line text-left text-[10px] text-muted uppercase"><th className="px-3 py-1.5">Member</th><th>Role</th><th>Leads tracks</th><th>Status</th><th className="pr-3" /></tr></thead>
              <tbody>
                {members.map((m) => (
                  <MemberRow key={m.id} m={m} self={m.id === actor.id} />
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel>
            <PanelHeader title="Add a team member" icon={<UserPlus />} subtitle="Members don't sign in; they appear on the board for assignments" />
            <form className="space-y-2 p-3" onSubmit={(e) => {
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
                },
                { onSuccess: () => form.reset() },
              );
            }}>
              <Field label="Name"><Input name="name" required minLength={2} /></Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Role"><Select name="role" defaultValue="member">{ROLES.filter((r) => r !== "admin").map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</Select></Field>
                <Field label="Category"><Select name="track" defaultValue=""><option value="">—</option>{tracks.map((t) => <option key={t.id} value={t.id}>{t.emoji} {t.shortName}</option>)}</Select></Field>
                <Field label="Discord (optional)"><Input name="discord" /></Field>
                <Field label="GitHub username (optional)"><Input name="github" /></Field>
              </div>
              <fieldset className="flex flex-wrap gap-2 text-[11px] text-muted"><span>Track lead of:</span>{tracks.map((t) => <label key={t.id} className="flex items-center gap-1"><input type="checkbox" name="tracks" value={t.id} />{t.id}</label>)}</fieldset>
              <Button type="submit" variant="primary" disabled={pending}><UserPlus /> Add member</Button>
            </form>
          </Panel>

          <Panel>
            <PanelHeader title="Application settings" icon={<Settings />} />
            <form className="space-y-2 p-3" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); void run({ type: "settings.update", patch: { organization: String(f.get("org")), team: String(f.get("team")), claimMode: f.get("claim") as AppSettings["claimMode"] } }); }}>
              <Field label="Organization"><Input name="org" defaultValue={settings.organization} /></Field>
              <Field label="Team"><Input name="team" defaultValue={settings.team} /></Field>
              <Field label="Task claiming" hint="Open: members claim directly. Approval: requests need a lead. Disabled: interest only.">
                <Select name="claim" defaultValue={settings.claimMode}><option value="open">Open — claim directly</option><option value="approval">Approval required</option><option value="disabled">Disabled — leads assign</option></Select>
              </Field>
              <Button type="submit" size="sm" variant="primary" disabled={pending}>Save settings</Button>
            </form>
          </Panel>

          <Panel>
            <PanelHeader title="Storage & integrations" icon={<Database />} />
            <ul className="divide-y divide-line">
              <Status ok={integrations.storage.kind === "supabase"} label={`Storage: ${integrations.storage.kind}`} hint={integrations.storage.description + (integrations.storage.kind !== "supabase" ? " Serverless hosts lose this file between instances; configure Supabase for production." : "")} />
              <Status ok={integrations.supabase} label="Supabase database" hint="NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (server only)" />
              <Status ok={integrations.adminPassword} label="Admin password" hint="ADMIN_PASSWORD — unlocks editing. Changing it signs every admin out." />
              <Status ok={integrations.githubToken} label="GitHub API token (optional)" hint="GITHUB_TOKEN — fine-grained, read-only. Raises rate limits; required for private repos." />
              <Status ok={integrations.discord} label="Discord team summaries (optional)" hint="DISCORD_WEBHOOK_URL — posts blockers, review requests and sprint starts only" />
              <Status ok={integrations.sessionSecret} label="Session secret" hint="SESSION_SECRET signs the admin session cookie; required in production" />
              <Status ok={!integrations.demoAccounts} label={integrations.demoAccounts ? "Demo accounts are ENABLED" : "Demo accounts disabled"} hint="DEMO_ACCOUNTS=false hides and disables the labeled demo identities" />
            </ul>
            <div className="border-t border-line p-3 text-[11px] text-muted">{counts.tasks} tasks · {counts.resources} resources · {counts.documents} documents · {counts.audit} audit events</div>
            {integrations.storage.kind !== "supabase" && (
              <div className="border-t border-line p-3">
                <Button variant="danger" size="sm" disabled={busy} onClick={() => confirm("Reset ALL data on this server to the seed? Members, progress and comments will be lost.") && start(async () => { const r = await resetDemoData(); toast(r.ok ? "ok" : "error", r.ok ? "Data reset to seed." : r.error ?? "Failed"); })}><RotateCcw /> Reset local data to seed</Button>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function MemberRow({ m, self }: { m: PublicMember; self: boolean }) {
  const { run } = useCommand();
  const { tracks } = useWorkspace();
  const [role, setRole] = useState<Role>(m.role);
  const [leads, setLeads] = useState<TrackId[]>(m.leadTrackIds);
  const dirty = role !== m.role || leads.join() !== m.leadTrackIds.join();
  return (
    <tr className="border-b border-line align-middle last:border-0">
      <td className="px-3 py-1.5"><div className="flex items-center gap-2"><Avatar name={m.name} color={m.avatarColor} size={20} /><div><div className="text-fg">{m.name}{self && " (you)"}</div><div className="text-[10px] text-muted">{m.email}{m.isDemo && " · demo"}</div></div></div></td>
      <td><Select value={role} onChange={(e) => setRole(e.target.value as Role)} className="h-7 w-36 text-xs" aria-label={`Role for ${m.name}`}>{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</Select></td>
      <td>{role === "track_lead" ? <div className="flex flex-wrap gap-1">{tracks.map((t) => <label key={t.id} className="flex items-center gap-0.5 text-[10px]"><input type="checkbox" checked={leads.includes(t.id)} onChange={() => setLeads(leads.includes(t.id) ? leads.filter((x) => x !== t.id) : [...leads, t.id])} />{t.id}</label>)}</div> : <span className="text-faint">—</span>}</td>
      <td>{m.active ? <Badge tone="ok">active</Badge> : <Badge>deactivated</Badge>}</td>
      <td className="pr-3 text-right whitespace-nowrap">
        {dirty && <Button size="xs" variant="primary" onClick={() => run({ type: "member.setRole", memberId: m.id, role, leadTrackIds: leads })}><Shield /> Save</Button>}
        {!self && <Button size="xs" variant="ghost" onClick={() => run({ type: "member.setActive", memberId: m.id, active: !m.active })}>{m.active ? "Deactivate" : "Reactivate"}</Button>}
      </td>
    </tr>
  );
}

"use client";

import { CheckCircle2, Copy, Database, Mail, RotateCcw, Settings, Shield, UserCog, XCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { createInvitation } from "@/app/actions/auth";
import { resetDemoData } from "@/app/actions/admin";
import { Avatar, Badge, Button, Field, Input, Panel, PanelHeader, Select } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { useCommand } from "@/components/use-command";
import { useWorkspace } from "@/components/workspace";
import { ROLES, ROLE_LABEL, type AppSettings, type Invitation, type PublicMember, type Role, type TrackId } from "@/lib/domain/types";


interface Props {
  members: PublicMember[];
  settings: AppSettings;
  invitations: Omit<Invitation, "tokenHash">[];
  integrations: { storage: { kind: string; description: string; shared: boolean }; supabase: boolean; githubToken: boolean; githubOAuth: boolean; discord: boolean; demoAccounts: boolean; sessionSecret: boolean };
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

export function AdminClient({ members, settings, invitations, integrations, counts }: Props) {
  const { run, pending } = useCommand();
  const { tracks, actor } = useWorkspace();
  const toast = useToast();
  const [link, setLink] = useState<string | null>(null);
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
            <PanelHeader title="Invite a member" icon={<Mail />} />
            <form className="space-y-2 p-3" onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              start(async () => {
                const r = await createInvitation({ email: String(f.get("email")), role: f.get("role") as Role, leadTrackIds: f.getAll("tracks") as TrackId[] });
                if (!r.ok) toast("error", r.error);
                else { toast("ok", r.link ? "Invitation link created — share it privately." : "Invitation email sent."); setLink(r.link ?? null); }
              });
            }}>
              <Field label="Email"><Input name="email" type="email" required /></Field>
              <Field label="Role"><Select name="role" defaultValue="member">{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</Select></Field>
              <fieldset className="flex flex-wrap gap-2 text-[11px] text-muted"><span>Track lead of:</span>{tracks.map((t) => <label key={t.id} className="flex items-center gap-1"><input type="checkbox" name="tracks" value={t.id} />{t.id}</label>)}</fieldset>
              <Button type="submit" variant="primary" disabled={busy}>Create invitation</Button>
              {link && (
                <div className="flex items-center gap-1 rounded border border-info/30 bg-info-soft p-2">
                  <code className="min-w-0 flex-1 truncate font-mono text-[10px]">{link}</code>
                  <Button size="icon" variant="ghost" onClick={() => navigator.clipboard?.writeText(link)} aria-label="Copy link"><Copy /></Button>
                </div>
              )}
              {link && <p className="text-[10px] text-faint">This link is shown once. Only a hash of the token is stored.</p>}
            </form>
            {invitations.length > 0 && (
              <ul className="divide-y divide-line border-t border-line">
                {invitations.map((i) => <li key={i.id} className="flex items-center gap-2 px-3 py-1.5 text-xs"><span className="flex-1 truncate">{i.email}</span><Badge>{ROLE_LABEL[i.role]}</Badge><span className="text-[10px] text-muted">{i.acceptedAt ? `accepted $<Ago iso={i.acceptedAt} />` : `sent $<Ago iso={i.createdAt} />`}</span></li>)}
              </ul>
            )}
          </Panel>

          <Panel>
            <PanelHeader title="Application settings" icon={<Settings />} />
            <form className="space-y-2 p-3" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); void run({ type: "settings.update", patch: { organization: String(f.get("org")), team: String(f.get("team")), claimMode: f.get("claim") as AppSettings["claimMode"], allowSelfRegistration: f.get("reg") === "on" } }); }}>
              <Field label="Organization"><Input name="org" defaultValue={settings.organization} /></Field>
              <Field label="Team"><Input name="team" defaultValue={settings.team} /></Field>
              <Field label="Task claiming" hint="Open: members claim directly. Approval: requests need a lead. Disabled: interest only.">
                <Select name="claim" defaultValue={settings.claimMode}><option value="open">Open — claim directly</option><option value="approval">Approval required</option><option value="disabled">Disabled — leads assign</option></Select>
              </Field>
              <label className="flex items-center gap-2 text-xs text-fg-2"><input type="checkbox" name="reg" defaultChecked={settings.allowSelfRegistration} /> Allow self-registration without an invitation</label>
              <Button type="submit" size="sm" variant="primary" disabled={pending}>Save settings</Button>
            </form>
          </Panel>

          <Panel>
            <PanelHeader title="Storage & integrations" icon={<Database />} />
            <ul className="divide-y divide-line">
              <Status ok={integrations.storage.kind === "supabase"} label={`Storage: ${integrations.storage.kind}`} hint={integrations.storage.description + (integrations.storage.kind !== "supabase" ? " Serverless hosts lose this file between instances; configure Supabase for production." : "")} />
              <Status ok={integrations.supabase} label="Supabase Auth & Realtime" hint="NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (server only)" />
              <Status ok={integrations.githubToken} label="GitHub API token (optional)" hint="GITHUB_TOKEN — fine-grained, read-only. Raises rate limits; required for private repos." />
              <Status ok={integrations.githubOAuth} label="GitHub OAuth sign-in" hint="Configure the GitHub provider in Supabase, then set NEXT_PUBLIC_GITHUB_OAUTH_ENABLED=true" />
              <Status ok={integrations.discord} label="Discord team summaries (optional)" hint="DISCORD_WEBHOOK_URL — posts blockers, review requests and sprint starts only" />
              <Status ok={integrations.sessionSecret || integrations.supabase} label="Session secret" hint="SESSION_SECRET is required in production for local-mode sessions" />
              <Status ok={!integrations.demoAccounts} label={integrations.demoAccounts ? "Demo accounts are ENABLED" : "Demo accounts disabled"} hint="DEMO_ACCOUNTS=false hides and disables the labeled demo identities" />
            </ul>
            <div className="border-t border-line p-3 text-[11px] text-muted">{counts.tasks} tasks · {counts.resources} resources · {counts.documents} documents · {counts.audit} audit events</div>
            {integrations.storage.kind !== "supabase" && (
              <div className="border-t border-line p-3">
                <Button variant="danger" size="sm" disabled={busy} onClick={() => confirm("Reset ALL data on this server to the seed? Accounts, progress and comments will be lost.") && start(async () => { const r = await resetDemoData(); toast(r.ok ? "ok" : "error", r.ok ? "Data reset to seed." : r.error ?? "Failed"); })}><RotateCcw /> Reset local data to seed</Button>
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

"use client";

import { Check, CheckCircle2, Copy, ExternalLink, History, Info, Mail, RotateCcw, Save, Send, ShieldCheck, XCircle } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { checkEmailSettings, sendAssignmentEmails } from "@/app/actions/email";
import { Avatar, Badge, Button, buttonClass, Input, Textarea } from "@/components/ui/primitives";
import { Card } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { useCommand } from "@/components/use-command";
import { useStoredState } from "@/components/use-stored-state";
import { useWorkspace } from "@/components/workspace";
import { renderAssignmentEmail, type AssignmentDigest } from "@/lib/domain/email";
import { cn } from "@/lib/utils";
import type { Person } from "./assign-wizard";

export interface EmailLogEntry {
  id: string;
  memberId: string;
  ok: boolean;
  summary: string;
  createdAt: string;
}

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export function EmailPanel({ people, digests, emailLog, configured, focus }: { people: Person[]; digests: AssignmentDigest[]; emailLog: EmailLogEntry[]; configured: boolean; focus: string | null }) {
  const { settings } = useWorkspace();
  const toast = useToast();
  const [sending, start] = useTransition();
  const withTasks = digests.filter((d) => d.items.length);
  // Saved in this browser so a half-finished email survives leaving the page.
  const [selected, setSelected] = useStoredState<string[]>("lacc-email:selected", focus ? [focus] : []);
  const [previewId, setPreviewId] = useStoredState<string | null>("lacc-email:preview", focus ?? withTasks[0]?.memberId ?? null);
  const [note, setNote] = useStoredState("lacc-email:note", "");
  const [check, setCheck] = useState<{ ok: boolean; message: string } | null>(null);
  const [checking, startCheck] = useTransition();
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  useEffect(() => {
    if (focus) {
      setSelected((s) => (s.includes(focus) ? s : [...s, focus]));
      setPreviewId(focus);
    }
  }, [focus, setSelected, setPreviewId]);

  const team = `${settings.organization} autonomy`;
  const count = (id: string) => digests.find((d) => d.memberId === id)?.items.length ?? 0;
  const preview = digests.find((d) => d.memberId === previewId) ?? null;
  const email = useMemo(() => (preview ? renderAssignmentEmail(preview, { baseUrl: origin, team, note }) : null), [preview, origin, team, note]);
  const sendable = selected.filter((id) => {
    const d = digests.find((x) => x.memberId === id);
    return d && d.email && d.items.length;
  });

  const send = () =>
    start(async () => {
      const r = await sendAssignmentEmails({ memberIds: sendable, note });
      if (!r.ok) return toast("error", r.error);
      if (r.sent.length) toast("ok", `Sent to ${r.sent.join(", ")}`);
      if (r.skipped.length) toast("error", `Not sent: ${r.skipped.map((s) => `${s.name} (${s.reason})`).join("; ")}`);
    });

  return (
    <div className="space-y-6">
      {!configured && (
        <div className="flex items-start gap-3 rounded-xl border border-info/30 bg-info-soft px-5 py-4 text-[15px] text-fg-2">
          <Info className="mt-0.5 size-5 shrink-0 text-info" />
          <div className="space-y-1">
            <p><b className="text-fg">You can email people right now</b> with “Open in Gmail” or “Open in my email app”: the message is written for you, you just press send.</p>
            <p className="text-muted">To send straight from this page instead, whoever manages the Vercel project adds two settings: <code>GMAIL_USER</code> (the Gmail address to send from) and <code>GMAIL_APP_PASSWORD</code> (a Google app password for that account).</p>
          </div>
        </div>
      )}

      {configured && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-panel-2 px-5 py-4 text-[15px]">
          <ShieldCheck className="size-5 shrink-0 text-ok" />
          <span className="min-w-0 flex-1 text-fg-2">Sending from this page is switched on. Not sure it works? Check the login first: this sends nothing.</span>
          <Button size="sm" disabled={checking} onClick={() => startCheck(async () => setCheck(await checkEmailSettings()))}>{checking ? "Checking…" : "Check email settings"}</Button>
          {check && (
            <p role="status" className={cn("flex w-full items-start gap-2 text-[14px]", check.ok ? "text-ok" : "text-danger")}>
              {check.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : <XCircle className="mt-0.5 size-4 shrink-0" />} {check.message}
            </p>
          )}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <Card title="1. Who should get an email?" icon={<Mail />} subtitle="People with open tasks are at the top. Add an email address if it's missing.">
          <ul className="space-y-2">
            {[...people].sort((a, b) => count(b.id) - count(a.id)).map((p) => {
              const d = digests.find((x) => x.memberId === p.id);
              const n = d?.items.length ?? 0;
              return <PersonRow key={p.id} p={p} n={n} last={emailLog.find((e) => e.memberId === p.id)} active={previewId === p.id} checked={selected.includes(p.id)} onPreview={() => setPreviewId(p.id)} onCheck={(on) => setSelected(on ? [...selected, p.id] : selected.filter((x) => x !== p.id))} />;
            })}
          </ul>
          <label className="mt-6 block space-y-1.5">
            <span className="text-[15px] font-medium">Add a personal message <span className="font-normal text-muted">(optional, goes at the top)</span></span>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} placeholder="e.g. Welcome aboard! First meeting is Thursday at 6pm in the lab." />
          </label>
          {configured && (
            <Button variant="primary" className="mt-4 w-full" disabled={!sendable.length || sending} onClick={send}>
              <Send /> {sending ? "Sending…" : sendable.length ? `Send ${sendable.length} email${sendable.length === 1 ? "" : "s"} now` : "Tick people with an email address"}
            </Button>
          )}
        </Card>

        <Card title="2. Check the email" icon={<Check />} subtitle={preview ? `This is exactly what ${preview.name} will get.` : "Pick someone on the left to preview."}>
          {preview && email ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-line bg-panel-2 px-4 py-3 text-[14px]">
                <div><span className="text-muted">To:</span> {preview.email || <span className="text-warn">no email address saved yet</span>}</div>
                <div><span className="text-muted">Subject:</span> {email.subject}</div>
              </div>
              <iframe title={`Email preview for ${preview.name}`} srcDoc={email.html} sandbox="" className="h-[560px] w-full rounded-lg border border-line bg-white" />
              <div className="flex flex-wrap gap-2">
                <a className={buttonClass("secondary", "sm", cn(!preview.email && "pointer-events-none opacity-50"))} aria-disabled={!preview.email} target="_blank" rel="noreferrer" href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(preview.email)}&su=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.text)}`}>
                  <ExternalLink /> Open in Gmail
                </a>
                <a className={buttonClass("secondary", "sm", cn(!preview.email && "pointer-events-none opacity-50"))} aria-disabled={!preview.email} href={`mailto:${encodeURIComponent(preview.email)}?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.text)}`}>
                  <Mail /> Open in my email app
                </a>
                <Button size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(email.text).then(() => toast("ok", "Email text copied"))}><Copy /> Copy text</Button>
              </div>
            </div>
          ) : (
            <p className="py-10 text-center text-[15px] text-muted">Nobody has tasks yet. Assign some first, then come back here.</p>
          )}
        </Card>
      </div>

      {emailLog.length > 0 && (
        <Card title="Emails sent from this page" icon={<History />} subtitle="A sent email can't be taken back. To send it again, press Show again, check it, then send it yourself or press Send.">
          <ul className="divide-y divide-line">
            {emailLog.map((e) => {
              const p = people.find((x) => x.id === e.memberId);
              return (
                <li key={e.id} className="flex flex-wrap items-center gap-3 py-3 text-[14px]">
                  {e.ok ? <CheckCircle2 className="size-4 shrink-0 text-ok" /> : <XCircle className="size-4 shrink-0 text-danger" />}
                  <span className="min-w-0 flex-1">
                    <b>{e.ok ? "Sent" : "Failed"}</b> <span className="text-muted">· {when(e.createdAt)}</span>
                    <span className="block text-fg-2">{e.summary}</span>
                  </span>
                  {p && <Button size="sm" variant="ghost" onClick={() => { setPreviewId(p.id); window.scrollTo({ top: 0, behavior: "smooth" }); }}><RotateCcw /> Show again</Button>}
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}

function PersonRow({ p, n, last, active, checked, onPreview, onCheck }: { p: Person; n: number; last?: EmailLogEntry; active: boolean; checked: boolean; onPreview: () => void; onCheck: (on: boolean) => void }) {
  const { run, pending } = useCommand();
  const [email, setEmail] = useState(p.email);
  useEffect(() => setEmail(p.email), [p.email]);
  const dirty = email.trim() !== p.email;
  return (
    <li className={cn("rounded-xl border p-4 transition-colors", !n && "opacity-60", active ? "border-accent/60 bg-accent-soft" : "border-line bg-panel-2")}>
      <div className="flex items-center gap-3">
        <input type="checkbox" className="size-5 accent-[var(--accent)]" checked={checked} disabled={!n} onChange={(e) => onCheck(e.target.checked)} aria-label={`Email ${p.name}`} />
        <button onClick={onPreview} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <Avatar name={p.name} color={p.color} size={36} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[16px] font-semibold">{p.name}</span>
            <span className="block text-[13px] text-muted">{n ? `${n} open task${n === 1 ? "" : "s"}` : "No open tasks"}</span>
            {last && <span className={cn("block text-[13px]", last.ok ? "text-ok" : "text-danger")} title={last.summary}>{last.ok ? `Emailed ${when(last.createdAt)}` : `Last send failed ${when(last.createdAt)}`}</span>}
          </span>
        </button>
        {n > 0 && !p.email && <Badge tone="warn">Needs email</Badge>}
      </div>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void run({ type: "profile.update", memberId: p.id, patch: { email: email.trim() } });
        }}
      >
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@hawk.iit.edu" aria-label={`Email address for ${p.name}`} className="h-9 text-[14px]" />
        {dirty && <Button size="sm" type="submit" variant="primary" disabled={pending}><Save /> Save</Button>}
      </form>
    </li>
  );
}

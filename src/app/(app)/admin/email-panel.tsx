"use client";

import { Check, Copy, ExternalLink, Info, Mail, Save, Send } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { sendAssignmentEmails } from "@/app/actions/email";
import { Avatar, Badge, Button, buttonClass, Input, Textarea } from "@/components/ui/primitives";
import { Card } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { useCommand } from "@/components/use-command";
import { useWorkspace } from "@/components/workspace";
import { renderAssignmentEmail, type AssignmentDigest } from "@/lib/domain/email";
import { cn } from "@/lib/utils";
import type { Person } from "./assign-wizard";

export function EmailPanel({ people, digests, configured, focus }: { people: Person[]; digests: AssignmentDigest[]; configured: boolean; focus: string | null }) {
  const { settings } = useWorkspace();
  const toast = useToast();
  const [sending, start] = useTransition();
  const withTasks = digests.filter((d) => d.items.length);
  const [selected, setSelected] = useState<string[]>(() => (focus ? [focus] : []));
  const [previewId, setPreviewId] = useState<string | null>(focus ?? withTasks[0]?.memberId ?? null);
  const [note, setNote] = useState("");
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  useEffect(() => {
    if (focus) {
      setSelected((s) => (s.includes(focus) ? s : [...s, focus]));
      setPreviewId(focus);
    }
  }, [focus]);

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
            <p className="text-muted">To send straight from this page instead, whoever manages the Vercel project adds two settings: <code>RESEND_API_KEY</code> (a free key from resend.com) and <code>EMAIL_FROM</code> (the sender address).</p>
          </div>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <Card title="1. Who should get an email?" icon={<Mail />} subtitle="People with open tasks are at the top. Add an email address if it's missing.">
          <ul className="space-y-2">
            {[...people].sort((a, b) => count(b.id) - count(a.id)).map((p) => {
              const d = digests.find((x) => x.memberId === p.id);
              const n = d?.items.length ?? 0;
              return <PersonRow key={p.id} p={p} n={n} active={previewId === p.id} checked={selected.includes(p.id)} onPreview={() => setPreviewId(p.id)} onCheck={(on) => setSelected(on ? [...selected, p.id] : selected.filter((x) => x !== p.id))} />;
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
    </div>
  );
}

function PersonRow({ p, n, active, checked, onPreview, onCheck }: { p: Person; n: number; active: boolean; checked: boolean; onPreview: () => void; onCheck: (on: boolean) => void }) {
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

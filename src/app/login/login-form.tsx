"use client";

import { AlertTriangle, ArrowRight, Database, GitBranch, Info } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { loginAsDemo, loginWithPassword, register, signInWithGithub, type AuthResult } from "@/app/actions/auth";
import { Avatar, Badge, Button, Field, Input, Panel } from "@/components/ui/primitives";

export function LoginForm({
  mode,
  demo,
  github,
  invite,
  inviteEmail,
  error,
  storageNote,
}: {
  mode: "local" | "supabase";
  demo: { id: string; name: string; role: string; color: string; bio: string }[];
  github: boolean;
  invite: string | null;
  inviteEmail: string;
  error: string | null;
  storageNote: string | null;
}) {
  const [tab, setTab] = useState<"signin" | "register">(invite ? "register" : "signin");
  const [signinState, signinAction, signinPending] = useActionState<AuthResult | null, FormData>(loginWithPassword, null);
  const [regState, regAction, regPending] = useActionState<AuthResult | null, FormData>(register, null);
  const [demoError, setDemoError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  // Controlled so React 19's post-action form reset doesn't wipe what the user typed.
  const [email, setEmail] = useState(inviteEmail);
  const [name, setName] = useState("");

  const state = tab === "signin" ? signinState : regState;
  return (
    <div className="grid gap-4 md:grid-cols-[1fr_1.1fr]">
      <Panel className="p-5">
        <div className="mb-4 flex gap-1 rounded-md border border-line bg-panel-2 p-0.5">
          {(["signin", "register"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`flex-1 rounded px-3 py-1.5 text-xs font-medium ${tab === t ? "bg-panel-3 text-fg" : "text-muted hover:text-fg"}`}>
              {t === "signin" ? "Sign in" : invite ? "Accept invitation" : "Create account"}
            </button>
          ))}
        </div>
        {(error || (state && !state.ok)) && (
          <div role="alert" className="mb-3 flex items-start gap-2 rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            {error ?? (state && !state.ok ? state.error : "")}
          </div>
        )}
        {state?.ok && tab === "register" && mode === "supabase" && (
          <div className="mb-3 rounded-md border border-ok/30 bg-ok-soft px-3 py-2 text-xs text-ok">Check your email to confirm your account.</div>
        )}
        {tab === "signin" ? (
          <form action={signinAction} className="space-y-3">
            <Field label="Email">
              <Input name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="Password">
              <Input name="password" type="password" autoComplete="current-password" required minLength={8} />
            </Field>
            <Button type="submit" variant="primary" size="md" className="w-full justify-center" disabled={signinPending}>
              {signinPending ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        ) : (
          <form action={regAction} className="space-y-3">
            {invite && <input type="hidden" name="invite" value={invite} />}
            <Field label="Full name">
              <Input name="name" autoComplete="name" required minLength={2} value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Email">
              <Input name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="Password" hint="At least 8 characters.">
              <Input name="password" type="password" autoComplete="new-password" required minLength={8} />
            </Field>
            <Button type="submit" variant="primary" size="md" className="w-full justify-center" disabled={regPending}>
              {regPending ? "Creating account…" : "Create account"}
            </Button>
          </form>
        )}
        {github && (
          <>
            <div className="my-4 flex items-center gap-2 text-[10px] text-faint uppercase">
              <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
            </div>
            <Button size="md" className="w-full justify-center" onClick={() => start(async () => void (await signInWithGithub()))} disabled={pending}>
              <GitBranch /> Continue with GitHub
            </Button>
          </>
        )}
        {storageNote && (
          <p className="mt-4 flex items-start gap-1.5 text-[11px] text-faint">
            <Database className="mt-0.5 size-3 shrink-0" />
            Local mode: accounts and data are stored server-side in a {storageNote.replace(/^Shared /, "shared ")} Configure Supabase for persistent production use.
          </p>
        )}
      </Panel>

      {demo.length > 0 ? (
        <Panel className="p-5">
          <div className="mb-1 flex items-center gap-2">
            <h2 className="text-sm font-semibold">Explore with a demo account</h2>
            <Badge tone="warn">Demo data</Badge>
          </div>
          <p className="mb-3 flex items-start gap-1.5 text-xs text-muted">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            These are clearly labeled demo identities, not real team members. Changes you make are saved to this server&apos;s shared store and visible to anyone using it.
          </p>
          {demoError && <p className="mb-2 text-xs text-danger">{demoError}</p>}
          <div className="space-y-1.5">
            {demo.map((d) => (
              <button
                key={d.id}
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const r = await loginAsDemo(d.id);
                    if (r && !r.ok) setDemoError(r.error);
                  })
                }
                className="group flex w-full items-center gap-3 rounded-md border border-line bg-panel-2 px-3 py-2 text-left hover:border-line-strong hover:bg-panel-3"
              >
                <Avatar name={d.name} color={d.color} size={28} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium text-fg">{d.name}</div>
                  <div className="truncate text-[11px] text-muted">{d.role}</div>
                </div>
                <ArrowRight className="size-4 text-faint group-hover:text-fg" />
              </button>
            ))}
          </div>
        </Panel>
      ) : (
        <Panel className="p-5 text-xs text-muted">
          <h2 className="mb-2 text-sm font-semibold text-fg">Welcome</h2>
          <p>Sign in with your team account. New members need an invitation from an administrator unless open registration is enabled.</p>
        </Panel>
      )}
    </div>
  );
}

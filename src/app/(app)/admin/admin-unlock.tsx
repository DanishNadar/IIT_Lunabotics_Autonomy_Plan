"use client";

import { AlertTriangle, ArrowRight, Info, Lock } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { adminLogin, loginAsDemo, type AuthResult } from "@/app/actions/auth";
import { Avatar, Badge, Button, Field, Input, Panel } from "@/components/ui/primitives";

export function AdminUnlock({ demo, configured }: { demo: { id: string; name: string; role: string; color: string; bio: string }[]; configured: boolean }) {
  const [state, action, pending] = useActionState<AuthResult | null, FormData>(adminLogin, null);
  const [demoError, setDemoError] = useState<string | null>(null);
  const [demoPending, start] = useTransition();

  return (
    <div className={demo.length ? "grid gap-4 md:grid-cols-[1fr_1.1fr]" : "mx-auto max-w-sm"}>
      <Panel className="p-5">
        <div className="mb-1 flex items-center gap-2">
          <Lock className="size-4 text-accent" />
          <h2 className="text-[15px] font-semibold">Administration</h2>
        </div>
        <p className="mb-4 text-[13px] text-muted">Enter the admin password to edit tasks and add members, resources and other content. Edit controls then appear across the board until you lock admin again.</p>
        {!configured && (
          <div role="alert" className="mb-3 flex items-start gap-2 rounded-md border border-warn/30 bg-warn-soft px-3 py-2 text-[13px] text-warn">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            Admin access is not configured on this server (ADMIN_PASSWORD is not set).
          </div>
        )}
        {state && !state.ok && (
          <div role="alert" className="mb-3 flex items-start gap-2 rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-[13px] text-danger">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            {state.error}
          </div>
        )}
        <form action={action} className="space-y-3">
          <Field label="Admin password">
            <Input name="password" type="password" autoComplete="current-password" required autoFocus />
          </Field>
          <Button type="submit" variant="primary" size="md" className="w-full justify-center" disabled={pending || !configured}>
            {pending ? "Checking…" : "Unlock admin"}
          </Button>
        </form>
      </Panel>

      {demo.length > 0 && (
        <Panel className="p-5">
          <div className="mb-1 flex items-center gap-2">
            <h2 className="text-[15px] font-semibold">Local demo personas</h2>
            <Badge tone="warn">Demo data</Badge>
          </div>
          <p className="mb-3 flex items-start gap-1.5 text-[13px] text-muted">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            Available only in local mode, for trying role-based workflows. These are labeled demo identities, not real team members.
          </p>
          {demoError && <p className="mb-2 text-[13px] text-danger">{demoError}</p>}
          <div className="space-y-1.5">
            {demo.map((d) => (
              <button
                key={d.id}
                disabled={demoPending}
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
                  <div className="truncate text-[15px] font-medium text-fg">{d.name}</div>
                  <div className="truncate text-[13px] text-muted">{d.role}</div>
                </div>
                <ArrowRight className="size-4 text-faint group-hover:text-fg" />
              </button>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}

"use client";

import { Ago } from "@/components/ui/time";
import { Bell, CheckCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button, EmptyState, Panel, PanelHeader } from "@/components/ui/primitives";
import { useCommand } from "@/components/use-command";
import { NOTIFICATION_KINDS, type Notification, type NotificationKind } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

const LABEL: Record<NotificationKind, string> = {
  assignment: "Task assignment",
  claim_decision: "Claim / request decisions",
  mention: "Mentions & replies",
  review_request: "Review requests",
  changes_requested: "Requested changes",
  approved: "Approved tasks",
  blocker_new: "New blockers",
  blocker_resolved: "Resolved blockers",
  due_soon: "Due dates",
  sprint_change: "Sprint changes",
  dependency_complete: "Dependency completion",
};

export function NotificationsClient({ items, disabled }: { items: Notification[]; disabled: NotificationKind[] }) {
  const { run, pending } = useCommand();
  const [off, setOff] = useState(new Set(disabled));
  return (
    <div className="mx-auto grid max-w-[1100px] gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Panel>
        <PanelHeader title="Notifications" icon={<Bell />} actions={<Button size="xs" variant="ghost" onClick={() => run({ type: "notification.read", notificationId: null })}><CheckCheck /> Mark all read</Button>} />
        {items.length === 0 ? <EmptyState title="Nothing yet" /> : (
          <ul className="divide-y divide-line">
            {items.map((n) => (
              <li key={n.id}>
                <Link href={n.href} onClick={() => !n.read && run({ type: "notification.read", notificationId: n.id }, { quiet: true })} className={cn("flex gap-2 px-3 py-2 text-[13px] hover:bg-panel-2", !n.read && "bg-info-soft/40")}>
                  {!n.read && <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-info" />}
                  <div className="min-w-0 flex-1"><div className="font-medium text-fg">{n.title}</div>{n.body && <div className="text-muted">{n.body}</div>}</div>
                  <span className="text-xs text-faint"><Ago iso={n.createdAt} /></span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel className="self-start">
        <PanelHeader title="In-app preferences" subtitle="Choose which events notify you" />
        <div className="space-y-1.5 p-3">
          {NOTIFICATION_KINDS.map((k) => (
            <label key={k} className="flex items-center gap-2 text-[13px] text-fg-2">
              <input type="checkbox" checked={!off.has(k)} onChange={() => { const n = new Set(off); if (n.has(k)) n.delete(k); else n.add(k); setOff(n); }} />
              {LABEL[k]}
            </label>
          ))}
          <Button className="mt-2" size="sm" variant="primary" disabled={pending} onClick={() => run({ type: "notification.prefs", disabledKinds: [...off] })}>Save preferences</Button>
          <p className="pt-2 text-xs text-faint">Discord summaries (if an admin configures a webhook) only post team-level events — blockers, review requests and sprint starts — never direct messages.</p>
        </div>
      </Panel>
    </div>
  );
}

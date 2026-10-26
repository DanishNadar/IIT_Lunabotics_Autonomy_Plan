"use client";

import { Ago } from "@/components/ui/time";
import { Activity } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Avatar, EmptyState, Panel, Select } from "@/components/ui/primitives";
import { useLookup, useWorkspace } from "@/components/workspace";
import type { AuditEvent } from "@/lib/domain/types";
import { day } from "@/lib/utils";

export function ActivityClient({ events }: { events: AuditEvent[] }) {
  const { members } = useWorkspace();
  const { member } = useLookup();
  const [who, setWho] = useState("");
  const [kind, setKind] = useState("");
  const kinds = [...new Set(events.map((e) => e.action.split(".")[0]))].sort();
  const shown = events.filter((e) => (!who || e.actorId === who) && (!kind || e.action.startsWith(kind + ".")));
  const groups = new Map<string, AuditEvent[]>();
  for (const e of shown) groups.set(e.createdAt.slice(0, 10), [...(groups.get(e.createdAt.slice(0, 10)) ?? []), e]);
  return (
    <div className="mx-auto max-w-[900px] space-y-4 p-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1"><h1 className="text-xl font-semibold">Activity feed</h1><p className="text-xs text-muted">Audit trail of important changes across the workspace.</p></div>
        <Select value={who} onChange={(e) => setWho(e.target.value)} className="h-7 w-48 text-xs" aria-label="Filter by member"><option value="">Everyone</option>{members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</Select>
        <Select value={kind} onChange={(e) => setKind(e.target.value)} className="h-7 w-40 text-xs" aria-label="Filter by type"><option value="">All types</option>{kinds.map((k) => <option key={k} value={k}>{k}</option>)}</Select>
      </div>
      {!shown.length ? <Panel><EmptyState icon={<Activity />} title="No activity" /></Panel> : [...groups].map(([d, list]) => (
        <section key={d}>
          <h2 className="mb-1 text-[11px] font-semibold tracking-wider text-muted uppercase">{day(d, "EEEE, MMM d yyyy")}</h2>
          <Panel>
            <ul className="divide-y divide-line">
              {list.map((e) => {
                const a = e.actorId ? member.get(e.actorId) : null;
                return (
                  <li key={e.id} className="flex items-start gap-2 px-3 py-2 text-xs">
                    {a ? <Avatar name={a.name} color={a.avatarColor} size={20} /> : <span className="size-5 rounded-full bg-panel-3" />}
                    <div className="min-w-0 flex-1"><span className="font-medium text-fg">{a?.name ?? "System"}</span> <span className="text-fg-2">{e.href ? <Link href={e.href} className="hover:underline">{e.summary}</Link> : e.summary}</span></div>
                    <span className="font-mono text-[10px] text-faint" title={e.createdAt}><Ago iso={e.createdAt} /></span>
                  </li>
                );
              })}
            </ul>
          </Panel>
        </section>
      ))}
    </div>
  );
}

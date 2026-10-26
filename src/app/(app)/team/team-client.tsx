"use client";

import { Ago } from "@/components/ui/time";
import { Check, Hand, Search, Users, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { TaskLink, TrackChip } from "@/components/tasks/bits";
import { Tabs, TabPanel } from "@/components/ui/overlay";
import { Avatar, Badge, Button, EmptyState, Input, Panel } from "@/components/ui/primitives";
import { useCommand } from "@/components/use-command";
import { useCan } from "@/components/workspace";
import { ROLE_LABEL, type PublicMember, type TaskClaim, type TrackId } from "@/lib/domain/types";
import { loadLabel, type Workload } from "@/lib/domain/workload";
import { cn } from "@/lib/utils";

interface Row { member: PublicMember; workload: Workload; current: { key: string; role: string }[]; completed: number; contributions: number }

export function TeamClient({ rows, claims }: { rows: Row[]; claims: (TaskClaim & { taskKey: string; taskTitle: string; trackId: TrackId })[] }) {
  const sp = useSearchParams();
  const [q, setQ] = useState("");
  const can = useCan();
  const { run } = useCommand();
  const shown = rows.filter((r) => !q || `${r.member.name} ${r.member.skills.join(" ")} ${r.member.primaryTrackId ?? ""} ${r.member.githubUsername ?? ""}`.toLowerCase().includes(q.toLowerCase()));
  const member = new Map(rows.map((r) => [r.member.id, r.member]));
  return (
    <div className="mx-auto max-w-[1400px] space-y-4 p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1">
          <h1 className="text-xl font-semibold">Team members</h1>
          <p className="text-[13px] text-muted">Only authenticated members and clearly labeled demo accounts appear here. Workload compares estimated remaining effort with self-reported availability — a planning aid, not a productivity measure.</p>
        </div>
        <div className="relative w-64"><Search className="absolute top-2 left-2 size-3.5 text-faint" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, skill, track…" className="h-7 pl-7 text-[13px]" aria-label="Search members" /></div>
      </div>
      <Tabs defaultValue={sp.get("tab") ?? "members"} tabs={[{ value: "members", label: <><Users /> Members ({rows.length})</> }, { value: "requests", label: <><Hand /> Assignment requests ({claims.length})</> }]}>
        <TabPanel value="members">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {shown.map(({ member: m, workload, current, completed, contributions }) => {
              const wl = loadLabel(workload.load);
              return (
                <Panel key={m.id} className="p-3">
                  <div className="flex items-start gap-3">
                    <Avatar name={m.name} color={m.avatarColor} size={36} />
                    <div className="min-w-0 flex-1">
                      <Link href={`/team/${m.id}`} className="text-[15px] font-semibold hover:underline">{m.name}</Link>
                      <div className="flex flex-wrap items-center gap-1.5 text-[13px] text-muted">
                        <span>{ROLE_LABEL[m.role]}</span>
                        {m.isDemo && <Badge tone="warn">demo account</Badge>}
                        {m.leadTrackIds.map((t) => <Badge key={t} tone="accent">Leads {t}</Badge>)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px]">
                    {m.primaryTrackId && <TrackChip trackId={m.primaryTrackId} withName />}
                    {m.secondaryTrackId && <span className="text-faint">+ {m.secondaryTrackId}</span>}
                    <span className="text-muted">· {m.experience} · {m.availabilityHours}h/wk</span>
                    {m.githubUsername && <a href={`https://github.com/${m.githubUsername}`} target="_blank" rel="noreferrer" className="font-mono text-info">@{m.githubUsername}</a>}
                  </div>
                  {m.skills.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{m.skills.slice(0, 6).map((s) => <Badge key={s}>{s}</Badge>)}</div>}
                  <div className="mt-3 border-t border-line pt-2 text-[13px]">
                    <div className="flex items-center justify-between">
                      <span className="text-muted">Workload</span>
                      <span className={cn(wl.tone === "warn" && "text-warn", wl.tone === "ok" && "text-ok", wl.tone === "info" && "text-info")}>{wl.label} · ~{workload.remainingHours}h remaining</span>
                    </div>
                    <div className="mt-1 h-1 rounded-full bg-panel-3"><div className={cn("h-full rounded-full", workload.load > 1.05 ? "bg-warn" : "bg-info")} style={{ width: `${Math.min(100, workload.load * 100)}%` }} /></div>
                    <div className="mt-2 flex flex-wrap gap-1">{current.map((c) => <Link key={c.key} href={`/tasks/${c.key}`} className={cn("rounded border px-1 font-mono text-xs", c.role === "owner" ? "border-info/40 text-info" : "border-line text-muted")}>{c.key}</Link>)}</div>
                    <div className="mt-1 text-muted">{completed} completed · {contributions} recorded contributions</div>
                  </div>
                </Panel>
              );
            })}
          </div>
        </TabPanel>
        <TabPanel value="requests">
          <Panel>
            {claims.length === 0 ? <EmptyState icon={<Hand />} title="No pending requests" /> : (
              <ul className="divide-y divide-line">
                {claims.map((c) => {
                  const m = member.get(c.memberId);
                  const ok = can("task.decideClaim", { task: { id: c.taskId, trackId: c.trackId } });
                  return (
                    <li key={c.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-[13px]">
                      {m && <Avatar name={m.name} color={m.avatarColor} size={20} />}
                      <span className="text-fg">{m?.name}</span>
                      <Badge tone={c.kind === "interest" ? "neutral" : "info"}>{c.kind}</Badge>
                      <TaskLink k={c.taskKey} title={c.taskTitle} className="min-w-0 flex-1" />
                      {c.message && <span className="text-muted">“{c.message}”</span>}
                      <span className="text-faint"><Ago iso={c.createdAt} /></span>
                      {ok && <><Button size="xs" variant="primary" onClick={() => run({ type: "claim.decide", claimId: c.id, approve: true })}><Check /> Approve</Button><Button size="xs" variant="ghost" onClick={() => run({ type: "claim.decide", claimId: c.id, approve: false })}><X /> Decline</Button></>}
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </TabPanel>
      </Tabs>
    </div>
  );
}

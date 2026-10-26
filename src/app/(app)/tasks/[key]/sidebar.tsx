"use client";

import { Ago } from "@/components/ui/time";
import { Check, CircleDot, GitBranch, GitCommit, GitMerge, GitPullRequest, Plus, RefreshCw, UserPlus, X } from "lucide-react";
import { useState, useTransition } from "react";
import { syncGithubLinks } from "@/app/actions/github";
import { Dialog } from "@/components/ui/overlay";
import { Avatar, Badge, Button, Field, Input, Select } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { useCommand } from "@/components/use-command";
import { useCan, useLookup, useWorkspace } from "@/components/workspace";
import { canAssignMember } from "@/lib/domain/assignment";
import { day } from "@/lib/utils";
import type { TaskDetailData } from "./task-detail";

function Card({ title, actions, children }: { title: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-panel">
      <div className="flex items-center gap-2 border-b border-line px-3 py-2">
        <h3 className="flex-1 text-[13px] font-semibold tracking-wider text-muted uppercase">{title}</h3>
        {actions}
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

export function TaskSidebar({ data }: { data: TaskDetailData }) {
  const { task, assignments } = data;
  const { member, sprint, milestone } = useLookup();
  const can = useCan();
  const { run } = useCommand();
  const { actor } = useWorkspace();
  const canAssign = can("task.assign", { task });
  const pendingClaims = data.claims.filter((c) => c.status === "pending");
  const reviewer = task.reviewerId ? member.get(task.reviewerId) : null;

  return (
    <aside className="space-y-3 lg:sticky lg:top-[120px] lg:max-h-[calc(100vh-140px)] lg:self-start lg:overflow-y-auto">
      <Card title="People" actions={canAssign ? <AssignDialog data={data} /> : null}>
        {assignments.length === 0 ? (
          <p className="text-[13px] text-muted">No one assigned yet.{task.claimable && task.status === "available" ? " Members can request or claim this task." : ""}</p>
        ) : (
          <ul className="space-y-2">
            {[...assignments].sort((a) => (a.role === "owner" ? -1 : 1)).map((a) => {
              const m = member.get(a.memberId);
              if (!m) return null;
              return (
                <li key={a.id} className="flex items-start gap-2">
                  <Avatar name={m.name} color={m.avatarColor} size={24} />
                  <div className="min-w-0 flex-1">
                    <a href={`/team/${m.id}`} className="block truncate text-[13px] font-medium text-fg hover:underline">{m.name}</a>
                    <div className="text-[13px] text-muted">{a.role === "owner" ? "Primary owner" : "Contributor"}{a.responsibility && a.responsibility !== "Primary owner" ? ` · ${a.responsibility}` : ""}</div>
                  </div>
                  {(canAssign || a.memberId === actor.id) && (
                    <button onClick={() => confirm(`Remove ${m.name} from ${task.key}?`) && run({ type: "task.unassign", assignmentId: a.id })} className="text-faint hover:text-danger" aria-label={`Unassign ${m.name}`}>
                      <X className="size-3.5" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <div className="mt-3 border-t border-line pt-2 text-[13px]">
          <span className="text-muted">Reviewer: </span>
          {reviewer ? <span className="text-fg">{reviewer.name}</span> : <span className="text-faint">Any track lead</span>}
        </div>
        {pendingClaims.length > 0 && (
          <div className="mt-3 space-y-1.5 border-t border-line pt-2">
            <div className="text-[13px] font-semibold text-muted uppercase">Requests & interest</div>
            {pendingClaims.map((c) => {
              const m = member.get(c.memberId);
              return (
                <div key={c.id} className="flex items-center gap-2 text-[13px]">
                  {m && <Avatar name={m.name} color={m.avatarColor} size={18} />}
                  <span className="min-w-0 flex-1 truncate">{m?.name} <span className="text-muted">· {c.kind}</span></span>
                  {can("task.decideClaim", { task }) && (
                    <>
                      <button onClick={() => run({ type: "claim.decide", claimId: c.id, approve: true })} className="rounded p-0.5 text-ok hover:bg-ok-soft" aria-label="Approve"><Check className="size-3.5" /></button>
                      <button onClick={() => run({ type: "claim.decide", claimId: c.id, approve: false })} className="rounded p-0.5 text-danger hover:bg-danger-soft" aria-label="Decline"><X className="size-3.5" /></button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card title="Planning">
        <dl className="grid grid-cols-[90px_1fr] gap-y-1.5 text-[13px]">
          <dt className="text-muted">Sprint</dt>
          <dd>{task.sprintId ? sprint.get(task.sprintId)?.name : <span className="text-faint">—</span>}</dd>
          <dt className="text-muted">Milestone</dt>
          <dd>{task.milestoneId ? <span title={milestone.get(task.milestoneId)?.description}>{milestone.get(task.milestoneId)?.name} <span className="text-faint">({day(milestone.get(task.milestoneId)?.targetDate)}, proposed)</span></span> : <span className="text-faint">—</span>}</dd>
          <dt className="text-muted">Target date</dt>
          <dd>{task.dueDate ? day(task.dueDate, "MMM d, yyyy") : <span className="text-faint">—</span>}</dd>
          <dt className="text-muted">Estimate</dt>
          <dd>{task.estimateHours}h <span className="text-faint">(planning estimate)</span></dd>
          <dt className="text-muted">Labels</dt>
          <dd className="flex flex-wrap gap-1">{task.labels.length ? task.labels.map((l) => <Badge key={l}>{l}</Badge>) : <span className="text-faint">—</span>}</dd>
          <dt className="text-muted">Updated</dt>
          <dd className="text-muted"><Ago iso={task.updatedAt} /></dd>
        </dl>
      </Card>

      <GithubCard data={data} />

      <Card title="Branch & PR conventions">
        <code className="block rounded bg-panel-2 px-2 py-1 font-mono text-[13px] break-all text-fg-2">feature/{task.key}-{task.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40)}</code>
        <code className="mt-1 block rounded bg-panel-2 px-2 py-1 font-mono text-[13px] text-fg-2">[{task.key}] {task.title}</code>
      </Card>
    </aside>
  );
}

function AssignDialog({ data }: { data: TaskDetailData }) {
  const { members, actor } = useWorkspace();
  const [open, setOpen] = useState(false);
  const { run, pending } = useCommand();
  const eligible = members.filter((m) => canAssignMember(actor, data.task, m).ok);
  return (
    <Dialog open={open} onOpenChange={setOpen} title={`Assign ${data.task.key}`} description="A task has one primary owner and any number of contributors with distinct responsibilities." trigger={<Button size="xs" variant="ghost"><UserPlus /> Assign</Button>}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          void run({ type: "task.assign", taskId: data.task.id, memberId: String(f.get("member")), role: f.get("role") as "owner" | "contributor", responsibility: String(f.get("resp") ?? "") }, { onSuccess: () => setOpen(false) });
        }}
      >
        <Field label="Member">
          <Select name="member" required defaultValue="">
            <option value="" disabled>Select member…</option>
            {eligible.map((m) => <option key={m.id} value={m.id}>{m.name}{m.isDemo ? " (demo)" : ""} — {m.primaryTrackId ?? "no track"}, {m.availabilityHours}h/wk</option>)}
          </Select>
        </Field>
        <Field label="Role">
          <Select name="role" defaultValue={data.assignments.some((a) => a.role === "owner") ? "contributor" : "owner"}>
            <option value="owner">Primary owner</option>
            <option value="contributor">Supporting contributor</option>
          </Select>
        </Field>
        <Field label="Responsibility" hint="e.g. 'S-Theta* port', 'benchmark harness'"><Input name="resp" maxLength={200} /></Field>
        <div className="flex justify-end"><Button type="submit" variant="primary" disabled={pending}>Assign</Button></div>
      </form>
    </Dialog>
  );
}

function GithubCard({ data }: { data: TaskDetailData }) {
  const can = useCan();
  const { run, pending } = useCommand();
  const toast = useToast();
  const [url, setUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [syncing, startSync] = useTransition();
  const canLink = can("task.github", { task: data.task, assignments: data.assignments });
  const icon = (k: string, state: string) => (k === "pr" ? (state === "merged" ? <GitMerge className="text-violet" /> : <GitPullRequest className={state === "open" ? "text-ok" : state === "closed" ? "text-danger" : "text-muted"} />) : k === "issue" ? <CircleDot /> : k === "commit" ? <GitCommit /> : <GitBranch />);
  return (
    <Card
      title="GitHub"
      actions={
        <div className="flex gap-1">
          {data.links.length > 0 && (
            <button
              disabled={syncing}
              onClick={() => startSync(async () => { const r = await syncGithubLinks(data.task.id); toast(r.ok ? "ok" : "error", r.ok ? r.message : r.error); })}
              className="rounded p-0.5 text-muted hover:text-fg"
              aria-label="Refresh PR status from GitHub"
              title="Refresh status from GitHub"
            >
              <RefreshCw className={`size-3.5 ${syncing ? "animate-spin" : ""}`} />
            </button>
          )}
          {canLink && <button onClick={() => setAdding(!adding)} className="rounded p-0.5 text-muted hover:text-fg" aria-label="Link GitHub item"><Plus className="size-3.5" /></button>}
        </div>
      }
    >
      {adding && (
        <form className="mb-2 flex gap-1.5" onSubmit={(e) => { e.preventDefault(); void run({ type: "github.link", taskId: data.task.id, url, title: "" }, { onSuccess: () => { setUrl(""); setAdding(false); } }); }}>
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="PR, issue, commit or branch URL" className="h-7 text-[13px]" type="url" required />
          <Button type="submit" size="sm" disabled={pending}>Link</Button>
        </form>
      )}
      {data.links.length === 0 ? (
        <p className="text-[13px] text-muted">No pull requests or issues linked. A merged PR does not complete the task — review does.</p>
      ) : (
        <ul className="space-y-1.5">
          {data.links.map((l) => (
            <li key={l.id} className="flex items-start gap-2 text-[13px] [&_svg]:size-3.5">
              <span className="mt-0.5">{icon(l.kind, l.state)}</span>
              <div className="min-w-0 flex-1">
                <a href={l.url} target="_blank" rel="noreferrer" className="block truncate text-fg hover:text-info">{l.title}</a>
                <div className="text-xs text-muted">
                  {l.kind} · {l.state}{l.checks !== "unknown" ? ` · checks ${l.checks}` : ""}{l.syncedAt ? <> · synced <Ago iso={l.syncedAt} /></> : " · not synced"}
                </div>
              </div>
              {canLink && <button onClick={() => run({ type: "github.unlink", linkId: l.id })} className="text-faint hover:text-danger" aria-label="Unlink"><X /></button>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

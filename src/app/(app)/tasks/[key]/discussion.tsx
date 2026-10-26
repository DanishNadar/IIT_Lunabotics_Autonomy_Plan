"use client";

import { Ago } from "@/components/ui/time";
import { AlertOctagon, CheckCircle2, Eye, HelpCircle, MessageSquare, Pencil, Reply } from "lucide-react";
import { useState } from "react";
import { Markdown } from "@/components/ui/markdown";
import { Avatar, Badge, Button, Select, Textarea } from "@/components/ui/primitives";
import { useCommand } from "@/components/use-command";
import { useCan, useLookup, useWorkspace } from "@/components/workspace";
import { mentionHandle } from "@/lib/domain/commands";
import type { TaskComment } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import { Section } from "./section";
import type { TaskDetailData } from "./task-detail";

const KIND = {
  discussion: { label: "Discussion", icon: <MessageSquare />, tone: "neutral" as const },
  question: { label: "Technical question", icon: <HelpCircle />, tone: "info" as const },
  review: { label: "Review note", icon: <Eye />, tone: "violet" as const },
  blocker: { label: "Blocker", icon: <AlertOctagon />, tone: "danger" as const },
};

export function DiscussionSection({ data }: { data: TaskDetailData }) {
  const can = useCan();
  const canComment = can("task.comment", { task: data.task });
  const roots = data.comments.filter((c) => !c.parentId);
  const openBlockers = data.blockers.filter((b) => !b.resolvedAt);
  return (
    <Section id="discussion" letter="K" title="Discussion" subtitle="Markdown, code blocks and @mentions (e.g. @first.last or a GitHub username) are supported">
      {data.blockers.length > 0 && <BlockerList data={data} />}
      {roots.length === 0 && openBlockers.length === 0 && <p className="mb-3 text-xs text-muted">No discussion yet. Ask questions here so answers stay with the work.</p>}
      <div className="space-y-3">
        {roots.map((c) => (
          <Thread key={c.id} comment={c} all={data.comments} taskId={data.task.id} canComment={canComment} />
        ))}
      </div>
      {canComment && (
        <div className="mt-4">
          <Composer taskId={data.task.id} parentId={null} />
        </div>
      )}
    </Section>
  );
}

function BlockerList({ data }: { data: TaskDetailData }) {
  const { member } = useLookup();
  const can = useCan();
  const { run } = useCommand();
  const [resolving, setResolving] = useState<string | null>(null);
  const [resolution, setResolution] = useState("");
  const canResolve = can("task.blocker", { task: data.task, assignments: data.assignments });
  return (
    <div className="mb-4 space-y-1.5">
      {data.blockers.map((b) => (
        <div key={b.id} className={cn("rounded-md border px-3 py-2 text-xs", b.resolvedAt ? "border-line bg-panel-2 text-muted" : "border-danger/30 bg-danger-soft")}>
          <div className="flex items-start gap-2">
            {b.resolvedAt ? <CheckCircle2 className="mt-0.5 size-3.5 text-ok" /> : <AlertOctagon className="mt-0.5 size-3.5 text-danger" />}
            <div className="flex-1">
              <p className={b.resolvedAt ? "line-through" : "text-fg"}>{b.description}</p>
              <p className="text-[11px] text-muted">
                Raised by {member.get(b.raisedBy)?.name} · <Ago iso={b.createdAt} />
                {b.resolvedAt && ` · resolved $<Ago iso={b.resolvedAt} />${b.resolution ? ` — ${b.resolution}` : ""}`}
              </p>
            </div>
            {!b.resolvedAt && canResolve && resolving !== b.id && <Button size="xs" onClick={() => setResolving(b.id)}>Resolve</Button>}
          </div>
          {resolving === b.id && (
            <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); void run({ type: "blocker.resolve", blockerId: b.id, resolution }, { onSuccess: () => { setResolving(null); setResolution(""); } }); }}>
              <input value={resolution} onChange={(e) => setResolution(e.target.value)} placeholder="How was it resolved?" className="h-7 flex-1 rounded border border-line bg-panel px-2 text-xs" />
              <Button type="submit" size="sm" variant="primary">Resolve</Button>
            </form>
          )}
        </div>
      ))}
    </div>
  );
}

function Thread({ comment, all, taskId, canComment }: { comment: TaskComment; all: TaskComment[]; taskId: string; canComment: boolean }) {
  const replies = all.filter((c) => c.parentId === comment.id);
  const [replying, setReplying] = useState(false);
  return (
    <div id={`comment-${comment.id}`} className="scroll-mt-36 rounded-md border border-line bg-panel-2">
      <CommentBody c={comment} />
      {replies.length > 0 && (
        <div className="space-y-0 border-t border-line pl-6">
          {replies.map((r) => (
            <div key={r.id} id={`comment-${r.id}`} className="scroll-mt-36 border-b border-line last:border-0">
              <CommentBody c={r} />
            </div>
          ))}
        </div>
      )}
      {canComment && (
        <div className="border-t border-line px-3 py-1.5">
          {replying ? <Composer taskId={taskId} parentId={comment.id} onDone={() => setReplying(false)} compact /> : (
            <button onClick={() => setReplying(true)} className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-fg"><Reply className="size-3" /> Reply</button>
          )}
        </div>
      )}
    </div>
  );
}

function CommentBody({ c }: { c: TaskComment }) {
  const { member } = useLookup();
  const a = member.get(c.authorId);
  const k = KIND[c.kind];
  return (
    <div className="px-3 py-2">
      <div className="mb-1 flex items-center gap-2 text-xs">
        {a && <Avatar name={a.name} color={a.avatarColor} size={18} />}
        <span className="font-medium text-fg">{a?.name ?? "Unknown"}</span>
        {c.kind !== "discussion" && <Badge tone={k.tone}>{k.icon}{k.label}</Badge>}
        <span className="text-[11px] text-faint"><Ago iso={c.createdAt} /></span>
      </div>
      <Markdown className="text-[13px]">{c.body}</Markdown>
    </div>
  );
}

function Composer({ taskId, parentId, onDone, compact }: { taskId: string; parentId: string | null; onDone?: () => void; compact?: boolean }) {
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<TaskComment["kind"]>("discussion");
  const [preview, setPreview] = useState(false);
  const { members } = useWorkspace();
  const { run, pending } = useCommand();
  const mentionQuery = /@([\w.-]*)$/.exec(body)?.[1];
  const suggestions = mentionQuery !== undefined ? members.filter((m) => m.active && (mentionHandle(m.name).includes(mentionQuery.toLowerCase()) || (m.githubUsername ?? "").toLowerCase().includes(mentionQuery.toLowerCase()))).slice(0, 5) : [];
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void run({ type: "comment.add", taskId, parentId, kind, body }, { quiet: true, onSuccess: () => { setBody(""); onDone?.(); } });
      }}
      className="space-y-2"
    >
      <div className="flex items-center gap-2">
        {!parentId && (
          <Select value={kind} onChange={(e) => setKind(e.target.value as TaskComment["kind"])} className="h-7 w-44 text-xs" aria-label="Comment type">
            {Object.entries(KIND).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
        )}
        <button type="button" onClick={() => setPreview(!preview)} className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-fg"><Pencil className="size-3" /> {preview ? "Edit" : "Preview"}</button>
      </div>
      <div className="relative">
        {preview ? (
          <div className="min-h-[72px] rounded-md border border-line bg-panel p-2"><Markdown>{body || "_Nothing to preview_"}</Markdown></div>
        ) : (
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder={parentId ? "Reply…" : "Write a comment. Use ``` for code blocks and @ to mention."} className={compact ? "min-h-[56px]" : ""} required aria-label="Comment" />
        )}
        {suggestions.length > 0 && !preview && (
          <div className="absolute bottom-full left-2 z-10 mb-1 w-56 rounded-md border border-line-strong bg-panel p-1 shadow-[var(--shadow)]">
            {suggestions.map((m) => (
              <button type="button" key={m.id} onClick={() => setBody(body.replace(/@([\w.-]*)$/, `@${m.githubUsername || mentionHandle(m.name)} `))} className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-panel-3">
                <Avatar name={m.name} color={m.avatarColor} size={16} />
                <span className="truncate">{m.name}</span>
                <span className="ml-auto font-mono text-[10px] text-faint">@{m.githubUsername || mentionHandle(m.name)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2">
        {onDone && <Button size="sm" variant="ghost" onClick={onDone}>Cancel</Button>}
        <Button type="submit" size="sm" variant="primary" disabled={pending || !body.trim()}>{parentId ? "Reply" : "Comment"}</Button>
      </div>
    </form>
  );
}

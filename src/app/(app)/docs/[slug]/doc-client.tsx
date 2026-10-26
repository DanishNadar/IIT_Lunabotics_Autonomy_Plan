"use client";

import { Ago } from "@/components/ui/time";
import { Bold, Code, Eye, Heading2, History, Italic, Link2, List, Pencil, RotateCcw, Table } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { Markdown } from "@/components/ui/markdown";
import { Badge, Button, Input, Panel, PanelHeader } from "@/components/ui/primitives";
import { useCommand } from "@/components/use-command";
import { useCan, useLookup } from "@/components/workspace";
import type { Document, DocumentRevision } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

export function DocClient({ doc, revisions }: { doc: Document; revisions: DocumentRevision[] }) {
  const can = useCan();
  const { member } = useLookup();
  const { run, pending } = useCommand();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(doc.title);
  const [body, setBody] = useState(doc.body);
  const [tags, setTags] = useState(doc.tags.join(", "));
  const [summary, setSummary] = useState("");
  const [split, setSplit] = useState(true);
  const [viewRev, setViewRev] = useState<DocumentRevision | null>(null);
  const ta = useRef<HTMLTextAreaElement>(null);

  const wrap = (before: string, after = before, placeholder = "text") => {
    const el = ta.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    const sel = body.slice(s, e) || placeholder;
    const next = body.slice(0, s) + before + sel + after + body.slice(e);
    setBody(next);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + before.length, s + before.length + sel.length); });
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <Link href="/docs" className="text-[11px] text-muted hover:text-fg">Knowledge base /</Link>
          {editing ? <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 text-lg font-semibold" aria-label="Title" /> : <h1 className="text-xl font-semibold">{doc.title}</h1>}
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
            <Badge>{doc.category}</Badge>
            {doc.status !== "published" && <Badge tone="warn">{doc.status.replace("_", " ")}</Badge>}
            {doc.tags.map((t) => <span key={t}>#{t}</span>)}
            <span>· owner {doc.ownerId ? member.get(doc.ownerId)?.name : "unassigned"} · updated <Ago iso={doc.updatedAt} /> · {revisions.length} revision(s)</span>
          </div>
        </div>
        {can("doc.edit") && !editing && <Button onClick={() => setEditing(true)}><Pencil /> Edit</Button>}
        {editing && (
          <>
            <Button variant="ghost" onClick={() => { setEditing(false); setBody(doc.body); setTitle(doc.title); }}>Cancel</Button>
            <Button variant="primary" disabled={pending} onClick={() => run({ type: "doc.update", docId: doc.id, title, body, tags: tags.split(",").map((x) => x.trim()).filter(Boolean), summary }, { onSuccess: () => setEditing(false) })}>Save revision</Button>
          </>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-4">
          {doc.adr && !editing && (
            <Panel>
              <PanelHeader title="Architecture decision record" actions={<Badge tone={doc.adr.status === "accepted" ? "ok" : doc.adr.status === "open" ? "warn" : "info"}>{doc.adr.status}</Badge>} />
              <div className="space-y-3 p-4 text-xs">
                <div><h3 className="mb-0.5 font-semibold text-muted uppercase">Context</h3><p className="text-fg-2">{doc.adr.context}</p></div>
                <div>
                  <h3 className="mb-1 font-semibold text-muted uppercase">Alternatives</h3>
                  <table className="w-full"><thead><tr className="text-left text-faint"><th className="pb-1">Option</th><th className="pb-1">Pros</th><th className="pb-1">Cons</th></tr></thead>
                    <tbody>{doc.adr.alternatives.map((a) => <tr key={a.name} className="border-t border-line align-top"><td className="py-1.5 pr-2 font-medium text-fg">{a.name}</td><td className="py-1.5 pr-2 text-ok">{a.pros}</td><td className="py-1.5 text-warn">{a.cons}</td></tr>)}</tbody>
                  </table>
                </div>
                <div><h3 className="mb-0.5 font-semibold text-muted uppercase">Evidence</h3><p className="text-fg-2">{doc.adr.evidence}</p></div>
                <div className="rounded-md border border-info/30 bg-info-soft p-2"><h3 className="mb-0.5 font-semibold text-info uppercase">Decision</h3><p className="text-fg">{doc.adr.decision}</p></div>
                <div><h3 className="mb-0.5 font-semibold text-muted uppercase">Trade-offs</h3><p className="text-fg-2">{doc.adr.tradeoffs}</p></div>
              </div>
            </Panel>
          )}
          {viewRev && !editing && (
            <div className="flex items-center gap-2 rounded-md border border-warn/30 bg-warn-soft px-3 py-2 text-xs text-warn">
              Viewing revision from <Ago iso={viewRev.createdAt} /> ({viewRev.summary}).
              <button className="underline" onClick={() => setViewRev(null)}>Back to current</button>
              {can("doc.edit") && <Button size="xs" className="ml-auto" onClick={() => run({ type: "doc.restore", revisionId: viewRev.id }, { onSuccess: () => setViewRev(null) })}><RotateCcw /> Restore this revision</Button>}
            </div>
          )}
          <Panel className="p-5">
            {editing ? (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-1 border-b border-line pb-2">
                  {[[<Bold key="b" />, () => wrap("**"), "Bold"], [<Italic key="i" />, () => wrap("_"), "Italic"], [<Heading2 key="h" />, () => wrap("\n## ", "", "Heading"), "Heading"], [<List key="l" />, () => wrap("\n- ", "", "item"), "List"], [<Code key="c" />, () => wrap("\n```bash\n", "\n```\n", "command"), "Code block"], [<Link2 key="k" />, () => wrap("[", "](https://)", "link"), "Link"], [<Table key="t" />, () => wrap("\n| Column | Column |\n|---|---|\n| ", " | |\n", "value"), "Table"]].map(([icon, fn, label]) => (
                    <button key={label as string} type="button" onClick={fn as () => void} className="rounded p-1.5 text-muted hover:bg-panel-3 hover:text-fg [&_svg]:size-3.5" title={label as string} aria-label={label as string}>{icon as React.ReactNode}</button>
                  ))}
                  <button type="button" onClick={() => setSplit(!split)} className={cn("ml-auto flex items-center gap-1 rounded px-2 py-1 text-[11px]", split ? "bg-panel-3 text-fg" : "text-muted")}><Eye className="size-3" /> Live preview</button>
                </div>
                <div className={cn("grid gap-3", split && "lg:grid-cols-2")}>
                  <textarea ref={ta} value={body} onChange={(e) => setBody(e.target.value)} className="min-h-[60vh] w-full resize-y rounded-md border border-line bg-panel-2 p-3 font-mono text-xs leading-relaxed text-fg focus:border-info/60 focus:outline-none" aria-label="Document body (Markdown)" />
                  {split && <div className="max-h-[70vh] overflow-y-auto rounded-md border border-line p-3"><Markdown>{body}</Markdown></div>}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tags, comma separated" className="text-xs" aria-label="Tags" />
                  <Input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Revision summary (what changed?)" className="text-xs" aria-label="Revision summary" />
                </div>
              </div>
            ) : (
              <Markdown>{viewRev ? viewRev.body : doc.body}</Markdown>
            )}
          </Panel>
        </div>
        <Panel className="self-start">
          <PanelHeader title="Revisions" icon={<History />} />
          <ul className="max-h-[60vh] divide-y divide-line overflow-y-auto">
            {revisions.map((r, i) => (
              <li key={r.id}>
                <button onClick={() => setViewRev(i === 0 ? null : r)} className={cn("block w-full px-3 py-2 text-left text-xs hover:bg-panel-2", viewRev?.id === r.id && "bg-panel-3")}>
                  <div className="text-fg">{r.summary}{i === 0 && <span className="ml-1 text-[10px] text-ok">current</span>}</div>
                  <div className="text-[10px] text-muted">{r.authorId ? member.get(r.authorId)?.name : "Seed"} · <Ago iso={r.createdAt} /></div>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

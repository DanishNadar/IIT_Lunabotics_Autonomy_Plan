"use client";

import { CheckSquare, ExternalLink, FolderGit2, Plus, Search, ShieldAlert, ShieldCheck, Square, Trash2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Dialog } from "@/components/ui/overlay";
import { Badge, Button, EmptyState, Field, Input, Panel, PanelHeader, Select, Textarea } from "@/components/ui/primitives";
import { useCommand } from "@/components/use-command";
import { useCan, useWorkspace } from "@/components/workspace";
import { DIFFICULTIES, RESOURCE_TYPES, RESOURCE_TYPE_LABEL, type Repository, type ResearchTodo, type Resource, type ResourceType, type TrackId } from "@/lib/domain/types";
import { cn, day } from "@/lib/utils";

export function ResourcesClient({ resources, usage, todos, repositories }: { resources: Resource[]; usage: Record<string, string[]>; todos: ResearchTodo[]; repositories: Repository[] }) {
  const sp = useSearchParams();
  const { tracks } = useWorkspace();
  const can = useCan();
  const { run } = useCommand();
  const [q, setQ] = useState("");
  const [type, setType] = useState<ResourceType | "">("");
  const [track, setTrack] = useState<string>(sp.get("track") ?? "");
  const [verified, setVerified] = useState<"" | "yes" | "no">("");
  const focus = sp.get("focus");
  const shown = useMemo(
    () =>
      resources
        .filter((r) => (!q || `${r.title} ${r.publisher} ${r.why} ${r.topics.join(" ")}`.toLowerCase().includes(q.toLowerCase())) && (!type || r.type === type) && (!track || r.trackIds.includes(track as TrackId)) && (!verified || (verified === "yes" ? !!r.lastVerified : !r.lastVerified)))
        .sort((a, b) => (a.id === focus ? -1 : b.id === focus ? 1 : 0) || a.type.localeCompare(b.type) || a.title.localeCompare(b.title)),
    [resources, q, type, track, verified, focus],
  );
  return (
    <div className="mx-auto max-w-[1500px] space-y-4 p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1">
          <h1 className="text-xl font-semibold">Resources</h1>
          <p className="max-w-3xl text-xs text-muted">Seeded links were checked for reachability on their verified date. No video durations or publication dates are recorded unless measured. Specific videos still to be chosen are tracked as research TODOs rather than guessed.</p>
        </div>
        {can("resource.add") && <AddResource defaultOpen={sp.get("add") === "1"} />}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-72"><Search className="absolute top-2 left-2 size-3.5 text-faint" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, topic, publisher…" className="h-7 pl-7 text-xs" aria-label="Search resources" /></div>
            <Select value={type} onChange={(e) => setType(e.target.value as ResourceType | "")} className="h-7 w-48 text-xs" aria-label="Type"><option value="">All types</option>{RESOURCE_TYPES.map((t) => <option key={t} value={t}>{RESOURCE_TYPE_LABEL[t]}</option>)}</Select>
            <Select value={track} onChange={(e) => setTrack(e.target.value)} className="h-7 w-52 text-xs" aria-label="Track collection"><option value="">All track collections</option>{tracks.map((t) => <option key={t.id} value={t.id}>{t.id} — {t.name}</option>)}</Select>
            <Select value={verified} onChange={(e) => setVerified(e.target.value as typeof verified)} className="h-7 w-36 text-xs" aria-label="Verification"><option value="">Any status</option><option value="yes">Verified</option><option value="no">Unverified</option></Select>
            <span className="ml-auto font-mono text-[11px] text-muted">{shown.length} resources</span>
          </div>
          <div className="grid gap-2 md:grid-cols-2 2xl:grid-cols-3">
            {shown.map((r) => (
              <div key={r.id} className={cn("flex flex-col rounded-lg border bg-panel p-3", r.id === focus ? "border-info" : "border-line")}>
                <div className="flex items-start gap-2">
                  <a href={r.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 text-[13px] font-medium text-fg hover:text-info">{r.title}</a>
                  <ExternalLink className="size-3.5 shrink-0 text-faint" />
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
                  <Badge>{RESOURCE_TYPE_LABEL[r.type]}</Badge>
                  <span>{r.publisher}</span>
                  {r.difficulty && <span>· {r.difficulty}</span>}
                  {r.duration && <span>· {r.duration}</span>}
                </div>
                <p className="mt-1.5 flex-1 text-xs text-fg-2">{r.why}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1">
                  {r.trackIds.map((t) => <span key={t} className="font-mono text-[10px] text-muted">{t}</span>)}
                  {usage[r.id]?.length > 0 && <span className="text-[10px] text-faint">· used by {usage[r.id].slice(0, 4).join(", ")}{usage[r.id].length > 4 ? "…" : ""}</span>}
                </div>
                <div className="mt-2 flex items-center gap-2 border-t border-line pt-2 text-[10px]">
                  {r.lastVerified ? <span className="flex items-center gap-1 text-ok"><ShieldCheck className="size-3" /> Verified {day(r.lastVerified, "MMM d, yyyy")}</span> : <span className="flex items-center gap-1 text-warn"><ShieldAlert className="size-3" /> Unverified</span>}
                  {can("resource.manage") && (
                    <span className="ml-auto flex gap-1">
                      <Button size="xs" variant="ghost" onClick={() => run({ type: "resource.verify", resourceId: r.id })} title="I opened this link today and it is correct">Mark verified today</Button>
                      <Button size="xs" variant="ghost" onClick={() => confirm(`Remove “${r.title}”?`) && run({ type: "resource.delete", resourceId: r.id })} aria-label="Delete resource"><Trash2 /></Button>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          {!shown.length && <Panel><EmptyState title="No resources match" /></Panel>}
        </div>

        <div className="space-y-4">
          <Panel>
            <PanelHeader title="Reference repositories" icon={<FolderGit2 />} />
            <ul className="divide-y divide-line">
              {repositories.map((r) => (
                <li key={r.id} className="px-3 py-2 text-xs">
                  <a href={r.url} target="_blank" rel="noreferrer" className="font-mono text-info hover:underline">{r.owner}/{r.name}</a>
                  <div className="text-[11px] text-muted">{r.team} · {r.defaultBranch}</div>
                  <p className="text-fg-2">{r.description}</p>
                </li>
              ))}
            </ul>
          </Panel>
          <ResearchTodos todos={todos} />
        </div>
      </div>
    </div>
  );
}

function ResearchTodos({ todos }: { todos: ResearchTodo[] }) {
  const can = useCan();
  const { run } = useCommand();
  const [topic, setTopic] = useState("");
  return (
    <Panel>
      <PanelHeader title="Resource research TODOs" subtitle="Things we chose not to guess" />
      <ul className="divide-y divide-line">
        {todos.map((t) => (
          <li key={t.id} className="flex items-start gap-2 px-3 py-2 text-xs">
            <button disabled={!can("resource.add")} onClick={() => run({ type: "researchTodo.toggle", todoId: t.id }, { quiet: true })} className="mt-0.5 text-muted hover:text-fg" aria-label={t.status === "done" ? "Reopen" : "Mark done"}>
              {t.status === "done" ? <CheckSquare className="size-3.5 text-ok" /> : <Square className="size-3.5" />}
            </button>
            <div className={cn("min-w-0 flex-1", t.status === "done" && "opacity-60")}>
              <div className="text-fg">{t.topic}{t.trackId && <span className="ml-1 font-mono text-[10px] text-muted">{t.trackId}</span>}</div>
              {t.note && <p className="text-[11px] text-muted">{t.note}</p>}
            </div>
          </li>
        ))}
      </ul>
      {can("resource.add") && (
        <form className="flex gap-2 border-t border-line p-2" onSubmit={(e) => { e.preventDefault(); void run({ type: "researchTodo.add", topic, note: "", trackId: null, taskId: null }, { quiet: true, onSuccess: () => setTopic("") }); }}>
          <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="New research TODO" className="h-7 text-xs" required minLength={3} />
          <Button type="submit" size="sm"><Plus /></Button>
        </form>
      )}
    </Panel>
  );
}

function AddResource({ defaultOpen }: { defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const { run, pending } = useCommand();
  const { tracks } = useWorkspace();
  return (
    <Dialog open={open} onOpenChange={setOpen} title="Add a resource" description="Only add links you opened yourself. Do not invent durations or dates. Member additions are unverified until a lead checks them." trigger={<Button variant="primary"><Plus /> Add resource</Button>} wide>
      <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        void run({ type: "resource.add", taskId: null, category: "text_tutorial", resource: { title: f.get("title"), url: f.get("url"), publisher: f.get("publisher"), type: f.get("type"), difficulty: f.get("difficulty") || null, duration: f.get("duration") || null, why: f.get("why"), topics: String(f.get("topics") ?? "").split(",").map((x) => x.trim()).filter(Boolean), trackIds: f.getAll("tracks") } }, { onSuccess: () => setOpen(false) });
      }}>
        <Field label="Title" className="sm:col-span-2"><Input name="title" required minLength={3} /></Field>
        <Field label="URL" className="sm:col-span-2"><Input name="url" type="url" required /></Field>
        <Field label="Publisher"><Input name="publisher" required /></Field>
        <Field label="Type"><Select name="type" defaultValue="tutorial">{RESOURCE_TYPES.map((t) => <option key={t} value={t}>{RESOURCE_TYPE_LABEL[t]}</option>)}</Select></Field>
        <Field label="Difficulty"><Select name="difficulty" defaultValue=""><option value="">—</option>{DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}</Select></Field>
        <Field label="Duration (if measured)"><Input name="duration" /></Field>
        <Field label="Why it matters" className="sm:col-span-2"><Textarea name="why" required minLength={10} /></Field>
        <Field label="Topics" hint="Comma separated" className="sm:col-span-2"><Input name="topics" /></Field>
        <fieldset className="flex flex-wrap gap-2 text-xs sm:col-span-2">{tracks.map((t) => <label key={t.id} className="flex items-center gap-1"><input type="checkbox" name="tracks" value={t.id} /> {t.id}</label>)}</fieldset>
        <div className="flex justify-end sm:col-span-2"><Button type="submit" variant="primary" disabled={pending}>Add</Button></div>
      </form>
    </Dialog>
  );
}

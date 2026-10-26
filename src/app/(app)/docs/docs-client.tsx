"use client";

import { Ago } from "@/components/ui/time";
import { BookOpen, FileText, Plus, Scale, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Dialog } from "@/components/ui/overlay";
import { Badge, Button, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { useCommand } from "@/components/use-command";
import { useCan, useLookup } from "@/components/workspace";
import type { Document } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

const CATS: Record<Document["category"], string> = { onboarding: "Onboarding", standards: "Standards", architecture: "Architecture", decision: "Decision records", operations: "Operations", competition: "Competition" };

type Row = { id: string; slug: string; title: string; category: Document["category"]; tags: string[]; status: Document["status"]; updatedAt: string; ownerId: string | null; adrStatus: string | null; excerpt: string; body: string };

export function DocsClient({ docs }: { docs: Row[] }) {
  const [q, setQ] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const can = useCan();
  const { member } = useLookup();
  const tags = [...new Set(docs.flatMap((d) => d.tags))].sort();
  const shown = docs.filter((d) => (!q || `${d.title} ${d.body}`.toLowerCase().includes(q.toLowerCase())) && (!tag || d.tags.includes(tag)));
  return (
    <div className="mx-auto max-w-[1300px] space-y-4 p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1">
          <h1 className="text-xl font-semibold">Knowledge base</h1>
          <p className="text-xs text-muted">Team standards, architecture notes and decision records. Every edit is kept as a revision.</p>
        </div>
        <div className="relative w-64"><Search className="absolute top-2 left-2 size-3.5 text-faint" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search documents…" className="h-7 pl-7 text-xs" aria-label="Search documents" /></div>
        {can("doc.edit") && <NewDoc />}
      </div>
      <div className="flex flex-wrap gap-1">
        <button onClick={() => setTag(null)} className={cn("rounded border px-2 py-0.5 text-[11px]", !tag ? "border-info/50 text-info" : "border-line text-muted")}>All</button>
        {tags.map((t) => <button key={t} onClick={() => setTag(tag === t ? null : t)} className={cn("rounded border px-2 py-0.5 text-[11px]", tag === t ? "border-info/50 text-info" : "border-line text-muted")}>#{t}</button>)}
      </div>
      {(Object.keys(CATS) as Document["category"][]).map((c) => {
        const list = shown.filter((d) => d.category === c);
        if (!list.length) return null;
        return (
          <section key={c}>
            <h2 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-muted uppercase">{c === "decision" ? <Scale className="size-3.5" /> : <BookOpen className="size-3.5" />}{CATS[c]}</h2>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {list.map((d) => (
                <Link key={d.id} href={`/docs/${d.slug}`} className="rounded-lg border border-line bg-panel p-3 hover:border-line-strong">
                  <div className="flex items-center gap-2"><FileText className="size-3.5 text-muted" /><span className="flex-1 truncate text-[13px] font-medium">{d.title}</span>{d.adrStatus && <Badge tone={d.adrStatus === "accepted" ? "ok" : d.adrStatus === "open" ? "warn" : "info"}>{d.adrStatus}</Badge>}{d.status !== "published" && <Badge tone="warn">{d.status.replace("_", " ")}</Badge>}</div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted">{d.excerpt}</p>
                  <div className="mt-1.5 text-[10px] text-faint">{d.ownerId ? member.get(d.ownerId)?.name : "Seeded"} · updated <Ago iso={d.updatedAt} /></div>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function NewDoc() {
  const [open, setOpen] = useState(false);
  const { run, pending } = useCommand();
  const router = useRouter();
  return (
    <Dialog open={open} onOpenChange={setOpen} title="New document" trigger={<Button variant="primary"><Plus /> New document</Button>} wide>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); void run({ type: "doc.create", title: String(f.get("title")), category: f.get("category") as Document["category"], body: String(f.get("body")), tags: String(f.get("tags") ?? "").split(",").map((x) => x.trim()).filter(Boolean) }, { onSuccess: (r) => { setOpen(false); router.push(`/docs/${r.data?.slug}`); } }); }}>
        <Field label="Title"><Input name="title" required minLength={3} /></Field>
        <Field label="Category"><Select name="category" defaultValue="standards">{Object.entries(CATS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
        <Field label="Tags" hint="Comma separated"><Input name="tags" /></Field>
        <Field label="Body (Markdown, Mermaid supported in ```mermaid blocks)"><Textarea name="body" className="min-h-48 font-mono text-xs" defaultValue={"# Title\n\n"} /></Field>
        <div className="flex justify-end"><Button type="submit" variant="primary" disabled={pending}>Create</Button></div>
      </form>
    </Dialog>
  );
}

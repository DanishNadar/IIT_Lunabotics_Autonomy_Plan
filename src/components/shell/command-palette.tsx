"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Command } from "cmdk";
import { BookOpen, Box, FileText, FlaskConical, GitBranch, GraduationCap, Layers, Library, Loader2, Search, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { SearchHit } from "@/lib/domain/search";

const ICON: Record<SearchHit["kind"], React.ReactNode> = {
  task: <FileText />,
  member: <User />,
  track: <Layers />,
  doc: <BookOpen />,
  resource: <Library />,
  experiment: <FlaskConical />,
  repository: <GitBranch />,
  path: <GraduationCap />,
};

const QUICK = [
  { label: "All Tasks", href: "/board" },
  { label: "🧠 Autonomy General", href: "/tracks/AG" },
  { label: "My Work", href: "/my-work" },
  { label: "Dependency Graph", href: "/graph" },
  { label: "Mission Readiness", href: "/readiness" },
  { label: "Sprint Planning", href: "/sprints" },
  { label: "ROS Architecture", href: "/architecture" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const ctrl = useRef<AbortController | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("open-palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("open-palette", onOpen);
    };
  }, []);

  // Debounced server search.
  useEffect(() => {
    if (!q.trim()) {
      setHits([]);
      return;
    }
    const t = setTimeout(async () => {
      ctrl.current?.abort();
      const c = new AbortController();
      ctrl.current = c;
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: c.signal });
        if (res.ok) setHits(await res.json());
      } catch {
        /* aborted */
      } finally {
        if (!c.signal.aborted) setLoading(false);
      }
    }, 180);
    return () => clearTimeout(t);
  }, [q]);

  const go = (href: string) => {
    setOpen(false);
    setQ("");
    if (href.startsWith("http")) window.open(href, "_blank", "noopener");
    else router.push(href);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <DialogPrimitive.Content className="fixed top-[12vh] left-1/2 z-50 w-[calc(100vw-24px)] max-w-xl -translate-x-1/2 overflow-hidden rounded-lg border border-line-strong bg-panel shadow-[var(--shadow)]">
          <DialogPrimitive.Title className="sr-only">Search</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">Search tasks, members, tracks, docs, resources, experiments and repositories</DialogPrimitive.Description>
          <Command shouldFilter={false} label="Global search">
            <div className="flex items-center gap-2 border-b border-line px-3">
              {loading ? <Loader2 className="size-4 animate-spin text-muted" /> : <Search className="size-4 text-muted" />}
              <Command.Input value={q} onValueChange={setQ} placeholder="Search by task ID, title, code reference, doc, member…" className="h-11 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-faint" autoFocus />
            </div>
            <Command.List className="max-h-[60vh] overflow-y-auto p-1.5">
              {!q.trim() && (
                <Command.Group heading="Jump to" className="text-[10px] text-faint [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:uppercase">
                  {QUICK.map((x) => (
                    <Command.Item key={x.href} value={x.href} onSelect={() => go(x.href)} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs text-fg-2 data-[selected=true]:bg-panel-3 data-[selected=true]:text-fg">
                      <Box className="size-3.5 text-muted" /> {x.label}
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
              {q.trim() && !loading && hits.length === 0 && <Command.Empty className="px-3 py-8 text-center text-xs text-muted">No results for “{q}”.</Command.Empty>}
              {hits.map((h) => (
                <Command.Item key={`${h.kind}-${h.id}`} value={`${h.kind}-${h.id}`} onSelect={() => go(h.href)} className="flex cursor-pointer items-start gap-2.5 rounded px-2 py-1.5 data-[selected=true]:bg-panel-3">
                  <span className="mt-0.5 text-muted [&_svg]:size-3.5">{ICON[h.kind]}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium text-fg">{h.title}</div>
                    <div className="truncate text-[11px] text-muted">{h.subtitle}</div>
                    {h.snippet && <div className="line-clamp-1 text-[11px] text-faint">{h.snippet}</div>}
                  </div>
                </Command.Item>
              ))}
            </Command.List>
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

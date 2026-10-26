"use client";

import { Bookmark, CalendarDays, Columns3, GanttChart, Layers, List, Plus, Save, Search, Table2, Trash2, Users } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";
import { applyFilters, FilterBar } from "@/components/tasks/filters";
import { Dialog, Menu, MenuItem, MenuLabel, MenuSeparator } from "@/components/ui/overlay";
import { Button, Input } from "@/components/ui/primitives";
import { useCommand } from "@/components/use-command";
import { useCan, useWorkspace } from "@/components/workspace";
import type { BoardFilters, BoardView, SavedView } from "@/lib/domain/types";
import type { TaskSummary } from "@/lib/domain/views";
import { cn } from "@/lib/utils";
import { KanbanView } from "./kanban";
import { TableView } from "./table-view";
import { CalendarView, GroupedView, ListView, TimelineView } from "./other-views";

const VIEWS: { id: BoardView; label: string; icon: ReactNode }[] = [
  { id: "kanban", label: "Kanban", icon: <Columns3 /> },
  { id: "table", label: "Table", icon: <Table2 /> },
  { id: "list", label: "Compact", icon: <List /> },
  { id: "calendar", label: "Calendar", icon: <CalendarDays /> },
  { id: "timeline", label: "Timeline", icon: <GanttChart /> },
  { id: "assignee", label: "By assignee", icon: <Users /> },
  { id: "track", label: "By channel", icon: <Layers /> },
];

function parseFilters(sp: URLSearchParams): BoardFilters {
  const arr = (k: string) => sp.get(k)?.split(",").filter(Boolean);
  return {
    q: sp.get("q") ?? "",
    backlog: (sp.get("backlog") as BoardFilters["backlog"]) ?? "initial",
    trackIds: (arr("track") ?? arr("channel")) as BoardFilters["trackIds"],
    subtrackIds: arr("subtrack"),
    memberIds: arr("member"),
    statuses: arr("status") as BoardFilters["statuses"],
    priorities: arr("priority") as BoardFilters["priorities"],
    difficulties: arr("difficulty") as BoardFilters["difficulties"],
    sprintIds: arr("sprint"),
    milestoneIds: arr("milestone"),
  };
}

function toQuery(view: BoardView, f: BoardFilters) {
  const p = new URLSearchParams();
  if (view !== "kanban") p.set("view", view);
  if (f.q) p.set("q", f.q);
  if (f.backlog && f.backlog !== "initial") p.set("backlog", f.backlog);
  const map: [string, string[] | undefined][] = [["track", f.trackIds], ["subtrack", f.subtrackIds], ["member", f.memberIds], ["status", f.statuses], ["priority", f.priorities], ["difficulty", f.difficulties], ["sprint", f.sprintIds], ["milestone", f.milestoneIds]];
  for (const [k, v] of map) if (v?.length) p.set(k, v.join(","));
  return p.toString();
}

export function BoardClient({ tasks, savedViews }: { tasks: TaskSummary[]; savedViews: SavedView[] }) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const can = useCan();
  const { tracks } = useWorkspace();
  const { run } = useCommand();
  const [view, setViewState] = useState<BoardView>((sp.get("view") as BoardView) || "kanban");
  const [filters, setFiltersState] = useState<BoardFilters>(() => parseFilters(new URLSearchParams(sp.toString())));
  const [saveOpen, setSaveOpen] = useState(false);
  const [viewName, setViewName] = useState("");

  const sync = (v: BoardView, f: BoardFilters) => {
    const q = toQuery(v, f);
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  };
  const setView = (v: BoardView) => {
    setViewState(v);
    sync(v, filters);
  };
  const setFilters = (f: BoardFilters) => {
    setFiltersState(f);
    sync(view, f);
  };

  const visible = useMemo(() => applyFilters(tasks, filters), [tasks, filters]);

  return (
    <div className="flex h-[calc(100vh-44px)] flex-col">
      <div className="space-y-2 border-b border-line px-4 pt-3 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="mr-2 text-[15px] font-semibold">All Tasks</h1>
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute top-2 left-2 size-3.5 text-faint" />
            <Input value={filters.q ?? ""} onChange={(e) => setFilters({ ...filters, q: e.target.value })} placeholder="Filter by ID, title, technical content…" className="h-7 pl-7 text-xs" aria-label="Filter tasks" />
          </div>
          <div className="flex items-center rounded-md border border-line bg-panel p-0.5" role="tablist" aria-label="Board view">
            {VIEWS.map((v) => (
              <button key={v.id} role="tab" aria-selected={view === v.id} onClick={() => setView(v.id)} title={v.label} className={cn("flex items-center gap-1 rounded px-2 py-1 text-xs [&_svg]:size-3.5", view === v.id ? "bg-panel-3 text-fg" : "text-muted hover:text-fg")}>
                {v.icon}
                <span className="hidden xl:inline">{v.label}</span>
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <Menu
              trigger={
                <Button size="sm" variant="ghost">
                  <Bookmark /> Views
                </Button>
              }
            >
              <MenuLabel>Saved views</MenuLabel>
              {savedViews.length === 0 && <div className="px-2 py-1.5 text-[11px] text-faint">No saved views yet</div>}
              {savedViews.map((v) => (
                <div key={v.id} className="flex items-center">
                  <div className="flex-1">
                    <MenuItem
                      onSelect={() => {
                        setViewState(v.view);
                        setFiltersState(v.filters);
                        sync(v.view, v.filters);
                      }}
                    >
                      {v.name}
                    </MenuItem>
                  </div>
                  <button className="p-1 text-faint hover:text-danger" aria-label={`Delete view ${v.name}`} onClick={() => run({ type: "view.delete", viewId: v.id })}>
                    <Trash2 className="size-3" />
                  </button>
                </div>
              ))}
              <MenuSeparator />
              <MenuItem onSelect={() => setSaveOpen(true)}>
                <Save /> Save current view…
              </MenuItem>
            </Menu>
            {tracks.some((t) => can("task.create", { task: { id: "", trackId: t.id } })) ? (
              <CreateTaskDialog
                trigger={
                  <Button size="sm" variant="primary">
                    <Plus /> New task
                  </Button>
                }
              />
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FilterBar filters={filters} onChange={setFilters} />
          <span className="ml-auto font-mono text-[11px] text-muted">
            {visible.length} / {tasks.filter((t) => !t.archived).length} tasks
          </span>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {view === "kanban" && <KanbanView tasks={visible} />}
        {view === "table" && <TableView tasks={visible} />}
        {view === "list" && <ListView tasks={visible} />}
        {view === "calendar" && <CalendarView tasks={visible} />}
        {view === "timeline" && <TimelineView tasks={visible} />}
        {view === "assignee" && <GroupedView tasks={visible} by="assignee" />}
        {view === "track" && <GroupedView tasks={visible} by="track" />}
      </div>
      <Dialog open={saveOpen} onOpenChange={setSaveOpen} title="Save view" description="Saves the current view type and filters for you.">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run({ type: "view.save", name: viewName, view, filters: filters as Record<string, unknown> }, { onSuccess: () => setSaveOpen(false) });
          }}
          className="space-y-3"
        >
          <Input autoFocus value={viewName} onChange={(e) => setViewName(e.target.value)} placeholder="e.g. My SF critical work" required maxLength={60} />
          <div className="flex justify-end">
            <Button type="submit" variant="primary">
              Save view
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

"use client";

import { Background, Controls, MarkerType, ReactFlow, Handle, Position, type Edge, type Node, type NodeProps } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ArrowDownToLine, ArrowUpFromLine, Info, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";
import { StatusBadge, TaskLink } from "@/components/tasks/bits";
import { Badge } from "@/components/ui/primitives";
import { useLookup } from "@/components/workspace";
import type { IntegrationComponent } from "@/lib/domain/types";
import type { TaskSummary } from "@/lib/domain/views";
import { cn } from "@/lib/utils";

const GROUPS: { id: IntegrationComponent["group"]; label: string; color: string }[] = [
  { id: "sensors", label: "Sensor drivers", color: "#94a3b8" },
  { id: "localization", label: "Localization", color: "#38bdf8" },
  { id: "perception", label: "Perception", color: "#a78bfa" },
  { id: "navigation", label: "Navigation", color: "#34d399" },
  { id: "mission", label: "Mission", color: "#f472b6" },
  { id: "control", label: "Controls boundary", color: "#ef4444" },
  { id: "safety", label: "Safety", color: "#f59e0b" },
];

type ImplState = "not started" | "in progress" | "implemented" | "tested";

function implState(tasks: TaskSummary[]): { impl: ImplState; test: string } {
  if (!tasks.length) return { impl: "not started", test: "no tasks" };
  if (tasks.every((t) => t.status === "completed")) return { impl: "tested", test: "approved with test evidence" };
  if (tasks.some((t) => ["testing", "in_review", "completed"].includes(t.status))) return { impl: "implemented", test: tasks.some((t) => t.evidence) ? "evidence submitted" : "awaiting evidence" };
  if (tasks.some((t) => !["backlog", "available"].includes(t.status))) return { impl: "in progress", test: "not tested" };
  return { impl: "not started", test: "not tested" };
}

function CompNode({ data }: NodeProps<Node<{ c: IntegrationComponent; color: string; impl: ImplState; selected: boolean }>>) {
  const { c, color, impl, selected } = data;
  return (
    <div className={cn("w-[170px] rounded-md border px-2.5 py-1.5", c.ownerTeam !== "Autonomy" ? "border-dashed bg-bg opacity-80" : "bg-panel-2", selected ? "border-info ring-1 ring-info" : "border-line-strong")} style={c.ownerTeam !== "Autonomy" ? undefined : { borderTop: `3px solid ${color}` }}>
      {c.ownerTeam !== "Autonomy" && <div className="text-[8px] font-semibold tracking-wider text-faint uppercase">{c.ownerTeam} · interface only</div>}
      <Handle type="target" position={Position.Left} className="!size-1.5 !border-0 !bg-line-strong" />
      <div className="text-[11px] font-semibold text-fg">{c.name}</div>
      <div className="mt-0.5 flex items-center gap-1 text-[9px] text-muted">
        <span className={cn("size-1.5 rounded-full", impl === "tested" ? "bg-ok" : impl === "implemented" ? "bg-info" : impl === "in progress" ? "bg-violet" : "bg-line-strong")} />
        {c.ownerTeam === "Autonomy" ? impl : "external"}
        <span className="ml-auto">{c.interfaceStatus}</span>
      </div>
      <Handle type="source" position={Position.Right} className="!size-1.5 !border-0 !bg-line-strong" />
    </div>
  );
}
const nodeTypes = { comp: CompNode };

export function ArchitectureClient({ components, tasks }: { components: IntegrationComponent[]; tasks: TaskSummary[] }) {
  const [sel, setSel] = useState<string | null>(components.find((c) => c.key === "loc-fusion")?.id ?? null);
  const { member } = useLookup();
  const tasksOf = (c: IntegrationComponent) => tasks.filter((t) => c.taskKeys.includes(t.key));

  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = [];
    GROUPS.forEach((g, gi) => {
      components.filter((c) => c.group === g.id).forEach((c, i) => {
        nodes.push({ id: c.id, type: "comp", position: { x: gi * 220, y: 40 + i * 76 }, data: { c, color: g.color, impl: implState(tasksOf(c)).impl, selected: c.id === sel } });
      });
    });
    const edges: Edge[] = [];
    const norm = (n: string) => n.split(" ")[0];
    for (const a of components) for (const out of a.outputs) for (const b of components) {
      if (a.id === b.id) continue;
      if (b.inputs.some((i) => norm(i.name) === norm(out.name) && !out.name.startsWith("/tf "))) {
        const id = `${a.id}-${b.id}-${out.name}`;
        if (edges.some((e) => e.source === a.id && e.target === b.id)) continue;
        const hl = sel && (a.id === sel || b.id === sel);
        edges.push({ id, source: a.id, target: b.id, label: hl ? norm(out.name) : undefined, labelStyle: { fill: "var(--fg-2)", fontSize: 9, fontFamily: "var(--font-mono)" }, labelBgStyle: { fill: "var(--bg)" }, style: { stroke: hl ? "var(--info)" : "var(--line-strong)", strokeWidth: hl ? 1.8 : 1, opacity: sel && !hl ? 0.25 : 1 }, markerEnd: { type: MarkerType.ArrowClosed, color: hl ? "var(--info)" : "var(--line-strong)" } });
      }
    }
    return { nodes, edges };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [components, tasks, sel]);

  const c = components.find((x) => x.id === sel);
  const ct = c ? tasksOf(c) : [];
  const st = implState(ct);
  const owner = c?.ownerId ? member.get(c.ownerId) : ct.flatMap((t) => t.assignees.filter((a) => a.role === "owner")).map((a) => member.get(a.memberId))[0];

  return (
    <div className="flex h-[calc(100vh-44px)] flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-2">
        <h1 className="text-[15px] font-semibold">ROS 2 architecture explorer</h1>
        <Badge tone="warn" title="Interfaces are proposed until committed code matches them">All interfaces currently illustrative</Badge>
        <span className="text-[11px] text-muted">Dashed nodes are owned by other teams.</span>
        <div className="ml-auto flex flex-wrap gap-2 text-[10px]">
          {GROUPS.map((g) => <span key={g.id} className="flex items-center gap-1 text-muted"><span className="size-2 rounded-sm" style={{ background: g.color }} />{g.label}</span>)}
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">
          <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView onNodeClick={(_, n) => setSel(n.id)} onPaneClick={() => setSel(null)} nodesConnectable={false} proOptions={{ hideAttribution: true }}>
            <Background color="var(--line)" gap={20} />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>
        {c && (
          <aside className="w-[360px] shrink-0 overflow-y-auto border-l border-line bg-panel p-4 text-xs" aria-label="Component inspector">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-semibold tracking-wider uppercase" style={{ color: GROUPS.find((g) => g.id === c.group)?.color }}>{GROUPS.find((g) => g.id === c.group)?.label}</div>
                <h2 className="text-sm font-semibold">{c.name}</h2>
              </div>
              <button onClick={() => setSel(null)} className="text-muted hover:text-fg" aria-label="Close inspector"><X className="size-4" /></button>
            </div>
            <p className="mt-2 text-fg-2">{c.purpose}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {c.ownerTeam !== "Autonomy" && <Badge tone="neutral">Owned by {c.ownerTeam} — shown for interface context</Badge>}
              <Badge tone={c.interfaceStatus === "verified" ? "ok" : "warn"}><Info /> Interface {c.interfaceStatus}</Badge>
              <Badge tone={st.impl === "tested" ? "ok" : st.impl === "implemented" ? "info" : "neutral"}>Implementation: {st.impl}</Badge>
              <Badge>Testing: {st.test}</Badge>
            </div>
            <Topics title="Inputs" icon={<ArrowDownToLine className="size-3.5" />} list={c.inputs} />
            <Topics title="Outputs" icon={<ArrowUpFromLine className="size-3.5" />} list={c.outputs} />
            {c.parameters.length > 0 && (
              <div className="mt-3">
                <h3 className="mb-1 flex items-center gap-1 text-[11px] font-semibold tracking-wider text-muted uppercase"><SlidersHorizontal className="size-3.5" /> Parameters</h3>
                <div className="flex flex-wrap gap-1">{c.parameters.map((p) => <code key={p} className="rounded bg-panel-3 px-1 font-mono text-[10px]">{p}</code>)}</div>
              </div>
            )}
            <div className="mt-3">
              <h3 className="mb-1 text-[11px] font-semibold tracking-wider text-muted uppercase">Engineering tasks</h3>
              <ul className="space-y-1">{ct.map((t) => <li key={t.id} className="flex items-center gap-2"><TaskLink k={t.key} title={t.title} className="min-w-0 flex-1" /><StatusBadge status={t.status} /></li>)}</ul>
            </div>
            <div className="mt-3 text-muted">{c.ownerTeam === "Autonomy" ? <>Owner: <span className="text-fg">{owner?.name ?? "unassigned"}</span></> : <>Implemented by the <span className="text-fg">{c.ownerTeam}</span> team; autonomy owns only the interface (see AG-07).</>}</div>
            <p className="mt-4 text-[10px] text-faint">Implementation and test status derive from the linked tasks&apos; review-approved state. Topic names follow proposed conventions pending AG-04.</p>
          </aside>
        )}
      </div>
    </div>
  );
}

function Topics({ title, icon, list }: { title: string; icon: React.ReactNode; list: IntegrationComponent["inputs"] }) {
  return (
    <div className="mt-3">
      <h3 className="mb-1 flex items-center gap-1 text-[11px] font-semibold tracking-wider text-muted uppercase">{icon} {title}</h3>
      {list.length === 0 ? <p className="text-faint">—</p> : (
        <table className="w-full text-[11px]"><tbody>{list.map((t) => <tr key={t.name} className="border-b border-line last:border-0"><td className="py-1 pr-2 font-mono text-fg">{t.name}</td><td className="py-1 font-mono text-info">{t.type}</td></tr>)}</tbody></table>
      )}
    </div>
  );
}

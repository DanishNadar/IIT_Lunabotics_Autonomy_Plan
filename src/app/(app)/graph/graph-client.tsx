"use client";

import { Background, Controls, Handle, MarkerType, MiniMap, Position, ReactFlow, type Connection, type Edge, type Node, type NodeProps } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/primitives";
import { useCommand } from "@/components/use-command";
import { useCan, useWorkspace } from "@/components/workspace";
import { layers } from "@/lib/domain/dependencies";
import { STATUS_LABEL, type TaskDependency } from "@/lib/domain/types";
import type { TaskSummary } from "@/lib/domain/views";
import { STATUS_DOT } from "@/lib/ui-meta";
import { cn } from "@/lib/utils";

type TaskNodeData = { t: TaskSummary; color: string; critical: boolean; dim: boolean };

function TaskNode({ data }: NodeProps<Node<TaskNodeData>>) {
  const { t, color, critical, dim } = data;
  return (
    <div className={cn("w-[190px] rounded-md border bg-panel-2 px-2 py-1.5 text-left shadow-sm transition-opacity", t.status === "blocked" ? "border-danger" : critical ? "border-warn" : "border-line-strong", dim && "opacity-25")} style={{ borderLeft: `3px solid ${color}` }}>
      <Handle type="target" position={Position.Left} className="!size-2 !border-0 !bg-line-strong" />
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-xs font-semibold" style={{ color }}>{t.key}</span>
        <span className={cn("ml-auto size-1.5 rounded-full", STATUS_DOT[t.status])} title={STATUS_LABEL[t.status]} />
      </div>
      <div className="line-clamp-2 text-[13px] leading-tight text-fg">{t.title}</div>
      <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted">
        <span>{STATUS_LABEL[t.status]}</span>
        {t.missingDeps.length > 0 && <span className="text-warn">· waits {t.missingDeps.length}</span>}
        {critical && <span className="text-warn">· integration point</span>}
      </div>
      <Handle type="source" position={Position.Right} className="!size-2 !border-0 !bg-line-strong" />
    </div>
  );
}

function SystemNode({ data }: NodeProps<Node<{ label: string; sub: string; tone: string; tasks: string; external?: boolean }>>) {
  return (
    <div className={cn("w-[180px] rounded-md border px-3 py-2 text-center", data.external ? "border-dashed border-faint bg-bg text-muted" : "border-line-strong bg-panel-2")} style={data.external ? undefined : { borderTop: `3px solid ${data.tone}` }}>
      {data.external && <div className="mb-0.5 text-[11px] font-semibold tracking-wider text-faint uppercase">External team</div>}
      <Handle type="target" position={Position.Left} className="!opacity-0" />
      <Handle type="target" position={Position.Top} id="t" className="!opacity-0" />
      <div className="text-sm font-semibold text-fg">{data.label}</div>
      <div className="text-xs text-muted">{data.sub}</div>
      {data.tasks && <div className="mt-1 font-mono text-[11px] text-faint">{data.tasks}</div>}
      <Handle type="source" position={Position.Right} className="!opacity-0" />
      <Handle type="source" position={Position.Bottom} id="b" className="!opacity-0" />
    </div>
  );
}

const nodeTypes = { task: TaskNode, system: SystemNode };

export function GraphClient({ tasks, deps }: { tasks: TaskSummary[]; deps: TaskDependency[] }) {
  const sp = useSearchParams();
  const [mode, setMode] = useState<"tasks" | "system">("tasks");
  const [scope, setScope] = useState<"initial" | "all">("initial");
  const [focusTrack, setFocusTrack] = useState<string | null>(sp.get("track"));
  const { tracks } = useWorkspace();
  const can = useCan();
  const { run } = useCommand();
  const router = useRouter();
  const color = useMemo(() => new Map(tracks.map((t) => [t.id, t.color])), [tracks]);

  const { nodes, edges } = useMemo(() => {
    const visible = tasks.filter((t) => !t.archived && (scope === "all" || t.backlog === "initial"));
    const ids = new Set(visible.map((t) => t.id));
    const vdeps = deps.filter((d) => ids.has(d.fromTaskId) && ids.has(d.toTaskId));
    const layer = layers(visible.map((t) => t.id), vdeps);
    const byLayer = new Map<number, TaskSummary[]>();
    for (const t of visible) byLayer.set(layer.get(t.id)!, [...(byLayer.get(layer.get(t.id)!) ?? []), t]);
    const order = tracks.map((t) => t.id as string);
    const outDeg = new Map<string, number>();
    for (const d of vdeps) outDeg.set(d.fromTaskId, (outDeg.get(d.fromTaskId) ?? 0) + 1);
    const nodes: Node<TaskNodeData>[] = [];
    for (const [l, list] of byLayer) {
      list.sort((a, b) => order.indexOf(a.trackId) - order.indexOf(b.trackId) || a.key.localeCompare(b.key));
      list.forEach((t, i) => nodes.push({ id: t.id, type: "task", position: { x: l * 250, y: i * 82 }, data: { t, color: color.get(t.trackId) ?? "#888", critical: (outDeg.get(t.id) ?? 0) >= 3, dim: !!focusTrack && t.trackId !== focusTrack } }));
    }
    const byId = new Map(visible.map((t) => [t.id, t]));
    const edges: Edge[] = vdeps.map((d) => {
      const from = byId.get(d.fromTaskId)!;
      const to = byId.get(d.toTaskId)!;
      const complete = from.status === "completed";
      const cross = from.trackId !== to.trackId;
      const dim = !!focusTrack && from.trackId !== focusTrack && to.trackId !== focusTrack;
      return {
        id: d.id,
        source: d.fromTaskId,
        target: d.toTaskId,
        animated: !complete && to.status !== "backlog" && to.status !== "available",
        style: { stroke: complete ? "var(--ok)" : d.kind === "blocks" ? "var(--warn)" : cross ? "var(--info)" : "var(--line-strong)", strokeWidth: d.kind === "blocks" ? 2 : 1.2, strokeDasharray: d.kind === "integrates" ? "5 4" : undefined, opacity: dim ? 0.12 : 0.9 },
        markerEnd: { type: MarkerType.ArrowClosed, color: complete ? "var(--ok)" : "var(--line-strong)" },
      };
    });
    return { nodes, edges };
  }, [tasks, deps, scope, focusTrack, tracks, color]);

  const system = useMemo(() => {
    const keys = (prefix: string[]) => tasks.filter((t) => t.backlog === "initial" && prefix.some((p) => t.key.startsWith(p))).map((t) => t.key).join(" ");
    const N = (id: string, label: string, sub: string, x: number, y: number, tone: string, k = "", external = false): Node => ({ id, type: "system", position: { x, y }, data: { label, sub, tone, tasks: k, external } });
    const nodes = [
      N("sim", "🕹️ Simulation", "arena · rover model · sensors · scenarios", 0, 330, "#f59e0b", keys(["SIM-"])),
      N("sensors", "Sensor data", "LiDAR · IMU · camera · wheel odometry", 0, 120, "#94a3b8", "SIM-04 SF-02"),
      N("loc", "🕸️ Localization", "EKF/UKF · LIO · confidence", 240, 40, "#38bdf8", keys(["SF-"])),
      N("perc", "📸 Perception", "filtering · terrain · obstacles", 240, 200, "#a78bfa", keys(["PM-"])),
      N("map", "Terrain costmap", "traversability", 480, 200, "#a78bfa", "PM-01 PM-06"),
      N("plan", "🗺️ Navigation", "global + local · recovery", 720, 120, "#34d399", keys(["NV-"])),
      N("mission", "🧠 Mission logic", "FSM · excavation/deposition requests", 720, -80, "#e879f9", "AG-01 AG-02 AG-03"),
      N("iface", "🧠 Controls interface", "timestamped requests · status · safe stop", 960, 120, "#e879f9", "AG-07"),
      N("controls", "Controls", "motor control · arbitration · E-stop · actuator sequences", 1200, 120, "#64748b", "", true),
      N("mech", "Mechanical", "geometry · mass · mechanism limits", 0, -80, "#64748b", "", true),
      N("elec", "Electrical / Hardware", "sensor specs · power · comms", 240, -200, "#64748b", "", true),
    ];
    const E = (s: string, t: string, label?: string, style?: React.CSSProperties, sh?: string, th?: string): Edge => ({ id: `${s}-${t}`, source: s, target: t, label, sourceHandle: sh, targetHandle: th, labelStyle: { fill: "var(--muted)", fontSize: 10 }, labelBgStyle: { fill: "var(--bg)" }, style: { stroke: "var(--line-strong)", ...style }, markerEnd: { type: MarkerType.ArrowClosed } });
    const ext = { stroke: "var(--faint)", strokeDasharray: "3 4" };
    const edges = [
      E("sim", "sensors", "simulated data", { strokeDasharray: "2 3" }), E("sensors", "loc"), E("sensors", "perc"), E("loc", "plan", "pose"), E("perc", "map"), E("loc", "map", "TF"), E("map", "plan", "costs"),
      E("mission", "plan", "goals", { stroke: "var(--violet)" }, "b", "t"), E("plan", "iface", "velocity requests"), E("mission", "iface", "safe-stop requests", { stroke: "var(--violet)" }, "b", "t"),
      E("iface", "controls", "AG-07 contract", ext), E("controls", "iface", "status · faults · wheel odometry", ext),
      E("mission", "controls", "excavate / deposit actions", ext, undefined, "t"),
      E("mech", "sim", "dimensions", ext, "b"), E("elec", "sensors", "specs", ext, "b"),
    ];
    return { nodes, edges };
  }, [tasks]);

  const onConnect = (c: Connection) => {
    if (!c.source || !c.target) return;
    void run({ type: "dependency.add", fromTaskId: c.source, toTaskId: c.target, kind: "integrates", note: "Added from graph" });
  };
  const canEdit = can("task.dependency", { task: { id: "", trackId: "AG" } });

  return (
    <div className="flex h-[calc(100vh-44px)] flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2">
        <h1 className="mr-2 text-[15px] font-semibold">Dependency graph</h1>
        <div className="flex rounded-md border border-line bg-panel p-0.5 text-[13px]">
          {(["tasks", "system"] as const).map((m) => <button key={m} onClick={() => setMode(m)} className={cn("rounded px-2 py-0.5", mode === m ? "bg-panel-3 text-fg" : "text-muted")}>{m === "tasks" ? "Task dependencies" : "Subsystem flow"}</button>)}
        </div>
        {mode === "tasks" && (
          <>
            <div className="flex rounded-md border border-line bg-panel p-0.5 text-[13px]">
              {(["initial", "all"] as const).map((s) => <button key={s} onClick={() => setScope(s)} className={cn("rounded px-2 py-0.5", scope === s ? "bg-panel-3 text-fg" : "text-muted")}>{s === "initial" ? "Initial tasks" : "Include advanced"}</button>)}
            </div>
            <div className="flex flex-wrap gap-1">
              {tracks.map((t) => <button key={t.id} onClick={() => setFocusTrack(focusTrack === t.id ? null : t.id)} className={cn("rounded border px-1.5 py-0.5 font-mono text-xs", focusTrack === t.id ? "border-current" : "border-line")} style={{ color: t.color }}>{t.id}</button>)}
            </div>
          </>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2 text-xs text-muted">
          {mode === "tasks" ? (
            <>
              <span className="flex items-center gap-1"><span className="h-0.5 w-5 bg-warn" /> hard prerequisite</span>
              <span className="flex items-center gap-1"><span className="h-0 w-5 border-t border-dashed border-info" /> cross-track integration</span>
              <span className="flex items-center gap-1"><span className="h-0.5 w-5 bg-ok" /> satisfied</span>
              <Badge tone="warn">≥3 dependents = integration point</Badge>
              {canEdit && <span>Drag between handles to add a dependency (cycles are rejected).</span>}
            </>
          ) : (
            <span>Conceptual flow. Autonomy decides and requests; dashed boxes are other teams, reached only through interfaces (AG-02/03/07). Mission logic can request a safe stop at any time; Controls executes it.</span>
          )}
        </div>
      </div>
      <div className="min-h-0 flex-1">
        {mode === "tasks" ? (
          <ReactFlow key="tasks" nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView minZoom={0.15} onNodeClick={(_, n) => router.push(`/tasks/${(n.data as TaskNodeData).t.key}`)} onConnect={canEdit ? onConnect : undefined} nodesConnectable={canEdit} proOptions={{ hideAttribution: true }}>
            <Background color="var(--line)" gap={20} />
            <Controls showInteractive={false} />
            <MiniMap pannable zoomable nodeColor={(n) => ((n.data as TaskNodeData).t.status === "completed" ? "#22c55e" : (n.data as TaskNodeData).color)} maskColor="rgba(0,0,0,0.5)" bgColor="var(--panel)" />
          </ReactFlow>
        ) : (
          <ReactFlow key="system" nodes={system.nodes} edges={system.edges} nodeTypes={nodeTypes} fitView nodesConnectable={false} proOptions={{ hideAttribution: true }}>
            <Background color="var(--line)" gap={20} />
            <Controls showInteractive={false} />
          </ReactFlow>
        )}
      </div>
    </div>
  );
}

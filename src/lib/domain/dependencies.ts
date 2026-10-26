import type { Task, TaskDependency } from "./types";

/** True if adding prerequisite `from` → dependent `to` would create a cycle. */
export function wouldCreateCycle(deps: Pick<TaskDependency, "fromTaskId" | "toTaskId">[], from: string, to: string): boolean {
  if (from === to) return true;
  // A cycle exists if `from` is already reachable from `to`.
  const out = new Map<string, string[]>();
  for (const d of deps) {
    const list = out.get(d.fromTaskId) ?? [];
    list.push(d.toTaskId);
    out.set(d.fromTaskId, list);
  }
  const stack = [to];
  const seen = new Set<string>();
  while (stack.length) {
    const cur = stack.pop()!;
    if (cur === from) return true;
    if (seen.has(cur)) continue;
    seen.add(cur);
    for (const n of out.get(cur) ?? []) stack.push(n);
  }
  return false;
}

export function prerequisitesOf(deps: TaskDependency[], taskId: string) {
  return deps.filter((d) => d.toTaskId === taskId);
}

export function dependentsOf(deps: TaskDependency[], taskId: string) {
  return deps.filter((d) => d.fromTaskId === taskId);
}

/** Keys of hard ("blocks") prerequisites that are not completed. */
export function unmetBlockingPrereqs(tasks: Pick<Task, "id" | "key" | "status">[], deps: TaskDependency[], taskId: string): string[] {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  return prerequisitesOf(deps, taskId)
    .filter((d) => d.kind === "blocks")
    .map((d) => byId.get(d.fromTaskId))
    .filter((t): t is NonNullable<typeof t> => !!t && t.status !== "completed")
    .map((t) => t.key);
}

/** All prerequisites (any kind) not yet completed. */
export function missingDependencies(tasks: Pick<Task, "id" | "key" | "status">[], deps: TaskDependency[], taskId: string): string[] {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  return prerequisitesOf(deps, taskId)
    .map((d) => byId.get(d.fromTaskId))
    .filter((t): t is NonNullable<typeof t> => !!t && t.status !== "completed")
    .map((t) => t.key);
}

/** Kahn topological layering; tasks in a cycle (should not exist) get the last layer. */
export function layers(taskIds: string[], deps: Pick<TaskDependency, "fromTaskId" | "toTaskId">[]): Map<string, number> {
  const ids = new Set(taskIds);
  const indeg = new Map<string, number>(taskIds.map((id) => [id, 0]));
  const out = new Map<string, string[]>();
  for (const d of deps) {
    if (!ids.has(d.fromTaskId) || !ids.has(d.toTaskId)) continue;
    indeg.set(d.toTaskId, (indeg.get(d.toTaskId) ?? 0) + 1);
    out.set(d.fromTaskId, [...(out.get(d.fromTaskId) ?? []), d.toTaskId]);
  }
  const layer = new Map<string, number>();
  let frontier = taskIds.filter((id) => indeg.get(id) === 0);
  let depth = 0;
  while (frontier.length) {
    const next: string[] = [];
    for (const id of frontier) {
      layer.set(id, depth);
      for (const n of out.get(id) ?? []) {
        indeg.set(n, indeg.get(n)! - 1);
        if (indeg.get(n) === 0) next.push(n);
      }
    }
    frontier = next;
    depth++;
  }
  for (const id of taskIds) if (!layer.has(id)) layer.set(id, depth);
  return layer;
}

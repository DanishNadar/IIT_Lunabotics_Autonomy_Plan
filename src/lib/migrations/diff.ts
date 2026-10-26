import type { Op } from "../domain/ops";
import { TABLES, type Collection, type Database } from "../domain/types";

type Row = { id: string } & Record<string, unknown>;

/** Parent tables before children, so inserts satisfy foreign keys (deletes run in reverse). */
export const COLLECTION_ORDER: Collection[] = [
  "settings", "tracks", "subtracks", "members", "milestones", "sprints", "resources", "repositories", "metricDefinitions",
  "learningPaths", "learningModules", "documents", "documentRevisions", "components", "tasks", "assignments", "checklistItems",
  "dependencies", "deliverables", "submissions", "acceptanceCriteria", "reviews", "comments", "progressLogs", "blockers",
  "statusHistory", "claims", "githubLinks", "taskResources", "researchTodos", "experiments", "externalDependencies",
  "learningProgress", "notifications", "notificationPreferences", "savedViews", "invitations", "auditEvents",
];

// Every collection must be ordered; fail loudly if one is added without updating the list.
for (const c of Object.keys(TABLES) as Collection[]) if (!COLLECTION_ORDER.includes(c)) throw new Error(`COLLECTION_ORDER missing ${c}`);

/** Structural equality that ignores object key order. */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return a === b || (a === undefined && b === null) || (a === null && b === undefined);
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    const bb = b as unknown[];
    return a.length === bb.length && a.every((v, i) => deepEqual(v, bb[i]));
  }
  const ao = a as Record<string, unknown>;
  const bo = b as Record<string, unknown>;
  const keys = new Set([...Object.keys(ao), ...Object.keys(bo)]);
  for (const k of keys) if (!deepEqual(ao[k], bo[k])) return false;
  return true;
}

/**
 * Minimal ops that turn `before` into `after`. Task key changes are emitted in two
 * phases through temporary keys so a unique index on tasks.key never sees a duplicate
 * while keys are being swapped (e.g. PM-07 ↔ PM-08).
 */
export function diffDatabases(before: Database, after: Database, opts: { ignore?: Collection[] } = {}): Op[] {
  const inserts: Op[] = [];
  const updates: Op[] = [];
  const deletes: Op[] = [];
  const tempKeys: Op[] = [];
  let tempN = 90000;

  for (const c of COLLECTION_ORDER) {
    if (opts.ignore?.includes(c)) continue;
    const prev = new Map(((before[c] ?? []) as unknown as Row[]).map((r) => [r.id, r]));
    const next = new Map(((after[c] ?? []) as unknown as Row[]).map((r) => [r.id, r]));
    for (const [id, row] of next) {
      const old = prev.get(id);
      if (!old) {
        inserts.push({ op: "insert", c, row });
        continue;
      }
      const patch: Record<string, unknown> = {};
      for (const k of new Set([...Object.keys(row), ...Object.keys(old)])) {
        if (k === "id") continue;
        if (!deepEqual(old[k], row[k])) patch[k] = row[k] === undefined ? null : row[k];
      }
      if (c === "tasks" && "key" in patch) tempKeys.push({ op: "update", c, id, patch: { key: `ZZZ-${tempN++}` } });
      if (Object.keys(patch).length) updates.push({ op: "update", c, id, patch });
    }
    for (const id of prev.keys()) if (!next.has(id)) deletes.push({ op: "delete", c, id });
  }
  const childFirst = [...deletes].sort((a, b) => COLLECTION_ORDER.indexOf(b.c) - COLLECTION_ORDER.indexOf(a.c));
  // Temp keys first (frees every key that is moving), then inserts, updates, deletes.
  return [...tempKeys, ...inserts, ...updates, ...childFirst];
}

export function summarizeOps(ops: Op[]) {
  const out: Record<string, { insert: number; update: number; delete: number }> = {};
  for (const o of ops) {
    out[o.c] ??= { insert: 0, update: 0, delete: 0 };
    out[o.c][o.op]++;
  }
  return out;
}

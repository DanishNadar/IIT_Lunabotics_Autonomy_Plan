import type { Collection, Database } from "./types";

type Row = { id: string } & Record<string, unknown>;

export type Op =
  | { op: "insert"; c: Collection; row: Row }
  | { op: "update"; c: Collection; id: string; patch: Record<string, unknown> }
  | { op: "delete"; c: Collection; id: string };

/** Pure reducer used by the file store and by tests. Returns a new Database. */
export function applyOps(db: Database, ops: Op[]): Database {
  const next = { ...db } as unknown as Record<Collection, Row[]>;
  const touched = new Set<Collection>();
  const ensure = (c: Collection) => {
    if (!touched.has(c)) {
      next[c] = [...(next[c] as Row[])];
      touched.add(c);
    }
    return next[c];
  };
  for (const o of ops) {
    const rows = ensure(o.c);
    if (o.op === "insert") {
      if (rows.some((r) => r.id === o.row.id)) throw new Error(`Duplicate id in ${o.c}: ${o.row.id}`);
      rows.push(o.row);
    } else if (o.op === "update") {
      const i = rows.findIndex((r) => r.id === o.id);
      if (i < 0) throw new Error(`Missing ${o.c} row ${o.id}`);
      rows[i] = { ...rows[i], ...o.patch };
    } else {
      const i = rows.findIndex((r) => r.id === o.id);
      if (i >= 0) rows.splice(i, 1);
    }
  }
  return next as unknown as Database;
}

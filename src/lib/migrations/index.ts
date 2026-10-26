import type { Op } from "../domain/ops";
import type { Database } from "../domain/types";
import { DATA_VERSION } from "../seed/build";
import { diffDatabases } from "./diff";
import { migrateV1toV2 } from "./v2-autonomy-restructure";

export interface Migration {
  version: number;
  name: string;
  run: (db: Database) => Database;
}

/** Ordered data migrations. Each takes version-1 data to `version`. */
export const MIGRATIONS: Migration[] = [{ version: 2, name: "autonomy-restructure", run: (db) => migrateV1toV2(db) }];

export const dataVersionOf = (db: Database) => db.settings[0]?.dataVersion ?? 1;

/** Applies every pending migration in memory. */
export function migrate(db: Database): { db: Database; applied: string[] } {
  let cur = db;
  const applied: string[] = [];
  for (const m of MIGRATIONS) {
    if (dataVersionOf(cur) >= m.version) continue;
    cur = m.run(cur);
    applied.push(`v${m.version} ${m.name}`);
  }
  if (dataVersionOf(cur) !== DATA_VERSION && cur.settings.length) throw new Error(`Data version ${dataVersionOf(cur)} after migrations; expected ${DATA_VERSION}`);
  return { db: cur, applied };
}

/** Pending migrations expressed as storage ops (for stores that persist row by row). */
export function migrationOps(db: Database): { ops: Op[]; applied: string[] } {
  const { db: next, applied } = migrate(db);
  return { ops: applied.length ? diffDatabases(db, next) : [], applied };
}

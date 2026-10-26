import { promises as fs } from "node:fs";
import path from "node:path";
import { applyOps, type Op } from "@/lib/domain/ops";
import { dataVersionOf, migrate } from "@/lib/migrations";
import type { Database } from "@/lib/domain/types";
import { Mutex, normalize } from "./memory";
import type { Store } from "./types";

interface FileShape {
  version: number;
  db: Database;
}

/**
 * Server-side JSON file store. Every user of the same running server shares it,
 * so it is a real (single-instance) multi-user store — suitable for local use and
 * demos. Serverless hosts (e.g. Vercel) have ephemeral, per-instance disks, so
 * production deployments must use the Supabase adapter.
 */
export class FileStore implements Store {
  readonly kind = "file" as const;
  readonly shared = true;
  private cache: FileShape | null = null;
  private mutex = new Mutex();

  constructor(
    private readonly file: string,
    private readonly seed: () => Database,
  ) {}

  get description() {
    return `Shared JSON file on this server (${path.relative(process.cwd(), this.file) || this.file}).`;
  }

  private async load(): Promise<FileShape> {
    if (this.cache) return this.cache;
    try {
      const raw = JSON.parse(await fs.readFile(this.file, "utf8")) as FileShape;
      this.cache = { version: raw.version ?? 0, db: normalize(raw.db) };
      await this.migrateIfNeeded();
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
      this.cache = { version: 0, db: this.seed() };
      await this.persist();
    }
    return this.cache;
  }

  /**
   * Brings older data files up to the current data version. The original file is copied
   * to `<file>.v<N>-backup-<timestamp>.json` first, so the migration is reversible.
   */
  private async migrateIfNeeded() {
    if (!this.cache) return;
    const from = dataVersionOf(this.cache.db);
    const { db, applied } = migrate(this.cache.db);
    if (!applied.length) return;
    const backup = `${this.file}.v${from}-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    await fs.copyFile(this.file, backup);
    this.cache = { version: this.cache.version + 1, db };
    await this.persist();
    console.info(`[store] migrated ${path.basename(this.file)}: ${applied.join(", ")} (backup: ${path.basename(backup)})`);
  }

  private async persist() {
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(this.cache), "utf8");
    await fs.rename(tmp, this.file);
  }

  async snapshot() {
    return (await this.load()).db;
  }

  async apply(ops: Op[]) {
    if (!ops.length) return;
    const cur = await this.load();
    this.cache = { version: cur.version + 1, db: applyOps(cur.db, ops) };
    await this.persist();
  }

  async version() {
    return String((await this.load()).version);
  }

  exclusive<T>(fn: () => Promise<T>) {
    return this.mutex.run(fn);
  }

  async reset() {
    this.cache = { version: (this.cache?.version ?? 0) + 1, db: this.seed() };
    await this.persist();
  }
}

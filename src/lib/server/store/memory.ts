import { applyOps, type Op } from "@/lib/domain/ops";
import type { Database } from "@/lib/domain/types";
import { emptyDatabase } from "@/lib/domain/types";
import type { Store } from "./types";

/** Serial async lock. */
export class Mutex {
  private tail: Promise<unknown> = Promise.resolve();
  run<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.tail.then(fn, fn);
    this.tail = next.catch(() => undefined);
    return next;
  }
}

/** Ensures collections added after a database file was created exist. */
export function normalize(db: Partial<Database>): Database {
  return { ...emptyDatabase(), ...db } as Database;
}

export class MemoryStore implements Store {
  readonly kind: Store["kind"] = "memory";
  readonly description = "In-memory store (tests only; data is lost on restart).";
  readonly shared = false;
  protected db: Database;
  protected rev = 0;
  private mutex = new Mutex();

  constructor(private readonly seed: () => Database) {
    this.db = seed();
  }

  async snapshot() {
    return this.db;
  }

  async apply(ops: Op[]) {
    if (!ops.length) return;
    this.db = applyOps(this.db, ops);
    this.rev++;
  }

  async version() {
    return String(this.rev);
  }

  exclusive<T>(fn: () => Promise<T>) {
    return this.mutex.run(fn);
  }

  async reset() {
    this.db = this.seed();
    this.rev++;
  }
}

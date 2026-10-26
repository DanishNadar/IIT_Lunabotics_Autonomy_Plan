import type { Op } from "@/lib/domain/ops";
import type { Database } from "@/lib/domain/types";

/**
 * Persistence adapter. Commands are validated against `snapshot()` by the pure
 * command handler, and the resulting ops are written with `apply()`.
 */
export interface Store {
  readonly kind: "file" | "memory" | "supabase";
  /** Human-readable description shown in Administration. */
  readonly description: string;
  /** True when writes are visible to every user of this deployment. */
  readonly shared: boolean;
  snapshot(): Promise<Database>;
  apply(ops: Op[]): Promise<void>;
  /** Monotonic token that changes on every write (used for live refresh). */
  version(): Promise<string>;
  /** Serializes read-validate-write so concurrent commands don't interleave. */
  exclusive<T>(fn: () => Promise<T>): Promise<T>;
  reset?(): Promise<void>;
}

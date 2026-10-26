import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Op } from "@/lib/domain/ops";
import { TABLES, type Collection, type Database } from "@/lib/domain/types";
import { Mutex, normalize } from "./memory";
import type { Store } from "./types";

const toSnake = (k: string) => k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
const toCamel = (k: string) => k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

/** Converts top-level keys only; jsonb payloads keep their camelCase shape. */
export function rowToDb(row: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) out[toSnake(k)] = v;
  return out;
}

export function rowFromDb(row: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) out[toCamel(k)] = v;
  return out;
}

/** Columns that live only in the local adapter. */
const LOCAL_ONLY: Partial<Record<Collection, string[]>> = { members: ["passwordHash"] };

/**
 * Supabase/PostgreSQL adapter. Uses the service-role key, so it must only ever run
 * on the server. Authorization happens in the command layer before any write;
 * RLS policies (see supabase/migrations) protect direct client access such as
 * realtime subscriptions made with the anon key.
 */
export class SupabaseStore implements Store {
  readonly kind = "supabase" as const;
  readonly shared = true;
  readonly description = "Supabase PostgreSQL (shared, persistent).";
  private client: SupabaseClient;
  private mutex = new Mutex();

  constructor(url: string, serviceRoleKey: string) {
    this.client = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  }

  async snapshot(): Promise<Database> {
    const entries = await Promise.all(
      (Object.keys(TABLES) as Collection[]).map(async (c) => {
        const rows: Record<string, unknown>[] = [];
        // PostgREST caps responses; page through each table.
        for (let from = 0; ; from += 1000) {
          const { data, error } = await this.client.from(TABLES[c]).select("*").range(from, from + 999);
          if (error) throw new Error(`Supabase read ${TABLES[c]}: ${error.message}`);
          rows.push(...(data ?? []));
          if (!data || data.length < 1000) break;
        }
        return [c, rows.map(rowFromDb)] as const;
      }),
    );
    return normalize(Object.fromEntries(entries) as unknown as Database);
  }

  async apply(ops: Op[]) {
    // Applied in order; each op is a single-row statement. Supabase has no
    // multi-statement transactions over PostgREST, so ops are ordered parent-first.
    for (const o of ops) {
      const table = this.client.from(TABLES[o.c]);
      const strip = (r: Record<string, unknown>) => {
        const copy = { ...r };
        for (const k of LOCAL_ONLY[o.c] ?? []) delete copy[k];
        return rowToDb(copy);
      };
      const res =
        o.op === "insert"
          ? await table.insert(strip(o.row))
          : o.op === "update"
            ? await table.update(strip(o.patch)).eq("id", o.id)
            : await table.delete().eq("id", o.id);
      if (res.error) throw new Error(`Supabase ${o.op} ${TABLES[o.c]}: ${res.error.message}`);
    }
  }

  async version() {
    const { data, error } = await this.client.from("audit_events").select("created_at").order("created_at", { ascending: false }).limit(1);
    if (error) return "0";
    return data?.[0]?.created_at ?? "0";
  }

  exclusive<T>(fn: () => Promise<T>) {
    // Serializes within one server instance. Cross-instance races are bounded by
    // database constraints (unique keys, FKs) which reject conflicting writes.
    return this.mutex.run(fn);
  }
}

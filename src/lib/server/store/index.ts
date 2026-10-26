import "server-only";
import path from "node:path";
import { buildSeedDatabase } from "@/lib/seed/build";
import { env, supabaseConfigured } from "../env";
import { FileStore } from "./file";
import { SupabaseStore } from "./supabase";
import type { Store } from "./types";

const g = globalThis as unknown as { __lunaStore?: Store };

/** One store per server process (survives Next.js dev hot reloads). */
export function getStore(): Store {
  if (!g.__lunaStore) {
    if (!supabaseConfigured() && env.vercel) {
      // Vercel's filesystem is read-only and per-instance: a file store would fail or silently split data.
      const message = "Supabase is not configured for this Vercel deployment. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY in the Vercel project settings, then redeploy.";
      console.error(message);
      throw new Error(message);
    }
    g.__lunaStore = supabaseConfigured()
      ? new SupabaseStore(env.supabaseUrl, env.supabaseServiceRoleKey)
      : new FileStore(path.resolve(process.cwd(), env.dataFile), buildSeedDatabase);
  }
  return g.__lunaStore;
}

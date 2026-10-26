"use server";

import { revalidatePath } from "next/cache";
import { getActor } from "@/lib/server/auth";
import { getStore } from "@/lib/server/store";

/** Local-store only: restores the deterministic seed. Never available for Supabase. */
export async function resetDemoData(): Promise<{ ok: boolean; error?: string }> {
  const actor = await getActor();
  if (actor?.role !== "admin") return { ok: false, error: "Administrator only." };
  const store = getStore();
  if (store.kind === "supabase" || !store.reset) return { ok: false, error: "Reset is only available for the local demo store." };
  await store.exclusive(() => store.reset!());
  revalidatePath("/", "layout");
  return { ok: true };
}

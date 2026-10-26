"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { CommandError, handleCommand, type Command } from "@/lib/domain/commands";
import { ADMIN_MEMBER_ID, getActor, isGuest } from "@/lib/server/auth";
import { notifyDiscord } from "@/lib/server/discord";
import { getStore } from "@/lib/server/store";

export type CommandResult = { ok: true; message?: string; data?: Record<string, unknown> } | { ok: false; error: string };

/**
 * The single write path for the application. Every mutation is authorized and
 * validated by `handleCommand` against the latest snapshot inside a lock.
 */
export async function runCommand(cmd: Command): Promise<CommandResult> {
  const actor = await getActor();
  if (isGuest(actor)) return { ok: false, error: "This board is view-only. Use the Admin button to make changes." };
  const store = getStore();
  try {
    const outcome = await store.exclusive(async () => {
      const db = await store.snapshot();
      // Re-read the actor inside the lock so role changes apply immediately.
      const fresh = db.members.find((m) => m.id === actor.id);
      if (!fresh || !fresh.active) throw new CommandError("Your session is no longer valid. Unlock admin again.");
      // The password-unlocked Administrator is always an admin, whatever its stored row says.
      const effective = fresh.id === ADMIN_MEMBER_ID ? { ...fresh, role: "admin" as const } : fresh;
      const out = handleCommand({ db, actor: effective, now: new Date().toISOString(), newId: randomUUID }, cmd);
      await store.apply(out.ops);
      return out;
    });
    revalidatePath("/", "layout");
    void notifyDiscord(cmd, outcome);
    return { ok: true, message: outcome.message, data: outcome.data };
  } catch (e) {
    if (e instanceof CommandError) return { ok: false, error: e.message };
    console.error("command failed", cmd.type, e);
    return { ok: false, error: "Something went wrong saving that change. It was not applied." };
  }
}

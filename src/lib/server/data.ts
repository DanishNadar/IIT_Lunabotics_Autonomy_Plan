import "server-only";
import type { Database, Member, PublicMember } from "@/lib/domain/types";
import { requireActor } from "./auth";
import { getStore } from "./store";

export async function loadContext(): Promise<{ db: Database; actor: Member }> {
  const actor = await requireActor();
  const db = await getStore().snapshot();
  return { db, actor };
}

/** Never send password hashes; emails only to the member themself and admins. */
export function publicMember(m: Member, viewer: Member): PublicMember {
  const { passwordHash: _ph, email, ...rest } = m;
  void _ph;
  return viewer.id === m.id || viewer.role === "admin" ? { ...rest, email } : rest;
}

export function publicMembers(db: Database, viewer: Member) {
  return db.members.map((m) => publicMember(m, viewer));
}

export function findTaskByKey(db: Database, key: string) {
  return db.tasks.find((t) => t.key.toLowerCase() === key.toLowerCase()) ?? null;
}

/** A task whose *former* key was `key` (old links redirect to its current key). */
export function findTaskByLegacyKey(db: Database, key: string) {
  const k = key.toUpperCase();
  return db.tasks.find((t) => t.legacyKeys.includes(k)) ?? null;
}

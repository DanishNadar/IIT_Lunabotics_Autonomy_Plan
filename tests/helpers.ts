import { randomUUID } from "node:crypto";
import { handleCommand, type Command, type Outcome } from "@/lib/domain/commands";
import { applyOps } from "@/lib/domain/ops";
import type { Database, Member } from "@/lib/domain/types";
import { buildSeedDatabase, demoMemberId } from "@/lib/seed/build";

export const ADMIN = demoMemberId("demo-admin@demo.local");
export const LEAD = demoMemberId("demo-lead@demo.local");
export const TRACK_LEAD_SF = demoMemberId("demo-tracklead@demo.local");
export const MEMBER_A = demoMemberId("demo-member-a@demo.local");
export const MEMBER_B = demoMemberId("demo-member-b@demo.local");
export const MEMBER_C = demoMemberId("demo-member-c@demo.local");
export const VIEWER = demoMemberId("demo-viewer@demo.local");

/** Minimal in-memory harness that runs commands exactly as the server does. */
export class Harness {
  db: Database;
  now = new Date("2026-10-27T15:00:00.000Z");
  constructor(db?: Database) {
    this.db = db ?? buildSeedDatabase();
  }
  member(id: string): Member {
    const m = this.db.members.find((x) => x.id === id);
    if (!m) throw new Error("no member");
    return m;
  }
  task(key: string) {
    const t = this.db.tasks.find((x) => x.key === key);
    if (!t) throw new Error(`no task ${key}`);
    return t;
  }
  run(actorId: string, cmd: Command): Outcome {
    const out = handleCommand({ db: this.db, actor: this.member(actorId), now: this.now.toISOString(), newId: randomUUID }, cmd);
    this.db = applyOps(this.db, out.ops);
    return out;
  }
  tick(hours: number) {
    this.now = new Date(this.now.getTime() + hours * 3600_000);
  }
}

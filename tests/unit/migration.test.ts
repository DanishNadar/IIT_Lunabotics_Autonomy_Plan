import { randomUUID } from "node:crypto";
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { applyOps } from "@/lib/domain/ops";
import type { Database } from "@/lib/domain/types";
import { dataVersionOf, migrate, migrationOps } from "@/lib/migrations";
import { diffDatabases } from "@/lib/migrations/diff";
import { buildSeedDatabase, demoMemberId } from "@/lib/seed/build";
import { FileStore } from "@/lib/server/store/file";
import { normalize } from "@/lib/server/store/memory";

/** The exact v1 seed as shipped before the restructure. */
const loadV1 = (): Database => normalize(JSON.parse(readFileSync(path.join(__dirname, "../fixtures/db-v1-seed.json"), "utf8")));
const MEMBER_A = demoMemberId("demo-member-a@demo.local");
const NOW = "2026-10-28T10:00:00.000Z";

describe("v1 → v2 data migration", () => {
  it("converges exactly to a fresh v2 install for untouched data", () => {
    const { db, applied } = migrate(loadV1());
    expect(applied).toEqual(["v2 autonomy-restructure"]);
    expect(diffDatabases(db, buildSeedDatabase(), { ignore: ["auditEvents"] })).toEqual([]);
  });

  it("is idempotent", () => {
    const once = migrate(loadV1()).db;
    expect(migrate(once).applied).toEqual([]);
    expect(dataVersionOf(once)).toBe(2);
  });

  it("produces ops that reproduce the migration without ever duplicating a task key", () => {
    const v1 = loadV1();
    const { ops } = migrationOps(v1);
    let cur = v1;
    for (const op of ops) {
      cur = applyOps(cur, [op]);
      if (op.c === "tasks") {
        const keys = cur.tasks.map((t) => t.key);
        expect(new Set(keys).size, `duplicate key after ${JSON.stringify(op).slice(0, 80)}`).toBe(keys.length);
      }
    }
    // The audit event carries the run time, so compare everything else.
    expect(diffDatabases(cur, migrate(v1).db, { ignore: ["auditEvents"] })).toEqual([]);
  });

  it("preserves user progress, edits and relationships", () => {
    const v1 = loadV1();
    const ms01 = v1.tasks.find((t) => t.key === "MS-01")!;
    const firstStep = v1.checklistItems.find((c) => c.taskId === ms01.id && c.parentId === null)!;
    firstStep.done = true;
    firstStep.doneBy = MEMBER_A;
    firstStep.doneAt = NOW;
    const assignment = { id: randomUUID(), taskId: ms01.id, memberId: MEMBER_A, role: "owner" as const, responsibility: "FSM", assignedBy: null, createdAt: NOW };
    const comment = { id: randomUUID(), taskId: ms01.id, authorId: MEMBER_A, parentId: null, kind: "discussion" as const, body: "Started on the transition table", mentions: [], createdAt: NOW, editedAt: null };
    v1.assignments.push(assignment);
    v1.comments.push(comment);
    ms01.status = "implementing";
    ms01.statusChangedAt = NOW;

    const userCs = { ...structuredClone(ms01), id: randomUUID(), key: "CS-07", title: "Tune wheel PID gains", trackId: "CS" as never, subtrackId: null, status: "available" as const, createdAt: NOW, updatedAt: NOW };
    const userMs = { ...structuredClone(ms01), id: randomUUID(), key: "MS-07", title: "Mission timer", trackId: "MS" as never, subtrackId: null, status: "available" as const, createdAt: NOW, updatedAt: NOW };
    v1.tasks.push(userCs, userMs);
    const userDep = { id: randomUUID(), fromTaskId: userMs.id, toTaskId: ms01.id, kind: "integrates" as const, note: "", createdAt: NOW };
    v1.dependencies.push(userDep);
    v1.savedViews.push({ id: randomUUID(), memberId: MEMBER_A, name: "Mission", view: "kanban", filters: { trackIds: ["MS" as never, "CS" as never, "SF"] }, createdAt: NOW });
    const lead = v1.members.find((m) => m.role === "track_lead")!;
    lead.leadTrackIds = ["IT" as never, "SF"];
    lead.updatedAt = NOW;
    const deletedResource = v1.resources[0].id;
    v1.resources = v1.resources.slice(1);
    v1.taskResources = v1.taskResources.filter((r) => r.resourceId !== deletedResource);

    const db = migrate(v1).db;
    const ag01 = db.tasks.find((t) => t.id === ms01.id)!;
    expect(ag01.key).toBe("AG-01");
    expect(ag01.trackId).toBe("AG");
    expect(ag01.legacyKeys).toEqual(["MS-01"]);
    expect(ag01.status).toBe("implementing");
    expect(ag01.spec.researchNeeded?.[0]).toMatch(/Autonomy restructure/);
    expect(db.assignments).toContainEqual(assignment);
    expect(db.comments).toContainEqual(comment);
    expect(db.checklistItems.find((c) => c.id === firstStep.id)?.done).toBe(true);
    expect(db.dependencies).toContainEqual(userDep);

    const cs = db.tasks.find((t) => t.id === userCs.id)!;
    expect(cs).toMatchObject({ trackId: "AG", archived: true, externalTeam: "Controls", claimable: false, key: "CS-07" });
    expect(db.tasks.find((t) => t.id === userMs.id)).toMatchObject({ trackId: "AG", archived: false });

    expect(db.savedViews.at(-1)!.filters.trackIds).toEqual(["AG", "SF"]);
    expect(db.members.find((m) => m.id === lead.id)!.leadTrackIds).toEqual(["AG", "SF"]);
    expect(db.resources.some((r) => r.id === deletedResource)).toBe(false);
    expect(db.tracks.map((t) => t.id)).toEqual(["AG", "SF", "PM", "NV", "SIM"]);
    expect(db.tasks.every((t) => ["AG", "SF", "PM", "NV", "SIM"].includes(t.trackId))).toBe(true);
  });

  it("file store migrates on load and keeps a backup of the original file", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "lunabotics-migrate-"));
    const file = path.join(dir, "db.json");
    writeFileSync(file, JSON.stringify({ version: 7, db: loadV1() }));
    const store = new FileStore(file, buildSeedDatabase);
    const db = await store.snapshot();
    expect(dataVersionOf(db)).toBe(2);
    expect(db.tasks.find((t) => t.key === "AG-01")?.legacyKeys).toEqual(["MS-01"]);
    const backups = readdirSync(dir).filter((f) => f.includes(".v1-backup-"));
    expect(backups).toHaveLength(1);
    expect(dataVersionOf(normalize(JSON.parse(readFileSync(path.join(dir, backups[0]), "utf8")).db))).toBe(1);
    expect(JSON.parse(readFileSync(file, "utf8")).db.settings[0].dataVersion).toBe(2);
  });
});

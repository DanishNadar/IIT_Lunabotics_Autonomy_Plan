import { wouldCreateCycle } from "../domain/dependencies";
import type { Database, Member, SavedView, Task, TrackId } from "../domain/types";
import { NEW_IN_V2, buildSeedDatabase } from "../seed/build";
import { SEED_TIME, seedId } from "../seed/ids";

/**
 * v1 → v2: refocus on the autonomy team's five categories.
 *
 *  - Tracks become AG/SF/PM/NV/SIM. MS and IT tasks move to AG; CS tasks are archived
 *    as Controls-owned (except CS-04, re-scoped to AG-12).
 *  - Re-keyed tasks keep their UUID, so assignments, comments, checklists, submissions,
 *    reviews and history stay attached; the old key is kept in `legacyKeys` and old
 *    URLs redirect.
 *  - "Pristine" seeded rows (never edited, no progress) are replaced with the v2 seed
 *    content. Anything with user edits or progress is preserved and only its
 *    organizational fields (key, category, archive state) change.
 *  - Rows introduced in v2 are inserted only if missing; rows a user deleted stay deleted.
 *
 * Pure and idempotent: running it on its own output changes nothing.
 */

const LEGACY: Record<string, TrackId> = { MS: "AG", IT: "AG", CS: "AG" };
const mapTrack = (t: string | null | undefined): TrackId | null => (t ? LEGACY[t] ?? (t as TrackId) : null);
const mapTracks = (ts: string[] | undefined) => [...new Set((ts ?? []).map((t) => mapTrack(t)!))];

/** Rows created by the seed have UUIDv5-shaped ids (see seedId); user rows are v4. */
export const isSeedRow = (id: string) => id.length === 36 && id[14] === "5";

const byId = <T extends { id: string }>(rows: T[]) => new Map(rows.map((r) => [r.id, r]));

function isPristineTask(t: Task, db: Database) {
  if (!isSeedRow(t.id) || t.updatedAt !== SEED_TIME || t.statusChangedAt !== SEED_TIME) return false;
  const touches = (rows: { taskId: string }[]) => rows.some((r) => r.taskId === t.id);
  if (touches(db.assignments) || touches(db.submissions) || touches(db.reviews) || touches(db.comments) || touches(db.progressLogs) || touches(db.blockers) || touches(db.claims) || touches(db.githubLinks)) return false;
  const own = <R extends { taskId: string; id: string }>(rows: R[]) => rows.filter((r) => r.taskId === t.id);
  if ([...own(db.checklistItems), ...own(db.deliverables), ...own(db.acceptanceCriteria), ...own(db.taskResources), ...own(db.statusHistory)].some((r) => !isSeedRow(r.id))) return false;
  if (own(db.checklistItems).some((c) => c.done || c.ownerId || c.evidence)) return false;
  if (own(db.acceptanceCriteria).some((a) => a.verified)) return false;
  return true;
}

export function migrateV1toV2(input: Database, seed: Database = buildSeedDatabase()): Database {
  const db = structuredClone(input) as Database;
  const seedTasks = byId(seed.tasks);
  const tracksById = byId(seed.tracks);
  const subtrackIds = new Set(seed.subtracks.map((s) => s.id));

  db.tracks = seed.tracks;
  db.subtracks = seed.subtracks;

  // ── tasks ──
  const pristine = new Set(db.tasks.filter((t) => isPristineTask(t, db)).map((t) => t.id));
  const replaceChildren = (taskId: string) => {
    for (const c of ["checklistItems", "deliverables", "acceptanceCriteria", "taskResources", "statusHistory"] as const) {
      const rows = db[c] as { taskId: string }[];
      (db[c] as unknown) = [...rows.filter((r) => r.taskId !== taskId), ...(seed[c] as { taskId: string }[]).filter((r) => r.taskId === taskId)];
    }
  };

  db.tasks = db.tasks.map((old): Task => {
    // v1 rows lack the v2 fields; defaults first, then whatever the row has.
    const t: Task = Object.assign({ legacyKeys: [], archived: false, externalTeam: null, archivedReason: "" }, old);
    const s = seedTasks.get(t.id);
    if (s && pristine.has(t.id)) {
      replaceChildren(t.id);
      return s;
    }
    if (s) {
      const legacy = new Set([...t.legacyKeys, ...s.legacyKeys, ...(t.key !== s.key ? [t.key] : [])]);
      legacy.delete(s.key);
      const track = tracksById.get(s.trackId)!;
      const rescoped = t.key !== s.key || t.trackId !== s.trackId || s.archived;
      return {
        ...t,
        key: s.key,
        title: s.title,
        trackId: s.trackId,
        subtrackId: s.subtrackId,
        legacyKeys: [...legacy],
        archived: s.archived,
        externalTeam: s.externalTeam,
        archivedReason: s.archivedReason,
        backlog: s.backlog,
        claimable: s.archived ? false : t.claimable,
        sprintId: s.archived ? null : t.sprintId,
        milestoneId: s.archived ? null : t.milestoneId,
        spec: rescoped
          ? { ...t.spec, researchNeeded: [`Autonomy restructure (2026-10-25): this task is now ${s.key} in ${track.emoji} ${track.discordChannel}${s.archived ? ` and is archived (owned by ${s.externalTeam})` : ""}. Your edits and progress were preserved; compare your steps with the current scope: ${s.spec.goal}`, ...(t.spec.researchNeeded ?? []).filter((n) => !n.startsWith("Autonomy restructure"))] }
          : t.spec,
      };
    }
    // User-created task: move into one of the five categories.
    const wasControls = old.trackId === ("CS" as TrackId);
    return {
      ...t,
      trackId: mapTrack(t.trackId)!,
      subtrackId: t.subtrackId && subtrackIds.has(t.subtrackId) ? t.subtrackId : null,
      archived: t.archived || wasControls,
      externalTeam: wasControls ? "Controls" : t.externalTeam,
      archivedReason: wasControls ? "Former Control & Safety category: implementation is owned by the Controls team. A lead can restore it if autonomy owns part of the work." : t.archivedReason,
      claimable: wasControls ? false : t.claimable,
    };
  });

  const existingTaskIds = new Set(db.tasks.map((t) => t.id));
  for (const s of seed.tasks) {
    if (existingTaskIds.has(s.id) || !NEW_IN_V2.taskIds.has(s.id)) continue;
    db.tasks.push(s);
    replaceChildren(s.id);
  }
  const taskIds = new Set(db.tasks.map((t) => t.id));

  // ── dependencies: seed edges are replaced by v2's; user edges are kept ──
  const userDeps = db.dependencies.filter((d) => !isSeedRow(d.id) && taskIds.has(d.fromTaskId) && taskIds.has(d.toTaskId));
  const deps = [...userDeps];
  for (const d of seed.dependencies) {
    if (!taskIds.has(d.fromTaskId) || !taskIds.has(d.toTaskId)) continue;
    if (deps.some((x) => x.fromTaskId === d.fromTaskId && x.toTaskId === d.toTaskId)) continue;
    if (wouldCreateCycle(deps, d.fromTaskId, d.toTaskId)) continue;
    deps.push(d);
  }
  db.dependencies = deps;

  // ── people ──
  const seedMembers = byId(seed.members);
  db.members = db.members.map((m): Member => {
    const s = seedMembers.get(m.id);
    if (s && m.isDemo && m.updatedAt === SEED_TIME) return { ...s, passwordHash: m.passwordHash, active: m.active };
    const primary = mapTrack(m.primaryTrackId);
    const secondary = mapTrack(m.secondaryTrackId);
    return { ...m, primaryTrackId: primary, secondaryTrackId: secondary === primary ? null : secondary, leadTrackIds: mapTracks(m.leadTrackIds) };
  });
  db.invitations = db.invitations.map((i) => ({ ...i, leadTrackIds: mapTracks(i.leadTrackIds) }));

  // ── catalog content ──
  const seedResources = byId(seed.resources);
  db.resources = db.resources.map((r) => {
    const s = seedResources.get(r.id);
    if (!s) return { ...r, trackIds: mapTracks(r.trackIds) };
    const lastVerified = [r.lastVerified, s.lastVerified].filter(Boolean).sort().pop() ?? null;
    return { ...s, lastVerified, addedBy: r.addedBy };
  });
  const resourceIds = new Set(db.resources.map((r) => r.id));
  for (const s of seed.resources) if (!resourceIds.has(s.id) && NEW_IN_V2.resourceIds.has(s.id)) db.resources.push(s);
  const validResources = new Set(db.resources.map((r) => r.id));
  db.taskResources = db.taskResources.filter((tr) => validResources.has(tr.resourceId) && taskIds.has(tr.taskId));
  db.repositories = seed.repositories;
  db.metricDefinitions = [...seed.metricDefinitions, ...db.metricDefinitions.filter((m) => !isSeedRow(m.id))];

  const seedTodos = byId(seed.researchTodos);
  db.researchTodos = db.researchTodos.map((t) => {
    const s = seedTodos.get(t.id);
    if (!s) return { ...t, trackId: mapTrack(t.trackId) };
    return t.status === "open" ? s : { ...s, status: t.status };
  });
  const todoIds = new Set(db.researchTodos.map((t) => t.id));
  for (const s of seed.researchTodos) if (!todoIds.has(s.id) && NEW_IN_V2.researchTodoTopics.has(s.topic)) db.researchTodos.push(s);

  const seedPaths = byId(seed.learningPaths);
  db.learningPaths = db.learningPaths.map((p) => seedPaths.get(p.id) ?? { ...p, trackId: mapTrack(p.trackId) });
  for (const s of seed.learningPaths) if (!db.learningPaths.some((p) => p.id === s.id) && NEW_IN_V2.learningPathSlugs.has(s.slug)) db.learningPaths.push(s);
  const seedModules = byId(seed.learningModules);
  const pathIds = new Set(db.learningPaths.map((p) => p.id));
  db.learningModules = db.learningModules.map((m) => seedModules.get(m.id) ?? m);
  for (const s of seed.learningModules) if (!db.learningModules.some((m) => m.id === s.id) && pathIds.has(s.pathId)) db.learningModules.push(s);

  const seedDocs = byId(seed.documents);
  const refreshedDocs = new Set<string>();
  db.documents = db.documents.map((d) => {
    const s = seedDocs.get(d.id);
    if (!s || d.updatedAt !== SEED_TIME) return d;
    refreshedDocs.add(d.id);
    return { ...s, ownerId: d.ownerId };
  });
  for (const s of seed.documents) {
    if (db.documents.some((d) => d.id === s.id) || !NEW_IN_V2.documentSlugs.has(s.slug)) continue;
    db.documents.push(s);
    refreshedDocs.add(s.id);
  }
  db.documentRevisions = [
    ...db.documentRevisions.filter((r) => !(refreshedDocs.has(r.documentId) && isSeedRow(r.id))),
    ...seed.documentRevisions.filter((r) => refreshedDocs.has(r.documentId)),
  ];

  const seedComponents = byId(seed.components);
  db.components = db.components
    .filter((c) => !isSeedRow(c.id) || seedComponents.has(c.id))
    .map((c) => {
      const s = seedComponents.get(c.id);
      return s ? { ...s, ownerId: c.ownerId, interfaceStatus: c.interfaceStatus } : Object.assign({ ownerTeam: "Autonomy" as const }, c);
    });
  for (const s of seed.components) if (!db.components.some((c) => c.id === s.id) && NEW_IN_V2.componentKeys.has(s.key)) db.components.push(s);

  // ── planning ──
  const seedMilestones = byId(seed.milestones);
  db.milestones = db.milestones.map((m) => {
    const s = seedMilestones.get(m.id);
    return s ? { ...s, status: m.status } : { ...m, trackIds: mapTracks(m.trackIds) };
  });
  const seedSprints = byId(seed.sprints);
  db.sprints = db.sprints.map((sp) => (seedSprints.has(sp.id) && sp.updatedAt === SEED_TIME ? seedSprints.get(sp.id)! : sp));

  db.experiments = db.experiments.map((e) => ({ ...e, trackId: mapTrack(e.trackId)! }));
  db.savedViews = db.savedViews.map((v): SavedView => ({ ...v, filters: { ...v.filters, trackIds: v.filters.trackIds ? mapTracks(v.filters.trackIds) : undefined } }));

  const extIds = new Set((db.externalDependencies ?? []).map((d) => d.id));
  db.externalDependencies = [...(db.externalDependencies ?? []), ...seed.externalDependencies.filter((d) => !extIds.has(d.id) && NEW_IN_V2.externalDependencyIds.has(d.id) && d.taskIds.every((id) => taskIds.has(id)))];

  db.settings = db.settings.map((s) => ({ ...s, dataVersion: 2, team: s.team === "Autonomous Systems" ? "Autonomy Team" : s.team }));
  const auditId = seedId("audit:migration:v2");
  if (!db.auditEvents.some((e) => e.id === auditId)) {
    const moved = db.tasks.filter((t) => t.legacyKeys.length).length;
    db.auditEvents.push({ id: auditId, actorId: null, action: "system.migrate", entity: "workspace", entityId: db.settings[0]?.id ?? "settings", summary: `Restructured into the autonomy team's five categories: ${moved} task(s) re-keyed with history preserved, ${db.tasks.filter((t) => t.archived).length} archived as externally owned`, href: "/docs/autonomy-team-structure", createdAt: new Date().toISOString() });
  }
  return db;
}

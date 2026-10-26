import { missingDependencies } from "@/lib/domain/dependencies";
import { computeReadiness, SUBSYSTEMS } from "@/lib/domain/readiness";
import { summarizeTasks } from "@/lib/domain/views";
import { loadContext } from "@/lib/server/data";
import { ReadinessClient } from "./readiness-client";

export const metadata = { title: "Mission Readiness" };

export default async function ReadinessPage() {
  const { db } = await loadContext();
  const summaries = summarizeTasks(db);
  const byKey = new Map(summaries.map((t) => [t.key, t]));
  const ownership = SUBSYSTEMS.map((s) => {
    const owners = new Set(s.keys.flatMap((k) => byKey.get(k)?.assignees.filter((a) => a.role === "owner").map((a) => a.memberId) ?? []));
    return { subsystem: s.name, owners: [...owners], unowned: s.keys.filter((k) => !byKey.get(k)?.assignees.some((a) => a.role === "owner")) };
  });
  const missing = db.tasks
    .filter((t) => !t.archived && t.backlog === "initial" && t.status !== "backlog" && t.status !== "available" && t.status !== "completed")
    .map((t) => ({ key: t.key, title: t.title, missing: missingDependencies(db.tasks, db.dependencies, t.id) }))
    .filter((x) => x.missing.length);
  const pick = (keys: string[]) => keys.map((k) => byKey.get(k)).filter((t): t is NonNullable<typeof t> => !!t);
  return (
    <ReadinessClient
      matrix={computeReadiness(db)}
      e2e={db.settings[0].e2eDemonstration}
      safety={pick(["SF-04", "AG-07", "AG-01", "NV-06", "AG-10"])}
      simulation={pick(["SIM-01", "SIM-02", "SIM-03", "SIM-04", "SIM-05", "SIM-07", "PM-07"])}
      missionTests={pick(["AG-08", "AG-01", "AG-02", "AG-03", "AG-05"])}
      externalDependencies={db.externalDependencies.map((d) => ({ ...d, taskKeys: d.taskIds.map((id) => db.tasks.find((t) => t.id === id)?.key).filter(Boolean) as string[] }))}
      blockers={db.blockers.filter((b) => !b.resolvedAt && !db.tasks.find((t) => t.id === b.taskId)?.archived).map((b) => ({ id: b.id, description: b.description, key: db.tasks.find((t) => t.id === b.taskId)!.key, priority: db.tasks.find((t) => t.id === b.taskId)!.priority })).filter((b) => b.priority === "critical" || b.priority === "high")}
      tracks={db.tracks.map((tr) => {
        const init = summaries.filter((t) => t.trackId === tr.id && t.backlog === "initial" && !t.archived);
        return { id: tr.id, name: `${tr.emoji} ${tr.name}`, total: init.length, completed: init.filter((t) => t.status === "completed").length, inProgress: init.filter((t) => !["backlog", "available", "completed"].includes(t.status)).length };
      })}
      ownership={ownership}
      missing={missing}
      experiments={db.experiments.filter((e) => !e.isDemo && e.trackId === "AG").length}
    />
  );
}

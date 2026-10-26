import { loadContext } from "@/lib/server/data";
import { ExperimentsClient } from "./experiments-client";

export const metadata = { title: "Experiments & Testing" };

export default async function ExperimentsPage() {
  const { db } = await loadContext();
  const keyOf = new Map(db.tasks.map((t) => [t.id, t.key]));
  return <ExperimentsClient experiments={db.experiments.map((e) => ({ ...e, taskKey: e.taskId ? keyOf.get(e.taskId) ?? null : null }))} metrics={db.metricDefinitions} tasks={db.tasks.map((t) => ({ id: t.id, key: t.key, title: t.title, trackId: t.trackId }))} />;
}

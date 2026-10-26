import { notFound } from "next/navigation";
import { loadContext } from "@/lib/server/data";
import { ExperimentDetail } from "./experiment-detail";

export default async function ExperimentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db } = await loadContext();
  const e = db.experiments.find((x) => x.id === id);
  if (!e) notFound();
  const task = e.taskId ? db.tasks.find((t) => t.id === e.taskId) : null;
  return <ExperimentDetail experiment={e} taskKey={task?.key ?? null} metrics={db.metricDefinitions} tasks={db.tasks.map((t) => ({ id: t.id, key: t.key, title: t.title, trackId: t.trackId }))} />;
}

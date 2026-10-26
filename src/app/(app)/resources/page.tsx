import { loadContext } from "@/lib/server/data";
import { ResourcesClient } from "./resources-client";

export const metadata = { title: "Resources" };

export default async function ResourcesPage() {
  const { db } = await loadContext();
  const usage = Object.fromEntries(db.resources.map((r) => [r.id, db.taskResources.filter((tr) => tr.resourceId === r.id).map((tr) => db.tasks.find((t) => t.id === tr.taskId)?.key).filter(Boolean) as string[]]));
  return <ResourcesClient resources={db.resources} usage={usage} todos={db.researchTodos} repositories={db.repositories} />;
}

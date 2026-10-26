import { summarizeTasks } from "@/lib/domain/views";
import { loadContext } from "@/lib/server/data";
import { ArchitectureClient } from "./architecture-client";

export const metadata = { title: "ROS Architecture" };

export default async function ArchitecturePage() {
  const { db } = await loadContext();
  const keys = new Set(db.components.flatMap((c) => c.taskKeys));
  return <ArchitectureClient components={db.components} tasks={summarizeTasks(db, (t) => keys.has(t.key))} />;
}

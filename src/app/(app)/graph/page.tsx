import { summarizeTasks } from "@/lib/domain/views";
import { loadContext } from "@/lib/server/data";
import { GraphClient } from "./graph-client";

export const metadata = { title: "Dependency Graph" };

export default async function GraphPage() {
  const { db } = await loadContext();
  return <GraphClient tasks={summarizeTasks(db)} deps={db.dependencies} />;
}

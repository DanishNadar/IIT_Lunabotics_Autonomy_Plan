import { summarizeTasks } from "@/lib/domain/views";
import { loadContext } from "@/lib/server/data";
import { RoadmapClient } from "./roadmap-client";

export const metadata = { title: "Technical Roadmap" };

export default async function RoadmapPage() {
  const { db } = await loadContext();
  return <RoadmapClient milestones={[...db.milestones].sort((a, b) => a.targetDate.localeCompare(b.targetDate))} tasks={summarizeTasks(db)} sprints={db.sprints} />;
}

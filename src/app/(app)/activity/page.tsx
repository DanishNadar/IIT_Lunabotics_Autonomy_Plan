import { loadContext } from "@/lib/server/data";
import { ActivityClient } from "./activity-client";

export const metadata = { title: "Activity Feed" };

export default async function ActivityPage() {
  const { db } = await loadContext();
  return <ActivityClient events={[...db.auditEvents].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 500)} />;
}

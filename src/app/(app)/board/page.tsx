import { summarizeTasks } from "@/lib/domain/views";
import { loadContext } from "@/lib/server/data";
import { BoardClient } from "./board-client";

export const metadata = { title: "All Tasks" };

export default async function BoardPage() {
  const { db, actor } = await loadContext();
  return <BoardClient tasks={summarizeTasks(db)} savedViews={db.savedViews.filter((v) => v.memberId === actor.id)} />;
}

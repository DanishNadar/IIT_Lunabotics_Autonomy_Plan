import { DIFFICULTIES } from "@/lib/domain/types";
import { loadContext } from "@/lib/server/data";
import { StartClient } from "./start-client";

export const metadata = { title: "Start here" };

export default async function StartPage() {
  const { db } = await loadContext();
  const firstByTrack = Object.fromEntries(
    db.tracks.map((tr) => {
      const t = db.tasks
        .filter((x) => !x.archived && x.trackId === tr.id && x.backlog === "initial")
        .sort((a, b) => Number(b.status === "available") - Number(a.status === "available") || DIFFICULTIES.indexOf(a.difficulty) - DIFFICULTIES.indexOf(b.difficulty))[0];
      return [tr.id, t ? { key: t.key, title: t.title } : null];
    }),
  );
  const counts = {
    tasks: db.tasks.filter((t) => !t.archived).length,
    resources: db.resources.length,
    paths: db.learningPaths.length,
    videos: db.resources.filter((r) => r.type === "video").length,
  };
  return <StartClient firstByTrack={firstByTrack} counts={counts} />;
}

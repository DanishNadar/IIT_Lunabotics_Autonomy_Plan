import { notFound } from "next/navigation";
import { summarizeTasks } from "@/lib/domain/views";
import { loadContext } from "@/lib/server/data";
import { PathClient } from "./path-client";

export default async function PathPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { db, actor } = await loadContext();
  const path = db.learningPaths.find((p) => p.slug === slug);
  if (!path) notFound();
  const modules = db.learningModules.filter((m) => m.pathId === path.id).sort((a, b) => a.order - b.order);
  const resources = Object.fromEntries(db.resources.filter((r) => modules.some((m) => m.resourceIds.includes(r.id))).map((r) => [r.id, r]));
  const done = db.learningProgress.filter((lp) => lp.memberId === actor.id).map((lp) => lp.moduleId);
  const followOn = summarizeTasks(db, (t) => path.followOnTaskKeys.includes(t.key));
  return <PathClient path={path} modules={modules} resources={resources} done={done} followOn={followOn} />;
}

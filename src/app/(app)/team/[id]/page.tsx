import { notFound } from "next/navigation";
import { summarizeTasks } from "@/lib/domain/views";
import { memberWorkload } from "@/lib/domain/workload";
import { loadContext, publicMember } from "@/lib/server/data";
import { ProfileClient } from "./profile-client";

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db, actor } = await loadContext();
  const m = db.members.find((x) => x.id === id);
  if (!m) notFound();
  const mine = new Set(db.assignments.filter((a) => a.memberId === m.id).map((a) => a.taskId));
  const paths = db.learningPaths.map((p) => {
    const mods = db.learningModules.filter((x) => x.pathId === p.id);
    return { slug: p.slug, title: p.title, done: mods.filter((x) => db.learningProgress.some((lp) => lp.memberId === m.id && lp.moduleId === x.id)).length, total: mods.length };
  });
  return (
    <ProfileClient
      member={publicMember(m, actor)}
      tasks={summarizeTasks(db, (t) => mine.has(t.id))}
      workload={memberWorkload(m, db.tasks, db.assignments, db.checklistItems)}
      activity={db.auditEvents.filter((e) => e.actorId === m.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 20)}
      paths={paths}
      reviews={db.reviews.filter((r) => r.reviewerId === m.id).length}
      logs={db.progressLogs.filter((l) => l.memberId === m.id).length}
    />
  );
}

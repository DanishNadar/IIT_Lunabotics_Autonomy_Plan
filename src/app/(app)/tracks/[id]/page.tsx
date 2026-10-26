import { notFound } from "next/navigation";
import { summarizeTasks } from "@/lib/domain/views";
import { loadContext } from "@/lib/server/data";
import { TrackClient } from "./track-client";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  return { title: `Category ${(await params).id.toUpperCase()}` };
}

export default async function TrackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db } = await loadContext();
  const track = db.tracks.find((t) => t.id === id.toUpperCase());
  if (!track) notFound();
  const tasks = summarizeTasks(db, (t) => t.trackId === track.id);
  const ids = new Set(tasks.map((t) => t.id));
  const keyOf = new Map(db.tasks.map((t) => [t.id, { key: t.key, trackId: t.trackId, title: t.title, status: t.status }]));
  const cross = db.dependencies
    .filter((d) => (ids.has(d.fromTaskId) || ids.has(d.toTaskId)) && keyOf.get(d.fromTaskId)!.trackId !== keyOf.get(d.toTaskId)!.trackId)
    .map((d) => ({ id: d.id, kind: d.kind, from: keyOf.get(d.fromTaskId)!, to: keyOf.get(d.toTaskId)!, inbound: ids.has(d.toTaskId) }));
  const memberIds = new Set(db.assignments.filter((a) => ids.has(a.taskId)).map((a) => a.memberId));
  const members = db.members.filter((m) => m.active && (memberIds.has(m.id) || m.primaryTrackId === track.id || m.secondaryTrackId === track.id || m.leadTrackIds.includes(track.id))).map((m) => ({ id: m.id, name: m.name, color: m.avatarColor, role: m.role, lead: m.leadTrackIds.includes(track.id), primary: m.primaryTrackId === track.id, isDemo: m.isDemo }));
  const milestones = db.milestones.filter((m) => m.trackIds.includes(track.id)).map((m) => ({ ...m, tasks: tasks.filter((t) => t.milestoneId === m.id).length, done: tasks.filter((t) => t.milestoneId === m.id && t.status === "completed").length }));
  const resources = db.resources.filter((r) => r.trackIds.includes(track.id));
  const docs = db.documents.filter((d) => d.tags.some((t) => track.name.toLowerCase().includes(t)) || d.body.includes(`${track.id}-`)).map((d) => ({ slug: d.slug, title: d.title, category: d.category }));
  const paths = db.learningPaths.filter((p) => p.trackId === track.id).map((p) => ({ slug: p.slug, title: p.title, summary: p.summary }));
  const externalDependencies = db.externalDependencies
    .filter((d) => track.id === "AG" || d.taskIds.some((id) => ids.has(id)))
    .map((d) => ({ ...d, tasks: d.taskIds.map((id) => db.tasks.find((t) => t.id === id)).filter((t): t is NonNullable<typeof t> => !!t).map((t) => ({ key: t.key, title: t.title })) }));
  return <TrackClient externalDependencies={externalDependencies} track={track} subtracks={db.subtracks.filter((s) => s.trackId === track.id).sort((a, b) => a.order - b.order)} tasks={tasks} cross={cross} members={members} milestones={milestones} resources={resources} docs={docs} paths={paths} />;
}

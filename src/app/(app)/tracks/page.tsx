import Link from "next/link";
import { checklistProgress } from "@/lib/domain/checklist";
import { isActive } from "@/lib/domain/status";
import { loadContext } from "@/lib/server/data";
import { pct } from "@/lib/utils";

export const metadata = { title: "Autonomy Team" };

export default async function TracksPage() {
  const { db } = await loadContext();
  return (
    <div className="mx-auto max-w-[1400px] space-y-4 p-4">
      <div>
        <h1 className="text-xl font-semibold">Autonomy team</h1>
        <p className="text-xs text-muted">Four technical subteams and Autonomy General, one per Discord channel. Other teams (Controls, Electrical, Mechanical) appear only where their interfaces affect autonomy.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {db.tracks.map((tr) => {
          const tasks = db.tasks.filter((t) => t.trackId === tr.id && !t.archived);
          const init = tasks.filter((t) => t.backlog === "initial");
          const done = init.filter((t) => t.status === "completed").length;
          const active = init.filter((t) => isActive(t.status)).length;
          const steps = checklistProgress(db.checklistItems.filter((c) => init.some((t) => t.id === c.taskId)));
          const members = new Set(db.assignments.filter((a) => tasks.some((t) => t.id === a.taskId)).map((a) => a.memberId)).size;
          const leads = db.members.filter((m) => m.role === "track_lead" && m.leadTrackIds.includes(tr.id));
          const cross = db.dependencies.filter((d) => {
            const a = db.tasks.find((t) => t.id === d.fromTaskId);
            const b = db.tasks.find((t) => t.id === d.toTaskId);
            return a && b && a.trackId !== b.trackId && (a.trackId === tr.id || b.trackId === tr.id);
          }).length;
          return (
            <Link key={tr.id} href={`/tracks/${tr.id}`} className="group rounded-lg border border-line bg-panel p-4 hover:border-line-strong">
              <div className="flex items-center gap-2">
                <span aria-hidden className="text-base">{tr.emoji}</span>
                <h2 className="text-sm font-semibold group-hover:underline">{tr.name}</h2>
                <span className="ml-auto font-mono text-[10px] text-muted">{tr.emoji} {tr.discordChannel}</span>
              </div>
              <p className="mt-2 line-clamp-2 text-xs text-fg-2">{tr.mission}</p>
              <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                {[["Initial", init.length], ["Advanced", tasks.length - init.length], ["Active", active], ["Approved", done]].map(([l, v]) => (
                  <div key={l as string}><div className="font-mono text-base font-semibold">{v}</div><div className="text-[10px] text-muted uppercase">{l}</div></div>
                ))}
              </div>
              <div className="mt-3 space-y-1 text-[11px] text-muted">
                <div className="flex justify-between"><span>Approved tasks</span><span className="font-mono">{pct(done, init.length)}%</span></div>
                <div className="h-1 rounded-full bg-panel-3"><div className="h-full rounded-full bg-ok" style={{ width: `${pct(done, init.length)}%` }} /></div>
                <div className="flex justify-between"><span>Checklist steps done</span><span className="font-mono">{steps.done}/{steps.total}</span></div>
                <div className="flex justify-between"><span>Members · leads · cross-track deps</span><span className="font-mono">{members} · {leads.length} · {cross}</span></div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

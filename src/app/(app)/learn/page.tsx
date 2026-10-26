import { GraduationCap } from "lucide-react";
import Link from "next/link";
import { loadContext } from "@/lib/server/data";
import { pct } from "@/lib/utils";

export const metadata = { title: "Learning Paths" };

export default async function LearnPage() {
  const { db, actor } = await loadContext();
  return (
    <div className="mx-auto max-w-[1200px] space-y-4 p-4">
      <div>
        <h1 className="text-xl font-semibold">Guided learning paths</h1>
        <p className="max-w-2xl text-xs text-muted">For students new to robotics. Paths are optional scaffolding — you can claim a beginner task early and learn alongside it. Progress is tracked per member.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {db.learningPaths.sort((a, b) => a.order - b.order).map((p) => {
          const mods = db.learningModules.filter((m) => m.pathId === p.id);
          const done = mods.filter((m) => db.learningProgress.some((lp) => lp.memberId === actor.id && lp.moduleId === m.id)).length;
          const learners = new Set(db.learningProgress.filter((lp) => mods.some((m) => m.id === lp.moduleId)).map((lp) => lp.memberId)).size;
          return (
            <Link key={p.id} href={`/learn/${p.slug}`} className="group rounded-lg border border-line bg-panel p-4 hover:border-line-strong">
              <div className="flex items-center gap-2">
                <GraduationCap className="size-4 text-accent" />
                <h2 className="text-sm font-semibold group-hover:underline">{p.title}</h2>
                {p.trackId && <span className="ml-auto font-mono text-[10px] text-muted">{p.trackId}</span>}
              </div>
              <p className="mt-1 text-[11px] text-muted">{p.audience}</p>
              <p className="mt-2 text-xs text-fg-2">{p.summary}</p>
              <div className="mt-3 flex items-center gap-2 text-[11px] text-muted">
                <div className="h-1 flex-1 rounded-full bg-panel-3"><div className="h-full rounded-full bg-ok" style={{ width: `${pct(done, mods.length)}%` }} /></div>
                <span className="font-mono">{done}/{mods.length}</span>
                <span>· {learners} learner(s)</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

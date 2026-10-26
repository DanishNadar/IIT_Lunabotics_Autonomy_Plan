import { ArrowRight, GraduationCap, Layers } from "lucide-react";
import Link from "next/link";
import { Reveal, Stagger, StaggerItem } from "@/components/ui/motion";
import { loadContext } from "@/lib/server/data";

export const metadata = { title: "Learning Paths" };

export default async function LearnPage() {
  const { db } = await loadContext();
  const paths = [...db.learningPaths].sort((a, b) => a.order - b.order);
  return (
    <div className="mx-auto max-w-[1200px] space-y-10 px-4 py-8 sm:px-8">
      <Reveal className="space-y-3">
        <div className="flex size-14 animate-float items-center justify-center rounded-xl bg-accent text-white shadow-lg">
          <GraduationCap className="size-7" />
        </div>
        <h1 className="text-4xl font-bold">Guided learning paths</h1>
        <p className="max-w-2xl text-[17px] leading-relaxed text-fg-2">
          New to robotics? Each path is a short sequence of modules with tutorials, videos and small exercises. You don&apos;t have to finish one before starting a task: most people pick a beginner task after a few modules and learn alongside it.
        </p>
      </Reveal>
      <Stagger className="grid gap-5 md:grid-cols-2">
        {paths.map((p, i) => {
          const mods = db.learningModules.filter((m) => m.pathId === p.id).sort((a, b) => a.order - b.order);
          const track = db.tracks.find((t) => t.id === p.trackId);
          return (
            <StaggerItem key={p.id} className="h-full">
              <Link href={`/learn/${p.slug}`} className="lift group flex h-full flex-col gap-4 rounded-xl border border-line bg-panel/90 p-6 shadow-[var(--shadow)]" style={{ borderTop: `4px solid ${track?.color ?? "var(--accent)"}` }}>
                <div className="flex items-start gap-4">
                  <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-panel-2 text-3xl transition-transform group-hover:scale-110" aria-hidden>
                    {i === 0 ? "🚀" : track?.emoji ?? "🎓"}
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-[20px] font-semibold">{p.title}</h2>
                    <p className="text-[14px] text-muted">{p.audience}</p>
                  </div>
                </div>
                <p className="flex-1 text-[15px] leading-relaxed text-fg-2">{p.summary}</p>
                <div className="flex items-center gap-1.5" aria-label={`${mods.length} modules`}>
                  {mods.map((m, j) => (
                    <span key={m.id} title={m.title} className="h-2 flex-1 rounded-full bg-panel-3 transition-colors group-hover:bg-accent/40" style={{ transitionDelay: `${j * 40}ms` }} />
                  ))}
                </div>
                <div className="flex items-center justify-between text-[14px]">
                  <span className="inline-flex items-center gap-1.5 text-muted">
                    <Layers className="size-4" /> {mods.length} modules
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-medium text-accent">
                    Start path <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            </StaggerItem>
          );
        })}
      </Stagger>
    </div>
  );
}

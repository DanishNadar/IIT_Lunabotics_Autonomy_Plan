import type { ReactNode } from "react";
import { Reveal } from "@/components/ui/motion";
import { cn } from "@/lib/utils";

export function Section({ id, letter, title, subtitle, actions, children, className }: { id: string; letter?: string; title: string; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Reveal>
      <section id={id} className={cn("scroll-mt-24 rounded-xl border border-line bg-panel/90 shadow-[var(--shadow)]", className)} aria-labelledby={`${id}-title`}>
        <header className="flex items-center gap-3 border-b border-line px-6 py-4">
          {letter && <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-accent-soft font-mono text-[15px] font-bold text-accent">{letter}</span>}
          <div className="min-w-0 flex-1">
            <h2 id={`${id}-title`} className="text-[19px] font-semibold text-fg">{title}</h2>
            {subtitle && <p className="text-[14px] text-muted">{subtitle}</p>}
          </div>
          {actions}
        </header>
        <div className="p-6">{children}</div>
      </section>
    </Reveal>
  );
}

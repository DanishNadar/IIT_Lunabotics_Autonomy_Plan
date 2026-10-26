import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Section({ id, letter, title, subtitle, actions, children, className }: { id: string; letter?: string; title: string; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={cn("scroll-mt-32 rounded-lg border border-line bg-panel", className)} aria-labelledby={`${id}-title`}>
      <header className="flex items-center gap-2 border-b border-line px-4 py-2.5">
        {letter && <span className="flex size-5 items-center justify-center rounded bg-panel-3 font-mono text-[10px] font-semibold text-muted">{letter}</span>}
        <div className="min-w-0 flex-1">
          <h2 id={`${id}-title`} className="text-[13px] font-semibold text-fg">{title}</h2>
          {subtitle && <p className="text-[11px] text-muted">{subtitle}</p>}
        </div>
        {actions}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface TabDef<T extends string> {
  id: T;
  label: string;
  icon?: ReactNode;
  count?: number;
}

/** Large pill tabs with a sliding highlight. */
export function TabBar<T extends string>({ tabs, value, onChange, label }: { tabs: TabDef<T>[]; value: T; onChange: (id: T) => void; label: string }) {
  const layoutId = useId();
  return (
    <div role="tablist" aria-label={label} className="flex gap-2 overflow-x-auto rounded-xl border border-line bg-panel/70 p-1.5">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={cn("relative flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-[15px] font-medium transition-colors [&_svg]:size-[18px]", value === t.id ? "text-fg" : "text-muted hover:text-fg")}
        >
          {value === t.id && <motion.span layoutId={layoutId} className="absolute inset-0 rounded-lg bg-panel-3" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
          <span className="relative flex items-center gap-2">
            {t.icon}
            {t.label}
            {!!t.count && <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-white">{t.count}</span>}
          </span>
        </button>
      ))}
    </div>
  );
}

/** Animates between tab contents; `id` is the active tab. */
export function TabPanel({ id, children }: { id: string; children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence mode="wait">
      <motion.div key={id} role="tabpanel" initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/** Roomy content card used inside tabs. */
export function Card({ title, subtitle, icon, action, children, className }: { title: ReactNode; subtitle?: ReactNode; icon?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-line bg-panel/90 p-6 shadow-[var(--shadow)]", className)}>
      <div className="mb-5 flex items-start gap-3">
        {icon && <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent [&_svg]:size-5">{icon}</span>}
        <div className="min-w-0 flex-1">
          <h3 className="text-[19px] font-semibold">{title}</h3>
          {subtitle && <p className="mt-0.5 text-[15px] text-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

/** A numbered instruction step. */
export function Step({ n, title, children, done }: { n: number; title: ReactNode; children?: ReactNode; done?: boolean }) {
  return (
    <li className="flex gap-4">
      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full text-[15px] font-bold", done ? "bg-ok text-white" : "bg-accent-soft text-accent")}>{done ? "✓" : n}</span>
      <div className="min-w-0 flex-1 pt-1">
        <div className="text-[16px] font-semibold text-fg">{title}</div>
        {children && <div className="mt-1 space-y-2 text-[15px] text-fg-2">{children}</div>}
      </div>
    </li>
  );
}

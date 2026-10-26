"use client";

import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, AlertTriangle, X } from "lucide-react";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type Toast = { id: number; kind: "ok" | "error"; text: string };
const Ctx = createContext<(kind: Toast["kind"], text: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((kind: Toast["kind"], text: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-3), { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === "error" ? 7000 : 3200);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed right-3 bottom-3 z-[60] flex w-[340px] max-w-[calc(100vw-24px)] flex-col gap-2" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 20 }}
              role={t.kind === "error" ? "alert" : "status"}
              className="pointer-events-auto flex items-start gap-2 rounded-md border border-line-strong bg-panel-2 px-3 py-2 text-xs text-fg shadow-[var(--shadow)]"
            >
              {t.kind === "ok" ? <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-ok" /> : <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warn" />}
              <span className="flex-1">{t.text}</span>
              <button onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} aria-label="Dismiss" className="text-muted hover:text-fg">
                <X className="size-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);

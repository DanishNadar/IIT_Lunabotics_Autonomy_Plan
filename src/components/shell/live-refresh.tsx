"use client";

import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Keeps every open browser in sync with shared data.
 * Supabase: realtime postgres_changes (RLS-filtered). Local store: polls a version token.
 */
export function LiveRefresh({ realtime }: { realtime: { url: string; anonKey: string } | null }) {
  const router = useRouter();
  const version = useRef<string | null>(null);

  useEffect(() => {
    if (realtime) {
      const sb = createClient(realtime.url, realtime.anonKey);
      let timer: ReturnType<typeof setTimeout> | null = null;
      const channel = sb
        .channel("acc-changes")
        .on("postgres_changes", { event: "*", schema: "public" }, () => {
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => router.refresh(), 400);
        })
        .subscribe();
      return () => {
        void sb.removeChannel(channel);
      };
    }
    let stopped = false;
    const tick = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        const { version: v } = (await res.json()) as { version: string };
        if (version.current !== null && v !== version.current && !stopped) router.refresh();
        version.current = v;
      } catch {
        // offline; try again next tick
      }
    };
    void tick();
    const id = setInterval(tick, 8000);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [realtime, router]);

  return null;
}

"use client";

import { useEffect, useId, useState } from "react";

export function Mermaid({ chart }: { chart: string }) {
  const id = useId().replace(/:/g, "");
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        const dark = document.documentElement.dataset.theme !== "light";
        mermaid.initialize({ startOnLoad: false, theme: dark ? "dark" : "default", securityLevel: "strict" });
        const { svg } = await mermaid.render(`m${id}`, chart);
        if (alive) setSvg(svg);
      } catch (e) {
        if (alive) setError((e as Error).message);
      }
    })();
    return () => {
      alive = false;
    };
  }, [chart, id]);

  if (error) return <pre className="rounded border border-warn/30 bg-warn-soft p-2 text-[11px] text-warn">Mermaid error: {error}</pre>;
  if (!svg) return <div className="h-24 animate-pulse rounded bg-panel-3" />;
  return <div className="my-2 overflow-x-auto rounded border border-line bg-panel-2 p-2" dangerouslySetInnerHTML={{ __html: svg }} />;
}

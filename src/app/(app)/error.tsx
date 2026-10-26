"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/primitives";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-6 text-center">
      <AlertTriangle className="size-8 text-warn" />
      <h1 className="text-base font-semibold">This page failed to load</h1>
      <p className="max-w-md text-[13px] text-muted">{error.message || "An unexpected error occurred."}{error.digest && <span className="block font-mono text-faint">ref {error.digest}</span>}</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}

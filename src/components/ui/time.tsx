"use client";

import { ago, day } from "@/lib/utils";

/**
 * Relative and local-time renderings depend on the viewer's clock and timezone,
 * which can differ from the server's; render without hydration warnings.
 */
export function Ago({ iso }: { iso: string | null | undefined }) {
  return (
    <time dateTime={iso ?? undefined} title={iso ?? undefined} suppressHydrationWarning>
      {ago(iso)}
    </time>
  );
}

export function When({ iso, pattern }: { iso: string | null | undefined; pattern?: string }) {
  return (
    <time dateTime={iso ?? undefined} suppressHydrationWarning>
      {day(iso, pattern)}
    </time>
  );
}

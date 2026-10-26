import { clsx, type ClassValue } from "clsx";
import { formatDistanceToNowStrict, format } from "date-fns";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function ago(iso: string | null | undefined) {
  if (!iso) return "—";
  return formatDistanceToNowStrict(new Date(iso), { addSuffix: true });
}

export function day(iso: string | null | undefined, pattern = "MMM d") {
  if (!iso) return "—";
  // Date-only strings are calendar dates; avoid timezone shifting.
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T12:00:00`) : new Date(iso);
  return format(d, pattern);
}

export function initials(name: string) {
  return name
    .replace(/\(.*?\)/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function pct(n: number, d: number) {
  return d ? Math.round((n / d) * 100) : 0;
}

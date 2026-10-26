import type { Tone } from "@/components/ui/primitives";
import type { Difficulty, Priority, TaskStatus } from "./domain/types";

export const STATUS_TONE: Record<TaskStatus, Tone> = {
  backlog: "neutral",
  available: "info",
  assigned: "violet",
  researching: "violet",
  designing: "violet",
  implementing: "accent",
  testing: "warn",
  in_review: "info",
  blocked: "danger",
  completed: "ok",
};

export const STATUS_DOT: Record<TaskStatus, string> = {
  backlog: "bg-faint",
  available: "bg-info",
  assigned: "bg-violet",
  researching: "bg-violet",
  designing: "bg-violet",
  implementing: "bg-accent",
  testing: "bg-warn",
  in_review: "bg-info",
  blocked: "bg-danger",
  completed: "bg-ok",
};

export const PRIORITY_TONE: Record<Priority, Tone> = { critical: "danger", high: "warn", medium: "neutral", low: "neutral" };
export const PRIORITY_LABEL: Record<Priority, string> = { critical: "Critical", high: "High", medium: "Medium", low: "Low" };
export const DIFFICULTY_LABEL: Record<Difficulty, string> = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced", expert: "Expert" };
export const DIFFICULTY_BARS: Record<Difficulty, number> = { beginner: 1, intermediate: 2, advanced: 3, expert: 4 };

export const EXTERNAL_DEP_STATUS: Record<"not_requested" | "requested" | "in_progress" | "delivered" | "blocked", { label: string; tone: Tone }> = {
  not_requested: { label: "Not requested", tone: "neutral" },
  requested: { label: "Requested", tone: "info" },
  in_progress: { label: "In progress", tone: "violet" },
  delivered: { label: "Delivered", tone: "ok" },
  blocked: { label: "Blocked", tone: "danger" },
};

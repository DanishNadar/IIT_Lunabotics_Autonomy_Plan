import type { AcceptanceCriterion, Deliverable, Task, Track } from "./types";
import { STATUS_LABEL } from "./types";

const PRIORITY = { critical: "Critical", high: "High", medium: "Medium", low: "Low" } as const;
const DIFFICULTY = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced", expert: "Expert" } as const;
const DISCORD_LIMIT = 2000;

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

/**
 * A task summary formatted for pasting into Discord (Markdown, < 2000 characters).
 * Nothing is posted automatically.
 */
export function discordSummary(
  task: Pick<Task, "key" | "title" | "priority" | "difficulty" | "status" | "spec" | "archived" | "externalTeam">,
  track: Pick<Track, "emoji" | "discordChannel">,
  deliverables: Pick<Deliverable, "title" | "required">[],
  acceptance: Pick<AcceptanceCriterion, "text">[],
  url: string,
): string {
  const refs = task.spec.references.slice(0, 3);
  const readFirst = refs[0] ? `${refs[0].repo.split("/").pop()} — \`${refs[0].path}\`` : task.spec.readFirst[0] ?? "See the task page.";
  const required = deliverables.filter((d) => d.required).map((d) => d.title);
  const lines = [
    `**[${task.key}] ${task.title}**`,
    "",
    `Track: ${track.emoji} ${track.discordChannel}`,
    `Priority: ${PRIORITY[task.priority]}`,
    `Difficulty: ${DIFFICULTY[task.difficulty]}`,
    `Status: ${task.archived ? `Archived${task.externalTeam ? ` (${task.externalTeam}-owned)` : ""}` : STATUS_LABEL[task.status]}`,
    "",
    `**Goal:** ${clip(task.spec.goal, 420)}`,
    "",
    `**Read first:** ${clip(readFirst, 200)}`,
    "",
    `**Deliverables:** ${clip(required.join(", ") || "See the task page.", 300)}`,
    "",
    `**Acceptance:** ${clip(acceptance[0]?.text ?? "See the task page.", 260)}${acceptance.length > 1 ? ` (+${acceptance.length - 1} more)` : ""}`,
    "",
    `**Task:** <${url}>`,
  ];
  if (refs.length) {
    lines.push("**References:**");
    for (const r of refs) lines.push(`• ${r.repo.split("/").pop()}: <${r.url}>`);
  }
  let text = lines.join("\n");
  // Drop references, then shorten the goal, until it fits Discord's message limit.
  while (text.length > DISCORD_LIMIT && lines.length > 16) {
    lines.pop();
    text = lines.join("\n");
  }
  return text.length > DISCORD_LIMIT ? clip(text, DISCORD_LIMIT) : text;
}

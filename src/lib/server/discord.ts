import "server-only";
import type { Command, Outcome } from "@/lib/domain/commands";
import { env } from "./env";

/**
 * Optional Discord webhook for team-relevant events only (new blockers, review
 * requests, sprint starts). Disabled unless DISCORD_WEBHOOK_URL is configured.
 */
export async function notifyDiscord(cmd: Command, outcome: Outcome) {
  if (!env.discordWebhookUrl) return;
  const relevant: Partial<Record<Command["type"], string>> = {
    "task.block": "🚧 New blocker",
    "review.request": "🔍 Review requested",
    "sprint.start": "🚀 Sprint started",
    "review.submit": "✅ Review submitted",
  };
  const label = relevant[cmd.type];
  if (!label) return;
  try {
    await fetch(env.discordWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: `${label}: ${outcome.message ?? ""}`.slice(0, 1900), allowed_mentions: { parse: [] } }),
    });
  } catch (e) {
    console.warn("discord notification failed", e);
  }
}

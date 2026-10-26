"use server";

import { revalidatePath } from "next/cache";
import type { Op } from "@/lib/domain/ops";
import { getActor } from "@/lib/server/auth";
import { fetchIssue, fetchPullRequest } from "@/lib/server/github";
import { getStore } from "@/lib/server/store";

/**
 * Refreshes PR/issue state from GitHub. State is display-only: syncing never
 * changes task status (merged ≠ done; review completes tasks).
 */
export async function syncGithubLinks(taskId: string): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  const actor = await getActor();
  const store = getStore();
  const db = await store.snapshot();
  const task = db.tasks.find((t) => t.id === taskId);
  if (!task) return { ok: false, error: "Task not found." };
  if (actor.role === "viewer") return { ok: false, error: "Unlock admin to sync GitHub status." };
  const links = db.githubLinks.filter((g) => g.taskId === taskId && (g.kind === "pr" || g.kind === "issue") && g.number);
  const ops: Op[] = [];
  const errors: string[] = [];
  const now = new Date().toISOString();
  await Promise.all(
    links.map(async (l) => {
      try {
        const r = l.kind === "pr" ? await fetchPullRequest(l.repo, l.number!) : { ...(await fetchIssue(l.repo, l.number!)), checks: l.checks };
        ops.push({ op: "update", c: "githubLinks", id: l.id, patch: { state: r.state, checks: r.checks, title: r.title, syncedAt: now } });
      } catch (e) {
        errors.push((e as Error).message);
      }
    }),
  );
  if (ops.length) await store.exclusive(() => store.apply(ops));
  revalidatePath(`/tasks/${task.key}`);
  if (errors.length && !ops.length) return { ok: false, error: `Could not reach GitHub: ${errors[0]}. Private repos need GITHUB_TOKEN.` };
  return { ok: true, message: `Synced ${ops.length} link(s)${errors.length ? `; ${errors.length} failed` : ""}.` };
}

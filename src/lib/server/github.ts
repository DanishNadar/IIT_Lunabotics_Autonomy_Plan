import "server-only";
import { env } from "./env";

const API = "https://api.github.com";

function headers() {
  const h: Record<string, string> = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "lunabotics-command-center" };
  // Optional fine-grained token with read-only access to public repos / the team repo.
  if (env.githubToken) h.Authorization = `Bearer ${env.githubToken}`;
  return h;
}

export async function fetchPullRequest(repo: string, number: number) {
  const res = await fetch(`${API}/repos/${repo}/pulls/${number}`, { headers: headers(), cache: "no-store" });
  if (!res.ok) throw new Error(`GitHub ${res.status} for ${repo}#${number}`);
  const pr = (await res.json()) as { state: string; merged: boolean; draft: boolean; title: string; head: { sha: string } };
  let checks: "passing" | "failing" | "pending" | "none" | "unknown" = "unknown";
  try {
    const c = await fetch(`${API}/repos/${repo}/commits/${pr.head.sha}/check-runs?per_page=100`, { headers: headers(), cache: "no-store" });
    if (c.ok) {
      const body = (await c.json()) as { check_runs: { status: string; conclusion: string | null }[] };
      const runs = body.check_runs;
      checks = !runs.length ? "none" : runs.some((r) => r.status !== "completed") ? "pending" : runs.every((r) => ["success", "neutral", "skipped"].includes(r.conclusion ?? "")) ? "passing" : "failing";
    }
  } catch {
    /* checks optional */
  }
  const state = pr.merged ? "merged" : pr.state === "closed" ? "closed" : pr.draft ? "draft" : "open";
  return { state: state as "open" | "draft" | "merged" | "closed", title: pr.title, checks };
}

export async function fetchIssue(repo: string, number: number) {
  const res = await fetch(`${API}/repos/${repo}/issues/${number}`, { headers: headers(), cache: "no-store" });
  if (!res.ok) throw new Error(`GitHub ${res.status} for ${repo}#${number}`);
  const i = (await res.json()) as { state: string; title: string };
  return { state: (i.state === "closed" ? "closed" : "open") as "open" | "closed", title: i.title };
}

const MAX_BYTES = 200_000;

/** Converts a github.com blob URL to raw content and fetches it (size-limited). */
export async function fetchSourceFile(url: string): Promise<{ text: string; truncated: boolean }> {
  const u = new URL(url);
  let raw: string;
  if (u.hostname === "raw.githubusercontent.com") raw = url;
  else if (u.hostname === "github.com") {
    const m = u.pathname.match(/^\/([^/]+)\/([^/]+)\/blob\/(.+)$/);
    if (!m) throw new Error("Only file (blob) URLs can be previewed.");
    raw = `https://raw.githubusercontent.com/${m[1]}/${m[2]}/${m[3]}`;
  } else throw new Error("Only GitHub URLs can be previewed.");
  const res = await fetch(raw, { headers: env.githubToken ? { Authorization: `Bearer ${env.githubToken}` } : {}, next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`GitHub returned ${res.status}`);
  const text = await res.text();
  return text.length > MAX_BYTES ? { text: text.slice(0, MAX_BYTES), truncated: true } : { text, truncated: false };
}

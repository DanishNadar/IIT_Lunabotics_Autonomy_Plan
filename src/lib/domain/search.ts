import type { Database } from "./types";

export interface SearchHit {
  kind: "task" | "member" | "track" | "doc" | "resource" | "experiment" | "repository" | "path";
  id: string;
  title: string;
  subtitle: string;
  href: string;
  snippet?: string;
  score: number;
}

function snippetAround(text: string, terms: string[]) {
  const lower = text.toLowerCase();
  const idx = Math.min(...terms.map((t) => lower.indexOf(t)).filter((i) => i >= 0));
  if (!Number.isFinite(idx)) return undefined;
  const start = Math.max(0, idx - 50);
  return (start > 0 ? "…" : "") + text.slice(start, idx + 90).replace(/\s+/g, " ") + "…";
}

/**
 * Simple weighted term search across the workspace. Title matches outrank body
 * matches; every term must match somewhere.
 */
export function search(db: Database, query: string, limit = 30): SearchHit[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const hits: SearchHit[] = [];
  const score = (title: string, body: string) => {
    const t = title.toLowerCase();
    const b = body.toLowerCase();
    let s = 0;
    for (const term of terms) {
      if (t.includes(term)) s += t.startsWith(term) ? 6 : 4;
      else if (b.includes(term)) s += 1;
      else return 0;
    }
    return s;
  };
  const push = (h: Omit<SearchHit, "score">, title: string, body: string) => {
    const s = score(title, body);
    if (s > 0) hits.push({ ...h, score: s, snippet: score(title, "") ? undefined : snippetAround(body, terms) });
  };

  for (const t of db.tasks) {
    const spec = t.spec;
    const body = [spec.problem, spec.goal, spec.background, spec.design, spec.references.map((r) => `${r.repo} ${r.path} ${r.summary} ${r.inspect.join(" ")}`).join(" "), t.labels.join(" "), db.checklistItems.filter((c) => c.taskId === t.id).map((c) => c.text).join(" ")].join(" ");
    const track = db.tracks.find((x) => x.id === t.trackId);
    const where = track ? `${track.emoji} ${track.discordChannel}` : t.trackId;
    const extra = t.archived ? ` · archived${t.externalTeam ? ` (${t.externalTeam})` : ""}` : t.backlog === "advanced" ? " · advanced backlog" : "";
    const legacy = t.legacyKeys.length ? ` · formerly ${t.legacyKeys.join(", ")}` : "";
    push({ kind: "task", id: t.id, title: `${t.key} ${t.title}`, subtitle: `${where} · ${t.status.replace("_", " ")}${extra}${legacy}`, href: `/tasks/${t.key}` }, `${t.key} ${t.legacyKeys.join(" ")} ${t.title}`, body);
  }
  for (const m of db.members.filter((m) => m.active)) {
    push({ kind: "member", id: m.id, title: m.name, subtitle: `${m.role.replace("_", " ")}${m.isDemo ? " · demo" : ""}`, href: `/team/${m.id}` }, m.name, `${m.skills.join(" ")} ${m.githubUsername ?? ""} ${m.bio}`);
  }
  for (const tr of db.tracks) push({ kind: "track", id: tr.id, title: `${tr.emoji} ${tr.name}`, subtitle: `Discord: ${tr.emoji} ${tr.discordChannel}`, href: `/tracks/${tr.id}` }, `${tr.id} ${tr.name} ${tr.discordChannel}`, tr.mission);
  for (const d of db.documents) push({ kind: "doc", id: d.id, title: d.title, subtitle: `Knowledge base · ${d.category}`, href: `/docs/${d.slug}` }, d.title, `${d.tags.join(" ")} ${d.body} ${d.adr ? `${d.adr.context} ${d.adr.decision}` : ""}`);
  for (const r of db.resources) push({ kind: "resource", id: r.id, title: r.title, subtitle: `${r.publisher} · ${r.type}`, href: `/resources?focus=${r.id}` }, r.title, `${r.why} ${r.topics.join(" ")} ${r.url}`);
  for (const e of db.experiments) push({ kind: "experiment", id: e.id, title: e.name, subtitle: `Experiment · ${e.trackId}${e.isDemo ? " · demo" : ""}`, href: `/experiments/${e.id}` }, e.name, `${e.hypothesis} ${e.results} ${e.conclusions}`);
  for (const r of db.repositories) push({ kind: "repository", id: r.id, title: `${r.owner}/${r.name}`, subtitle: r.team, href: r.url }, `${r.owner}/${r.name} ${r.team}`, r.description);
  for (const p of db.learningPaths) push({ kind: "path", id: p.id, title: p.title, subtitle: "Learning path", href: `/learn/${p.slug}` }, p.title, `${p.summary} ${p.objectives.join(" ")}`);

  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}

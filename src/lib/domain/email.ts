import { STATUS_LABEL, type Database, type TaskStatus } from "./types";

export interface DigestItem {
  key: string;
  title: string;
  category: string;
  role: "owner" | "contributor";
  status: TaskStatus;
  dueDate: string | null;
  nextStep: string | null;
}

export interface AssignmentDigest {
  memberId: string;
  name: string;
  email: string;
  items: DigestItem[];
}

/** The open (not completed, not archived) tasks a member is on, owners first. */
export function assignmentDigest(db: Database, memberId: string): AssignmentDigest | null {
  const m = db.members.find((x) => x.id === memberId);
  if (!m) return null;
  const items: DigestItem[] = [];
  for (const a of db.assignments.filter((x) => x.memberId === memberId)) {
    const t = db.tasks.find((x) => x.id === a.taskId);
    if (!t || t.archived || t.status === "completed") continue;
    const next = db.checklistItems
      .filter((c) => c.taskId === t.id && !c.done)
      .sort((x, y) => Number(x.parentId !== null) - Number(y.parentId !== null) || x.order - y.order)[0];
    items.push({
      key: t.key,
      title: t.title,
      category: db.tracks.find((tr) => tr.id === t.trackId)?.name ?? t.trackId,
      role: a.role,
      status: t.status,
      dueDate: t.dueDate,
      nextStep: next?.text ?? null,
    });
  }
  items.sort((x, y) => Number(x.role !== "owner") - Number(y.role !== "owner") || x.key.localeCompare(y.key, undefined, { numeric: true }));
  return { memberId: m.id, name: m.name, email: m.email, items };
}

const ROLE_TEXT = { owner: "Owner (you're responsible for finishing it)", contributor: "Contributor (you're helping)" } as const;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

/** Builds the email for one member. `baseUrl` has no trailing slash. */
export function renderAssignmentEmail(d: AssignmentDigest, opts: { baseUrl: string; team: string; note?: string }) {
  const first = d.name.split(/\s+/)[0] || d.name;
  const n = d.items.length;
  const subject = `Your autonomy tasks (${n})`;
  const link = (key: string) => `${opts.baseUrl}/tasks/${key}`;
  const note = opts.note?.trim();

  const text = [
    `Hi ${first},`,
    "",
    n ? `Here ${n === 1 ? "is the task" : `are the ${n} tasks`} you're on for ${opts.team}:` : `You don't have any open tasks on ${opts.team} right now.`,
    ...(note ? ["", note] : []),
    "",
    ...d.items.flatMap((it, i) => [
      `${i + 1}. ${it.key}: ${it.title}`,
      `   Category: ${it.category}`,
      `   Your role: ${ROLE_TEXT[it.role]}`,
      `   Status: ${STATUS_LABEL[it.status]}${it.dueDate ? ` · Due ${fmtDate(it.dueDate)}` : ""}`,
      ...(it.nextStep ? [`   Next step: ${it.nextStep}`] : []),
      `   Open it: ${link(it.key)}`,
      "",
    ]),
    "Each task page has a guided walkthrough: press \"Start walkthrough\" at the top.",
    `New to the board? Start here: ${opts.baseUrl}/start`,
    `Not sure what a word or code means? ${opts.baseUrl}/glossary`,
  ].join("\n");

  const row = (it: DigestItem) => `
    <tr><td style="padding:14px 16px;border:1px solid #e5e7eb;border-radius:10px;background:#fafafa">
      <div style="font:600 13px ui-monospace,Menlo,monospace;color:#6b7280">${esc(it.key)} · ${esc(it.category)}</div>
      <div style="font:600 17px system-ui,sans-serif;color:#111827;margin:4px 0 8px">${esc(it.title)}</div>
      <div style="font:14px/1.6 system-ui,sans-serif;color:#374151">
        <b>Your role:</b> ${esc(ROLE_TEXT[it.role])}<br>
        <b>Status:</b> ${esc(STATUS_LABEL[it.status])}${it.dueDate ? ` · <b>Due</b> ${esc(fmtDate(it.dueDate))}` : ""}<br>
        ${it.nextStep ? `<b>Next step:</b> ${esc(it.nextStep)}<br>` : ""}
      </div>
      <a href="${esc(link(it.key))}" style="display:inline-block;margin-top:10px;padding:8px 14px;border-radius:8px;background:#dc2626;color:#fff;font:600 14px system-ui,sans-serif;text-decoration:none">Open ${esc(it.key)}</a>
    </td></tr><tr><td style="height:10px"></td></tr>`;

  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#f3f4f6">
  <table role="presentation" width="100%" style="max-width:600px;margin:0 auto;background:#fff;border-radius:14px;padding:24px;border-collapse:separate">
    <tr><td style="font:600 20px system-ui,sans-serif;color:#111827;padding-bottom:6px">Hi ${esc(first)},</td></tr>
    <tr><td style="font:15px/1.6 system-ui,sans-serif;color:#374151;padding-bottom:16px">${
      n ? `Here ${n === 1 ? "is the task" : `are the ${n} tasks`} you're on for ${esc(opts.team)}:` : `You don't have any open tasks on ${esc(opts.team)} right now.`
    }${note ? `<p style="margin:12px 0 0;padding:12px 14px;border-left:3px solid #dc2626;background:#fef2f2;white-space:pre-wrap">${esc(note)}</p>` : ""}</td></tr>
    ${d.items.map(row).join("")}
    <tr><td style="font:14px/1.6 system-ui,sans-serif;color:#6b7280;padding-top:8px">
      Each task page has a guided walkthrough: press <b>Start walkthrough</b> at the top.<br>
      New to the board? <a href="${esc(opts.baseUrl)}/start">Start here</a> · Unsure what a code means? <a href="${esc(opts.baseUrl)}/glossary">Glossary</a>
    </td></tr>
  </table></body></html>`;

  return { subject, text, html };
}

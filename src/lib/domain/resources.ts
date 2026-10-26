import { z } from "zod";
import { DIFFICULTIES, RESOURCE_TYPES, TRACK_IDS, type Resource } from "./types";

const YOUTUBE_HOSTS = ["youtube.com", "www.youtube.com", "youtu.be", "m.youtube.com"];

export function isYouTube(url: string) {
  try {
    return YOUTUBE_HOSTS.includes(new URL(url).hostname);
  } catch {
    return false;
  }
}

/** Extracts an 11-char video id; null for channels, playlists or malformed URLs. */
export function youTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return /^[\w-]{11}$/.test(u.pathname.slice(1)) ? u.pathname.slice(1) : null;
    if (!YOUTUBE_HOSTS.includes(u.hostname)) return null;
    const v = u.searchParams.get("v");
    if (u.pathname === "/watch" && v && /^[\w-]{11}$/.test(v)) return v;
    const m = u.pathname.match(/^\/(embed|shorts|live)\/([\w-]{11})$/);
    return m ? m[2] : null;
  } catch {
    return null;
  }
}

export const resourceInput = z
  .object({
    title: z.string().trim().min(3).max(200),
    url: z.string().trim().url().refine((u) => /^https?:\/\//.test(u), "URL must be http(s)"),
    publisher: z.string().trim().min(1).max(120),
    type: z.enum(RESOURCE_TYPES),
    difficulty: z.enum(DIFFICULTIES).nullable().default(null),
    duration: z.string().trim().max(40).nullable().default(null),
    why: z.string().trim().min(10, "Explain why this resource matters").max(1000),
    topics: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
    trackIds: z.array(z.enum(TRACK_IDS as [string, ...string[]])).default([]),
  })
  .superRefine((r, ctx) => {
    if (r.type === "video") {
      if (!isYouTube(r.url) && !/vimeo\.com|ocw\.mit\.edu|coursera|edx/.test(r.url)) {
        ctx.addIssue({ code: "custom", path: ["url"], message: "Video resources must link to a recognised video host." });
      } else if (isYouTube(r.url) && !youTubeId(r.url) && !/\/(@|c\/|channel\/|playlist)/.test(new URL(r.url).pathname + new URL(r.url).search)) {
        ctx.addIssue({ code: "custom", path: ["url"], message: "YouTube URL is not a valid video, playlist or channel link." });
      }
    }
  });

export type ResourceInput = z.infer<typeof resourceInput>;

export function normalizeUrl(url: string) {
  try {
    const u = new URL(url);
    u.hash = "";
    return u.toString().replace(/\/$/, "").toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

export function findDuplicate(resources: Pick<Resource, "id" | "url" | "title">[], url: string) {
  const n = normalizeUrl(url);
  return resources.find((r) => normalizeUrl(r.url) === n) ?? null;
}

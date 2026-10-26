import { createHash } from "node:crypto";

/** Deterministic UUID (v5-shaped) from a stable name, so seed data is reproducible. */
export function seedId(name: string): string {
  const h = createHash("sha1").update(`lunabotics:${name}`).digest("hex");
  const variant = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

/** Date the seeded URLs and source symbols were checked. */
export const VERIFIED_ON = "2026-10-25";
export const SEED_TIME = "2026-10-25T12:00:00.000Z";

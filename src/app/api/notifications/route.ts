import { NextResponse } from "next/server";
import { getActor } from "@/lib/server/auth";
import { getStore } from "@/lib/server/store";

export async function GET() {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = await getStore().snapshot();
  const mine = db.notifications.filter((n) => n.memberId === actor.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 30);
  return NextResponse.json(mine, { headers: { "Cache-Control": "no-store" } });
}

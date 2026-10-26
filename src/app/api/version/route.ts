import { NextResponse } from "next/server";
import { getActor } from "@/lib/server/auth";
import { getStore } from "@/lib/server/store";

export async function GET() {
  if (!(await getActor())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ version: await getStore().version() }, { headers: { "Cache-Control": "no-store" } });
}

import { NextResponse, type NextRequest } from "next/server";
import { search } from "@/lib/domain/search";
import { getActor } from "@/lib/server/auth";
import { getStore } from "@/lib/server/store";

export async function GET(req: NextRequest) {
  if (!(await getActor())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const q = (req.nextUrl.searchParams.get("q") ?? "").slice(0, 200);
  return NextResponse.json(search(await getStore().snapshot(), q));
}

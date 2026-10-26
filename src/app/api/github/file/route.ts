import { NextResponse, type NextRequest } from "next/server";
import { getActor } from "@/lib/server/auth";
import { fetchSourceFile } from "@/lib/server/github";

/** Server-side source preview so tokens never reach the browser. */
export async function GET(req: NextRequest) {
  if (!(await getActor())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });
  try {
    return NextResponse.json(await fetchSourceFile(url));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}

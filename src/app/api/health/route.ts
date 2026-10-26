import { NextResponse } from "next/server";
import { getStore } from "@/lib/server/store";

export async function GET() {
  let store;
  try {
    store = getStore();
  } catch (e) {
    return NextResponse.json({ ok: false, store: null, error: (e as Error).message }, { status: 503 });
  }
  try {
    await store.version();
    return NextResponse.json({ ok: true, store: store.kind });
  } catch (e) {
    return NextResponse.json({ ok: false, store: store.kind, error: (e as Error).message }, { status: 503 });
  }
}

import { NextResponse, type NextRequest } from "next/server";
import { authMode } from "@/lib/server/auth";
import { supabaseServerClient } from "@/lib/server/supabase-auth";

/** Supabase OAuth / email-confirmation callback: exchanges the code for a session. */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (authMode() === "supabase" && code) {
    const sb = await supabaseServerClient();
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, req.url));
  }
  return NextResponse.redirect(new URL("/", req.url));
}

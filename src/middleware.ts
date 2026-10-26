import { NextResponse, type NextRequest } from "next/server";

const supabaseEnvComplete = () => !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY);

/**
 * The workspace is publicly readable, so there is no sign-in gate. Writes are
 * authorized per command on the server. On Vercel the app cannot run without
 * Supabase; explain that instead of failing with a 500.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (process.env.VERCEL === "1" && !supabaseEnvComplete() && !pathname.startsWith("/api/health") && !pathname.startsWith("/setup")) {
    return NextResponse.rewrite(new URL("/setup", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico)$).*)"],
};

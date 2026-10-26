import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC = ["/login", "/auth/callback", "/api/health", "/setup"];

const supabaseEnvComplete = () => !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY);

/**
 * Cheap gate only: redirects visitors without any session cookie to /login and
 * refreshes Supabase sessions. Real verification happens server-side in getActor().
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // On Vercel the app cannot run without Supabase; explain that instead of failing with a 500.
  if (process.env.VERCEL === "1" && !supabaseEnvComplete() && !pathname.startsWith("/api/health") && !pathname.startsWith("/setup")) {
    return NextResponse.rewrite(new URL("/setup", req.url));
  }
  if (PUBLIC.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && anon && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    let res = NextResponse.next({ request: req });
    const sb = createServerClient(url, anon, {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (list) => {
          for (const { name, value } of list) req.cookies.set(name, value);
          res = NextResponse.next({ request: req });
          for (const { name, value, options } of list) res.cookies.set(name, value, options);
        },
      },
    });
    const { data } = await sb.auth.getUser();
    if (!data.user) return NextResponse.redirect(new URL("/login", req.url));
    return res;
  }

  if (!req.cookies.get("lacc_session")) return NextResponse.redirect(new URL("/login", req.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico)$).*)"],
};

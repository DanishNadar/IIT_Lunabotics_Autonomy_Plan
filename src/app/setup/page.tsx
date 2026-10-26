import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Setup required" };
export const dynamic = "force-dynamic";

const REQUIRED = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"] as const;

/** Shown on Vercel when Supabase is not configured. Lists variable names only, never values. */
export default function SetupPage() {
  const missing = REQUIRED.filter((name) => !process.env[name]);
  if (missing.length === 0 || process.env.VERCEL !== "1") redirect("/");
  return (
    <main className="mx-auto max-w-xl px-4 py-16 text-fg">
      <h1 className="text-xl font-semibold">Deployment needs a database</h1>
      <p className="mt-3 text-[15px] text-fg-2">
        This Vercel deployment has no Supabase configuration. Vercel&apos;s filesystem is read-only and not shared between instances, so the app will not store team data there.
      </p>
      <h2 className="mt-6 text-[15px] font-semibold">Missing environment variables</h2>
      <ul className="mt-2 space-y-1 font-mono text-[15px]">
        {missing.map((name) => <li key={name}>{name}</li>)}
      </ul>
      <ol className="mt-6 list-decimal space-y-2 pl-5 text-[15px] text-fg-2">
        <li>Create a Supabase project. Apply <code>supabase/migrations/*</code>, then load <code>supabase/seed.sql</code>.</li>
        <li>In Vercel → Project → Settings → Environment Variables, add the variables above, <code>ADMIN_PASSWORD</code> and <code>SESSION_SECRET</code>.</li>
        <li>Redeploy. Vercel builds <code>NEXT_PUBLIC_</code> values into the app, so they take effect only after a new build.</li>
      </ol>
      <p className="mt-6 text-[15px] text-fg-2">See the README section “Deployment (Vercel)” for details.</p>
    </main>
  );
}

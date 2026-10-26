import "server-only";

/** Server environment, read once. Nothing here is exposed to the browser. */
export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  githubToken: process.env.GITHUB_TOKEN ?? "",
  githubOAuthEnabled: process.env.NEXT_PUBLIC_GITHUB_OAUTH_ENABLED === "true",
  sessionSecret: process.env.SESSION_SECRET ?? "",
  dataFile: process.env.DATA_FILE ?? ".data/db.json",
  /** Demo accounts are on by default only when not backed by Supabase. */
  demoAccounts: process.env.DEMO_ACCOUNTS ? process.env.DEMO_ACCOUNTS === "true" : !process.env.SUPABASE_SERVICE_ROLE_KEY,
  adminEmails: (process.env.ADMIN_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean),
  discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  /** Canonical public URL, e.g. https://lunabotics.example.org. Used for auth redirects and invite links. */
  siteUrl: (process.env.SITE_URL ?? "").replace(/\/+$/, ""),
  /** Set automatically by Vercel. */
  vercel: process.env.VERCEL === "1",
  vercelEnv: process.env.VERCEL_ENV ?? "",
  vercelUrl: process.env.VERCEL_URL ?? "",
  vercelProductionUrl: process.env.VERCEL_PROJECT_PRODUCTION_URL ?? "",
};

export const supabaseConfigured = () => !!(env.supabaseUrl && env.supabaseAnonKey && env.supabaseServiceRoleKey);

/**
 * Public origin for links that leave the app (auth emails, OAuth, invites).
 * SITE_URL wins; Vercel production uses its production domain so links from any
 * instance point at the real site; otherwise the request origin, then the deployment URL.
 */
export function appOrigin(requestOrigin: string | null): string {
  if (env.siteUrl) return env.siteUrl;
  if (env.vercelEnv === "production" && env.vercelProductionUrl) return `https://${env.vercelProductionUrl}`;
  if (requestOrigin) return requestOrigin;
  if (env.vercelUrl) return `https://${env.vercelUrl}`;
  return "";
}

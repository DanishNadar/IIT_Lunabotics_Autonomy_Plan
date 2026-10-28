import "server-only";

/** Server environment, read once. Nothing here is exposed to the browser. */
export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  githubToken: process.env.GITHUB_TOKEN ?? "",
  sessionSecret: process.env.SESSION_SECRET ?? "",
  dataFile: process.env.DATA_FILE ?? ".data/db.json",
  /** Demo accounts are on by default only when not backed by Supabase. */
  demoAccounts: process.env.DEMO_ACCOUNTS ? process.env.DEMO_ACCOUNTS === "true" : !process.env.SUPABASE_SERVICE_ROLE_KEY,
  /** Unlocks the Administrator identity (the only way to change data outside local demo mode). */
  adminPassword: process.env.ADMIN_PASSWORD ?? "",
  discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL ?? "",
  /** Optional: send assignment emails through Resend (https://resend.com). Both are required. */
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  /** Verified sender, e.g. "Lunabotics Autonomy <autonomy@yourdomain.org>". */
  emailFrom: process.env.EMAIL_FROM ?? "",
  isProduction: process.env.NODE_ENV === "production",
  /** Set automatically by Vercel. */
  vercel: process.env.VERCEL === "1",
};

export const supabaseConfigured = () => !!(env.supabaseUrl && env.supabaseAnonKey && env.supabaseServiceRoleKey);


export const emailConfigured = () => !!(env.resendApiKey && env.emailFrom);

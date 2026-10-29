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
  /** Optional: send assignment emails from a Gmail account using a Google app password. */
  gmailUser: process.env.GMAIL_USER ?? "",
  gmailAppPassword: (process.env.GMAIL_APP_PASSWORD ?? "").replace(/\s+/g, ""),
  /** Optional alternative: send through Resend (https://resend.com). Needs EMAIL_FROM too. */
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  /** Sender, e.g. "Lunabotics Autonomy <autonomy@yourdomain.org>". With Gmail it defaults to GMAIL_USER. */
  emailFrom: process.env.EMAIL_FROM ?? "",
  isProduction: process.env.NODE_ENV === "production",
  /** Set automatically by Vercel. */
  vercel: process.env.VERCEL === "1",
};

export const supabaseConfigured = () => !!(env.supabaseUrl && env.supabaseAnonKey && env.supabaseServiceRoleKey);


export const gmailConfigured = () => !!(env.gmailUser && env.gmailAppPassword);

export const emailConfigured = () => gmailConfigured() || !!(env.resendApiKey && env.emailFrom);

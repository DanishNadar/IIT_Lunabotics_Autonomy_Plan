import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { env, gmailConfigured } from "./env";

type Msg = { to: string; subject: string; text: string; html: string };
type Result = { ok: true } | { ok: false; error: string };

/** Sends one email through Gmail (preferred when set) or Resend. Only called after an admin explicitly presses Send. */
export async function sendEmail(msg: Msg): Promise<Result> {
  if (gmailConfigured()) return sendViaGmail(msg);
  if (env.resendApiKey && env.emailFrom) return sendViaResend(msg);
  return { ok: false, error: "Email sending is not configured." };
}

let gmail: Transporter | null = null;
const gmailTransport = () => (gmail ??= nodemailer.createTransport({ service: "gmail", auth: { user: env.gmailUser, pass: env.gmailAppPassword } }));

const gmailError = (e: unknown) => {
  if ((e as { code?: string }).code === "EAUTH") return "Gmail rejected the login. GMAIL_USER must be the exact Gmail address the app password was created on, and GMAIL_APP_PASSWORD must be that 16-letter app password (not your normal password).";
  const detail = e instanceof Error ? e.message.split("\n")[0].slice(0, 160) : "";
  return `Could not send through Gmail${detail ? `: ${detail}` : "."}`;
};

/** Logs in to the email provider without sending anything, to check the settings. */
export async function checkEmailLogin(): Promise<(Result & { provider: "gmail" | "resend" | null; from: string })> {
  if (gmailConfigured()) {
    try {
      await gmailTransport().verify();
      return { ok: true, provider: "gmail", from: env.emailFrom || env.gmailUser };
    } catch (e) {
      console.warn("gmail login check failed", e);
      return { ok: false, provider: "gmail", from: env.gmailUser, error: gmailError(e) };
    }
  }
  if (env.resendApiKey && env.emailFrom) return { ok: true, provider: "resend", from: env.emailFrom };
  return { ok: false, provider: null, from: "", error: "Email sending is not configured." };
}

async function sendViaGmail(msg: Msg): Promise<Result> {
  try {
    await gmailTransport().sendMail({ from: env.emailFrom || env.gmailUser, to: msg.to, subject: msg.subject, text: msg.text, html: msg.html });
    return { ok: true };
  } catch (e) {
    console.warn("gmail send failed", e);
    return { ok: false, error: gmailError(e) };
  }
}

async function sendViaResend(msg: Msg): Promise<Result> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.emailFrom, to: [msg.to], subject: msg.subject, text: msg.text, html: msg.html }),
    });
    if (res.ok) return { ok: true };
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    return { ok: false, error: body?.message ?? `Email provider returned ${res.status}` };
  } catch (e) {
    console.warn("email send failed", e);
    return { ok: false, error: "Could not reach the email provider." };
  }
}

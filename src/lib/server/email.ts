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

async function sendViaGmail(msg: Msg): Promise<Result> {
  gmail ??= nodemailer.createTransport({ service: "gmail", auth: { user: env.gmailUser, pass: env.gmailAppPassword } });
  try {
    await gmail.sendMail({ from: env.emailFrom || env.gmailUser, to: msg.to, subject: msg.subject, text: msg.text, html: msg.html });
    return { ok: true };
  } catch (e) {
    console.warn("gmail send failed", e);
    const code = (e as { code?: string; responseCode?: number }).code;
    if (code === "EAUTH") return { ok: false, error: "Gmail rejected the login. Check GMAIL_USER and GMAIL_APP_PASSWORD (an app password, not your normal password)." };
    return { ok: false, error: "Could not send through Gmail." };
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

import "server-only";
import { env } from "./env";

/** Sends one email through Resend. Only called after an admin explicitly presses Send. */
export async function sendEmail(msg: { to: string; subject: string; text: string; html: string }): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!env.resendApiKey || !env.emailFrom) return { ok: false, error: "Email sending is not configured." };
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

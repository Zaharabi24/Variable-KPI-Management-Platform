import { db } from "./db";

/**
 * Transactional email service (Section 17.3).
 * The prototype delivers to an in-app Outbox (Mailbox → Email Outbox; /dev/outbox while signed out) instead of SMTP so the
 * sign-up → secure link → set password flow is fully workable offline.
 * Swap `deliver` for an SMTP/API provider in production; the log is kept for retries.
 */
export async function sendEmail(opts: { to: string; subject: string; body: string; link?: string }) {
  const record = await db.emailLog.create({
    data: { toEmail: opts.to, subject: opts.subject, body: opts.body, link: opts.link ?? null },
  });
  if (process.env.NODE_ENV === "development") {
    console.log(`\n[Outbox] To: ${opts.to}\n[Outbox] ${opts.subject}\n[Outbox] ${opts.link ?? ""}\n`);
  }
  return record;
}

export function appUrl(path: string) {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  return `${base}${path}`;
}

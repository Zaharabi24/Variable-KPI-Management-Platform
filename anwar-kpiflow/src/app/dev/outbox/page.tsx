import type { Metadata } from "next";
import Link from "next/link";
import { Mail, ExternalLink, ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { fmtDateTime } from "@/lib/utils";
import { Logo } from "@/components/shell/logo";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Email Outbox" };
export const dynamic = "force-dynamic";

/** Prototype mail delivery (Section 17.3): shows every transactional email the system sent. */
export default async function OutboxPage() {
  const [emails, user] = await Promise.all([
    db.emailLog.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    getCurrentUser(),
  ]);
  return (
    <div className="min-h-screen bg-surface">
      <header className="h-16 bg-white border-b border-ink-100 flex items-center px-6 gap-4">
        <Link href={user ? "/" : "/login"} className="text-ink-500 hover:text-ink-900 flex items-center gap-1.5 text-[13px]">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="ml-auto"><Logo /></div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="h-9 w-9 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center"><Mail className="h-5 w-5" /></div>
          <h1 className="text-[22px] font-semibold tracking-tight">Email Outbox</h1>
        </div>
        <p className="text-[13.5px] text-ink-500 mb-6">
          The prototype delivers setup and invitation emails here instead of a mail server. Open a link to continue the flow exactly as the recipient would.
        </p>
        {emails.length === 0 ? (
          <div className="card p-10 text-center text-ink-500 text-[14px]">No emails sent yet. Register an account or invite a Department Head to see one here.</div>
        ) : (
          <ul className="space-y-3">
            {emails.map((m) => (
              <li key={m.id} className="card p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="text-[14px] font-semibold text-ink-900">{m.subject}</div>
                  <div className="text-[12px] text-ink-400 tnum">{fmtDateTime(m.createdAt)}</div>
                </div>
                <div className="text-[12.5px] text-ink-500 mt-0.5">To: <span className="font-mono">{m.toEmail}</span></div>
                <pre className="mt-3 whitespace-pre-wrap break-all font-sans text-[13px] text-ink-700 leading-6 bg-surface rounded-lg p-3 border border-ink-100">{m.body}</pre>
                {m.link && (
                  <Link href={m.link.replace(/^https?:\/\/[^/]+/, "")} className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-brand-700 hover:underline">
                    Open secure link <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

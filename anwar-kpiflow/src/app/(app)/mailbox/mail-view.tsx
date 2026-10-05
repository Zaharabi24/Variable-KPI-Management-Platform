import * as React from "react";
import { Download, Paperclip } from "lucide-react";
import { fmtBytes } from "@/lib/utils";

/** Message body. The HTML is always the output of sanitizeMailHtml (lib/mailbox.ts): attribute-free formatting tags and checked links only. */
export function MailBody({ html }: { html: string }) {
  return <div className="mail-body text-[14px] leading-6 text-ink-900 break-words" dangerouslySetInnerHTML={{ __html: html }} />;
}

/** The Anwar KPIFlow email template: what a recipient sees, in the preview and when the message is opened. */
export function MailTemplate({
  subject, greetingName, senderName, attachments, children,
}: {
  subject: string;
  greetingName: string;
  senderName: string;
  attachments?: { name: string; size: number; href?: string }[];
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-ink-900/[0.07] bg-white overflow-hidden shadow-card">
      <header className="bg-gradient-to-r from-brand-500 via-brand-600 to-brand-800 px-6 py-4 text-white">
        <div className="text-[15px] font-semibold tracking-tight">Anwar KPIFlow</div>
        <div className="text-[11.5px] text-white/90">Anwar Group of Industries</div>
      </header>
      <div className="px-6 py-5">
        <h3 className="text-[17px] font-semibold text-ink-900 leading-6 break-words">{subject}</h3>
        <p className="mt-4 text-[14px] text-ink-900">Dear {greetingName},</p>
        <div className="mt-3">{children}</div>
        {attachments && attachments.length > 0 && (
          <ul className="mt-5 flex flex-wrap gap-2" aria-label="Attachments">
            {attachments.map((a) => {
              const inner = (
                <>
                  <Paperclip className="h-3.5 w-3.5 text-ink-400 shrink-0" />
                  <span className="max-w-[220px] truncate">{a.name}</span>
                  <span className="text-ink-400 tnum">{fmtBytes(a.size)}</span>
                  {a.href && <Download className="h-3.5 w-3.5 text-brand-700 shrink-0" />}
                </>
              );
              const cls = "inline-flex items-center gap-2 rounded-lg border border-ink-200 bg-surface px-2.5 h-8 text-[12.5px] text-ink-700";
              return (
                <li key={`${a.name}-${a.size}`}>
                  {a.href ? <a href={a.href} className={`${cls} hover:border-ink-300 hover:bg-white`}>{inner}</a> : <span className={cls}>{inner}</span>}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <footer className="border-t border-ink-100 bg-surface px-6 py-3 text-[12px] text-ink-500">Sent by {senderName} through the Anwar KPIFlow Mailbox.</footer>
    </article>
  );
}

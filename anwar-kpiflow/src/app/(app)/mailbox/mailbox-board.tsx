"use client";

import * as React from "react";
import { useActionState } from "react";
import Link from "next/link";
import { ExternalLink, FileText, Inbox, Mail, Paperclip, PenLine, Send, Trash2 } from "lucide-react";
import { PageHeader, Card, CardHeader, EmptyState } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Drawer, Dialog } from "@/components/ui/modal";
import { Pill } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { deleteDraftAction, markMailReadAction } from "@/actions/mailbox";
import { ROLE_LABELS, type Role } from "@/lib/constants";
import { cn, fmtDateTime } from "@/lib/utils";
import { MAIL_AUDIENCE, MAIL_TAB_LABELS, type DraftRow, type InboxRow, type MailPerson, type MailTab, type OutboxRow, type SentRow } from "@/lib/mailbox";
import { Compose } from "./compose";
import { MailBody, MailTemplate } from "./mail-view";

const attachmentLinks = (list: { id: string; fileName: string; size: number }[]) => list.map((a) => ({ name: a.fileName, size: a.size, href: `/api/mailbox/attachment/${a.id}` }));

export function MailboxBoard({
  tab, tabs, subtitle, viewerName, unread, draftCount, inbox, sent, drafts, outbox, directory, draft, everyoneLabel,
}: {
  tab: MailTab;
  tabs: MailTab[];
  subtitle: string;
  viewerName: string;
  unread: number;
  draftCount: number;
  inbox: InboxRow[];
  sent: SentRow[];
  drafts: DraftRow[];
  outbox: OutboxRow[];
  directory: MailPerson[];
  draft: DraftRow | null;
  everyoneLabel: string;
}) {
  const counts: Partial<Record<MailTab, number>> = { inbox: unread, drafts: draftCount };
  return (
    <>
      <PageHeader title="Mailbox" subtitle={subtitle} />
      {tabs.length > 1 && (
        <div className="mb-6 inline-flex flex-wrap rounded-xl border border-ink-200 bg-white p-1 shadow-field" role="tablist" aria-label="Mailbox">
          {tabs.map((t) => (
            <Link
              key={t}
              href={`/mailbox?tab=${t}`}
              role="tab"
              aria-selected={tab === t}
              className={cn("inline-flex items-center gap-2 h-8 px-3.5 rounded-lg text-[13px] font-medium transition-colors", tab === t ? "bg-brand-700 text-white shadow-sm" : "text-ink-700 hover:bg-ink-100")}
            >
              {MAIL_TAB_LABELS[t]}
              {counts[t] ? <span className={cn("min-w-[18px] h-[18px] px-1 rounded-full text-[10.5px] font-bold flex items-center justify-center tnum", tab === t ? "bg-white/20 text-white" : "bg-brand-500 text-white")}>{counts[t]}</span> : null}
            </Link>
          ))}
        </div>
      )}

      {tab === "inbox" && <InboxTab rows={inbox} viewerName={viewerName} />}
      {tab === "compose" && <Compose key={draft ? `${draft.id}-${draft.updatedAt}` : "new"} directory={directory} draft={draft} senderName={viewerName} everyoneLabel={everyoneLabel} />}
      {tab === "sent" && <SentTab rows={sent} viewerName={viewerName} />}
      {tab === "drafts" && <DraftsTab rows={drafts} />}
      {tab === "outbox" && <OutboxTab rows={outbox} />}
    </>
  );
}

/* ---------- Shared list row ---------- */

function RowButton({ onClick, unread, title, meta, snippet, date, attachments, trailing }: {
  onClick: () => void; unread?: boolean; title: string; meta: string; snippet: string; date: string; attachments: number; trailing?: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} className="w-full text-left flex items-start gap-3 px-5 py-3.5 hover:bg-ink-100/40 transition-colors">
      <span className={cn("mt-2 h-2 w-2 rounded-full shrink-0", unread ? "bg-brand-500" : "bg-transparent")} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-3">
          <span className={cn("text-[13.5px] truncate", unread ? "font-semibold text-ink-900" : "font-medium text-ink-700")}>{meta}{unread && <span className="sr-only"> (unread)</span>}</span>
          <span className="text-[12px] text-ink-400 tnum shrink-0">{date}</span>
        </span>
        <span className={cn("block text-[14px] truncate", unread ? "font-semibold text-ink-900" : "text-ink-900")}>{title}</span>
        <span className="flex items-center gap-2 mt-0.5">
          <span className="text-[12.5px] text-ink-500 truncate">{snippet}</span>
          {attachments > 0 && <span className="inline-flex items-center gap-1 text-[12px] text-ink-400 shrink-0"><Paperclip className="h-3.5 w-3.5" />{attachments}</span>}
          {trailing && <span className="ml-auto shrink-0">{trailing}</span>}
        </span>
      </span>
    </button>
  );
}

/* ---------- Inbox ---------- */

function InboxTab({ rows, viewerName }: { rows: InboxRow[]; viewerName: string }) {
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [readNow, setReadNow] = React.useState<Set<string>>(new Set());
  const [, startTransition] = React.useTransition();
  const open = rows.find((r) => r.id === openId) ?? null;
  const isUnread = (r: InboxRow) => !r.readAt && !readNow.has(r.id);
  const unread = rows.filter(isUnread).length;

  const show = (r: InboxRow) => {
    setOpenId(r.id);
    if (isUnread(r)) {
      setReadNow((s) => new Set(s).add(r.id));
      startTransition(() => markMailReadAction(r.id));
    }
  };

  return (
    <Card>
      <CardHeader title="Inbox" subtitle={`${rows.length} message${rows.length === 1 ? "" : "s"} · ${unread} unread`} />
      {rows.length === 0 ? (
        <EmptyState icon={<Inbox className="h-5 w-5" />} title="Your inbox is empty" description="Messages sent to you through the Mailbox appear here." />
      ) : (
        <ul className="divide-y divide-ink-100 border-t border-ink-100">
          {rows.map((r) => (
            <li key={r.id}>
              <RowButton onClick={() => show(r)} unread={isUnread(r)} title={r.subject} meta={r.senderName} snippet={r.snippet} date={fmtDateTime(r.sentAt)} attachments={r.attachments.length} />
            </li>
          ))}
        </ul>
      )}
      {open && (
        <Drawer open onClose={() => setOpenId(null)} title={open.subject} subtitle={`From ${open.senderName} · ${ROLE_LABELS[open.senderRole as Role] ?? open.senderRole} · ${fmtDateTime(open.sentAt)}`}>
          <MailTemplate subject={open.subject} greetingName={viewerName} senderName={open.senderName} attachments={attachmentLinks(open.attachments)}>
            <MailBody html={open.bodyHtml} />
          </MailTemplate>
        </Drawer>
      )}
    </Card>
  );
}

/* ---------- Sent mail ---------- */

function SentTab({ rows, viewerName }: { rows: SentRow[]; viewerName: string }) {
  const [openId, setOpenId] = React.useState<string | null>(null);
  const open = rows.find((r) => r.id === openId) ?? null;
  const readOf = (r: SentRow) => r.recipients.filter((x) => x.readAt).length;
  const toLabel = (r: SentRow) => (r.audience === MAIL_AUDIENCE.ALL ? `All employees (${r.recipients.length})` : r.recipients.length === 1 ? r.recipients[0].name : `${r.recipients.length} recipients`);

  return (
    <Card>
      <CardHeader title="Sent mail" subtitle={`${rows.length} email${rows.length === 1 ? "" : "s"} sent by you, newest first`} action={<Link href="/mailbox?tab=compose" className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-ink-200 bg-white text-[13px] font-medium text-ink-700 shadow-field hover:bg-ink-100/50"><PenLine className="h-4 w-4" /> Compose</Link>} />
      {rows.length === 0 ? (
        <EmptyState icon={<Send className="h-5 w-5" />} title="Nothing sent yet" description="Emails you send from Compose are kept here, with who has read them." />
      ) : (
        <ul className="divide-y divide-ink-100 border-t border-ink-100">
          {rows.map((r) => (
            <li key={r.id}>
              <RowButton onClick={() => setOpenId(r.id)} title={r.subject} meta={`To: ${toLabel(r)}`} snippet={r.snippet} date={fmtDateTime(r.sentAt)} attachments={r.attachments.length} trailing={<Pill tone={readOf(r) === r.recipients.length ? "green" : "neutral"}>{readOf(r)} of {r.recipients.length} read</Pill>} />
            </li>
          ))}
        </ul>
      )}
      {open && (
        <Drawer open onClose={() => setOpenId(null)} title={open.subject} subtitle={`Sent ${fmtDateTime(open.sentAt)} · To: ${toLabel(open)}`}>
          <MailTemplate subject={open.subject} greetingName={open.recipients[0]?.name ?? "Employee Name"} senderName={viewerName} attachments={attachmentLinks(open.attachments)}>
            <MailBody html={open.bodyHtml} />
          </MailTemplate>
          <Card className="mt-5">
            <CardHeader title="Recipients" subtitle={`${readOf(open)} of ${open.recipients.length} have opened this email`} />
            <ul className="px-5 pb-4 divide-y divide-ink-100">
              {open.recipients.map((p) => (
                <li key={p.email} className="py-2.5 flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-medium text-ink-900 truncate">{p.name}</span>
                    <span className="block text-[12px] text-ink-500 truncate">{p.email}</span>
                  </span>
                  {p.readAt ? <Pill tone="green" className="shrink-0">Read {fmtDateTime(p.readAt)}</Pill> : <Pill className="shrink-0">Not opened yet</Pill>}
                </li>
              ))}
            </ul>
          </Card>
        </Drawer>
      )}
    </Card>
  );
}

/* ---------- Drafts ---------- */

function DraftsTab({ rows }: { rows: DraftRow[] }) {
  const toast = useToast();
  const [state, act, pending] = useActionState(deleteDraftAction, null);
  const [deleting, setDeleting] = React.useState<DraftRow | null>(null);
  React.useEffect(() => {
    if (!state) return;
    setDeleting(null);
    toast(state.ok ? "success" : "error", state.message ?? "Done.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Card>
      <CardHeader title="Drafts" subtitle={`${rows.length} unsent message${rows.length === 1 ? "" : "s"}. Only you can see your drafts.`} />
      {rows.length === 0 ? (
        <EmptyState icon={<FileText className="h-5 w-5" />} title="No drafts" description="Use Save as draft in Compose to keep a message and finish it later." />
      ) : (
        <ul className="divide-y divide-ink-100 border-t border-ink-100">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-5 py-3.5">
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="text-[14px] font-medium text-ink-900 truncate">{r.subject || "(No subject)"}</span>
                  <span className="text-[12px] text-ink-400 tnum shrink-0">Saved {fmtDateTime(r.updatedAt)}</span>
                </span>
                <span className="flex items-center gap-2 mt-0.5">
                  <span className="text-[12.5px] text-ink-500 truncate">{r.snippet || "No message yet"}</span>
                  {r.attachments.length > 0 && <span className="inline-flex items-center gap-1 text-[12px] text-ink-400 shrink-0"><Paperclip className="h-3.5 w-3.5" />{r.attachments.length}</span>}
                </span>
                <span className="block text-[12px] text-ink-400 mt-0.5">{r.audience === MAIL_AUDIENCE.ALL ? "To: All employees" : `To: ${r.recipientIds.length} selected`}</span>
              </span>
              <Link href={`/mailbox?tab=compose&draft=${r.id}`} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-ink-200 bg-white text-[13px] font-medium text-ink-700 shadow-field hover:bg-ink-100/50 shrink-0"><PenLine className="h-4 w-4" /> Continue</Link>
              <Button variant="ghost" size="sm" className="shrink-0 text-ink-500 hover:text-red-700" aria-label={`Delete draft ${r.subject || "(No subject)"}`} onClick={() => setDeleting(r)}><Trash2 className="h-4 w-4" /></Button>
            </li>
          ))}
        </ul>
      )}
      {deleting && (
        <Dialog open onClose={() => setDeleting(null)} title="Delete this draft?" description={`"${deleting.subject || "(No subject)"}" and its attachments are removed permanently. Nothing has been sent.`}>
          <form action={act} className="flex justify-end gap-2">
            <input type="hidden" name="draftId" value={deleting.id} />
            <Button type="button" variant="outline" onClick={() => setDeleting(null)} disabled={pending}>Cancel</Button>
            <Button type="submit" variant="danger" loading={pending}>Delete draft</Button>
          </form>
        </Dialog>
      )}
    </Card>
  );
}

/* ---------- Email Outbox ---------- */

function OutboxTab({ rows }: { rows: OutboxRow[] }) {
  const [q, setQ] = React.useState("");
  const needle = q.trim().toLowerCase();
  const shown = rows.filter((m) => !needle || m.toEmail.toLowerCase().includes(needle) || m.subject.toLowerCase().includes(needle));
  return (
    <Card>
      <CardHeader
        title="Email Outbox"
        subtitle="Every email the system delivered: account setup and invitation links, workflow notifications and Mailbox messages. The prototype delivers here instead of a mail server."
        action={<input type="search" aria-label="Search recipient or subject" placeholder="Search recipient or subject" className="input h-9 w-[240px]" value={q} onChange={(e) => setQ(e.target.value)} />}
      />
      {rows.length === 0 ? (
        <EmptyState icon={<Mail className="h-5 w-5" />} title="No emails sent yet" description="Register an account, invite a Department Head or send a Mailbox message to see one here." />
      ) : shown.length === 0 ? (
        <p className="px-5 pb-6 text-[13px] text-ink-500">No email matches this search.</p>
      ) : (
        <ul className="divide-y divide-ink-100 border-t border-ink-100">
          {shown.map((m) => (
            <li key={m.id} className="px-5 py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="text-[14px] font-semibold text-ink-900">{m.subject}</div>
                <div className="text-[12px] text-ink-400 tnum">{fmtDateTime(m.createdAt)}</div>
              </div>
              <div className="text-[12.5px] text-ink-500 mt-0.5">To: <span className="font-mono">{m.toEmail}</span></div>
              <pre className="mt-3 whitespace-pre-wrap break-words font-sans text-[13px] text-ink-700 leading-6 bg-surface rounded-xl p-3.5 border border-ink-100 max-h-[220px] overflow-y-auto scroll-thin">{m.body}</pre>
              {m.link && (
                <Link href={m.link.replace(/^https?:\/\/[^/]+/, "")} className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-brand-700 hover:underline">
                  Open secure link <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

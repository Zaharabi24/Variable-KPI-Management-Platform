import { EVIDENCE_ALLOWED_TYPES } from "./constants";

/**
 * Mailbox — shared rules and types (safe to import from client components).
 *
 * Who can do what:
 * - Everyone with an account has an Inbox.
 * - The Super Admin writes to anyone on the platform; a Department Head writes to the employees of their own department.
 * - The Email Outbox (every email the system delivered, including setup and invitation links) is the Super Admin's.
 *
 * The prototype has no mail server: a sent message lands in each recipient's Inbox and a notification
 * is logged to the Email Outbox (lib/email.ts), the same delivery path every other workflow uses.
 */

type RoleUser = { role: string; departmentId?: string | null };

export function canCompose(u: RoleUser): boolean {
  return u.role === "SUPER_ADMIN" || (u.role === "DEPARTMENT_HEAD" && !!u.departmentId);
}
export function canSeeOutbox(u: RoleUser): boolean {
  return u.role === "SUPER_ADMIN";
}

export type MailTab = "inbox" | "compose" | "sent" | "drafts" | "outbox";
export const MAIL_TAB_LABELS: Record<MailTab, string> = { inbox: "Inbox", compose: "Compose", sent: "Sent mail", drafts: "Drafts", outbox: "Email Outbox" };

/** Tabs a user may open, in display order. */
export function mailTabs(u: RoleUser): MailTab[] {
  const tabs: MailTab[] = ["inbox"];
  if (canCompose(u)) tabs.push("compose", "sent", "drafts");
  if (canSeeOutbox(u)) tabs.push("outbox");
  return tabs;
}

export const MAIL_STATUS = { DRAFT: "DRAFT", SENT: "SENT" } as const;
export const MAIL_AUDIENCE = { SELECTED: "SELECTED", ALL: "ALL" } as const;
export type MailAudience = (typeof MAIL_AUDIENCE)[keyof typeof MAIL_AUDIENCE];

export const MAIL_SUBJECT_MAX = 200;
export const MAIL_BODY_MAX = 20000;
export const MAIL_MAX_FILES = 5;
/** All attachments together. The whole request must stay under the 4 MB server-action limit (Vercel allows 4.5 MB). */
export const MAIL_MAX_TOTAL_BYTES = 3 * 1024 * 1024;
export const MAIL_ALLOWED_TYPES = EVIDENCE_ALLOWED_TYPES;

export type MailPerson = { id: string; name: string; empCode: string; email: string; department: string | null; designation: string | null };
export type MailAttachmentRow = { id: string; fileName: string; size: number };

export type InboxRow = {
  id: string; // MailRecipient id
  messageId: string;
  subject: string;
  bodyHtml: string;
  snippet: string;
  senderName: string;
  senderRole: string;
  sentAt: string;
  readAt: string | null;
  attachments: MailAttachmentRow[];
};

export type SentRow = {
  id: string;
  subject: string;
  bodyHtml: string;
  snippet: string;
  audience: MailAudience;
  sentAt: string;
  recipients: { name: string; email: string; readAt: string | null }[];
  attachments: MailAttachmentRow[];
};

export type DraftRow = {
  id: string;
  subject: string;
  bodyHtml: string;
  snippet: string;
  audience: MailAudience;
  recipientIds: string[];
  updatedAt: string;
  attachments: MailAttachmentRow[];
};

export type OutboxRow = { id: string; toEmail: string; subject: string; body: string; link: string | null; createdAt: string };

/* ---------- Message body: a small allow-list sanitiser ---------- */

const ALLOWED = new Set(["b", "strong", "i", "em", "u", "p", "div", "br", "ul", "ol", "li", "a"]);
const DROP_WITH_CONTENT = /<(script|style|iframe|object|embed|noscript|template)\b[\s\S]*?(<\/\1\s*>|$)/gi;
const esc = (s: string) => s.replace(/</g, "&lt;").replace(/>/g, "&gt;");

function safeHref(tag: string): string | null {
  const m = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(tag);
  const raw = (m?.[1] ?? m?.[2] ?? m?.[3] ?? "").trim();
  if (!/^(https?:\/\/|mailto:)/i.test(raw)) return null;
  return raw.replace(/&(?!amp;|#)/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Keeps only basic formatting (bold, italic, underline, paragraphs, lists, links) and rebuilds every tag
 * without attributes, so nothing a browser could execute survives. Links keep an http(s)/mailto href only.
 */
export function sanitizeMailHtml(input: string): string {
  const src = input.replace(/<!--[\s\S]*?-->/g, "").replace(DROP_WITH_CONTENT, "");
  let out = "";
  let last = 0;
  const tagRe = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g;
  for (let m = tagRe.exec(src); m; m = tagRe.exec(src)) {
    out += esc(src.slice(last, m.index));
    last = m.index + m[0].length;
    const name = m[1].toLowerCase();
    if (!ALLOWED.has(name)) continue;
    const closing = m[0][1] === "/";
    if (name === "br") out += "<br>";
    else if (closing) out += `</${name}>`;
    else if (name === "a") {
      const href = safeHref(m[0]);
      out += href ? `<a href="${href}" target="_blank" rel="noopener noreferrer nofollow">` : "<a>";
    } else out += `<${name}>`;
  }
  out += esc(src.slice(last));
  return out.trim();
}

/** Plain text of a message body, for snippets, the "message written" check and the Outbox notification. */
export function mailText(html: string): string {
  return html
    .replace(/<(br|\/p|\/div|\/li)\b[^>]*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n\n")
    .trim();
}

export function mailSnippet(html: string, max = 140): string {
  const t = mailText(html).replace(/\s+/g, " ");
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

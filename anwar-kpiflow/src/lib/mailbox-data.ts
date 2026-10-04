import { db } from "./db";
import { ROLES, USER_STATUS } from "./constants";
import {
  MAIL_STATUS, canCompose, mailSnippet,
  type DraftRow, type InboxRow, type MailAudience, type MailPerson, type OutboxRow, type SentRow,
} from "./mailbox";

type Actor = { id: string; role: string; departmentId: string | null };

const LIST_LIMIT = 100;
const attachmentSelect = { select: { id: true, fileName: true, size: true }, orderBy: { createdAt: "asc" as const } };

/** Sidebar badge: messages delivered to this user that they have not opened yet. */
export function unreadMailCount(userId: string): Promise<number> {
  return db.mailRecipient.count({ where: { userId, readAt: null, message: { status: MAIL_STATUS.SENT } } });
}

/**
 * The people this user may write to: the Super Admin reaches every active account,
 * a Department Head the active employees of their own department. Never the sender themselves.
 */
export async function mailDirectory(actor: Actor): Promise<MailPerson[]> {
  if (!canCompose(actor)) return [];
  const users = await db.user.findMany({
    where: {
      status: USER_STATUS.ACTIVE,
      id: { not: actor.id },
      ...(actor.role === ROLES.SUPER_ADMIN ? {} : { departmentId: actor.departmentId, role: ROLES.EMPLOYEE }),
    },
    select: { id: true, fullName: true, employeeId: true, email: true, designation: true, department: { select: { name: true } } },
    orderBy: { fullName: "asc" },
  });
  return users.map((u) => ({ id: u.id, name: u.fullName, empCode: u.employeeId, email: u.email, department: u.department?.name ?? null, designation: u.designation }));
}

export async function inboxList(userId: string): Promise<InboxRow[]> {
  const rows = await db.mailRecipient.findMany({
    where: { userId, message: { status: MAIL_STATUS.SENT } },
    include: { message: { include: { sender: { select: { fullName: true, role: true } }, attachments: attachmentSelect } } },
    orderBy: { message: { sentAt: "desc" } },
    take: LIST_LIMIT,
  });
  return rows.map((r) => ({
    id: r.id, messageId: r.messageId, subject: r.message.subject, bodyHtml: r.message.bodyHtml, snippet: mailSnippet(r.message.bodyHtml),
    senderName: r.message.sender.fullName, senderRole: r.message.sender.role,
    sentAt: (r.message.sentAt ?? r.message.createdAt).toISOString(), readAt: r.readAt?.toISOString() ?? null,
    attachments: r.message.attachments,
  }));
}

export async function sentList(userId: string): Promise<SentRow[]> {
  const rows = await db.mailMessage.findMany({
    where: { senderId: userId, status: MAIL_STATUS.SENT },
    include: { recipients: { select: { name: true, email: true, readAt: true }, orderBy: { name: "asc" } }, attachments: attachmentSelect },
    orderBy: { sentAt: "desc" },
    take: LIST_LIMIT,
  });
  return rows.map((m) => ({
    id: m.id, subject: m.subject, bodyHtml: m.bodyHtml, snippet: mailSnippet(m.bodyHtml), audience: m.audience as MailAudience,
    sentAt: (m.sentAt ?? m.createdAt).toISOString(),
    recipients: m.recipients.map((r) => ({ name: r.name, email: r.email, readAt: r.readAt?.toISOString() ?? null })),
    attachments: m.attachments,
  }));
}

function parseIds(json: string): string[] {
  try {
    const v: unknown = JSON.parse(json);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export async function draftList(userId: string): Promise<DraftRow[]> {
  const rows = await db.mailMessage.findMany({
    where: { senderId: userId, status: MAIL_STATUS.DRAFT },
    include: { attachments: attachmentSelect },
    orderBy: { updatedAt: "desc" },
    take: LIST_LIMIT,
  });
  return rows.map((m) => ({
    id: m.id, subject: m.subject, bodyHtml: m.bodyHtml, snippet: mailSnippet(m.bodyHtml), audience: m.audience as MailAudience,
    recipientIds: parseIds(m.draftRecipientIds), updatedAt: m.updatedAt.toISOString(), attachments: m.attachments,
  }));
}

/** Every email the system delivered (setup and invitation links, workflow notifications, Mailbox messages), newest first. */
export async function outboxList(): Promise<OutboxRow[]> {
  const rows = await db.emailLog.findMany({ orderBy: { createdAt: "desc" }, take: LIST_LIMIT });
  return rows.map((m) => ({ id: m.id, toEmail: m.toEmail, subject: m.subject, body: m.body, link: m.link, createdAt: m.createdAt.toISOString() }));
}

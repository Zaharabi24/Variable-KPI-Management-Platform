"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { appUrl } from "@/lib/email";
import { storeBuffer } from "@/lib/storage";
import { fmtBytes } from "@/lib/utils";
import {
  MAIL_ALLOWED_TYPES, MAIL_AUDIENCE, MAIL_BODY_MAX, MAIL_MAX_FILES, MAIL_MAX_TOTAL_BYTES, MAIL_STATUS, MAIL_SUBJECT_MAX,
  canCompose, mailText, sanitizeMailHtml,
} from "@/lib/mailbox";
import { mailDirectory } from "@/lib/mailbox-data";
import { invalid, type ActionState } from "./form";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "");
const TX = { timeout: 20000, maxWait: 10000 };

function ids(json: string): string[] {
  try {
    const v: unknown = JSON.parse(json);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function refresh() {
  revalidatePath("/mailbox");
  revalidatePath("/", "layout"); // sidebar unread badge
}

/**
 * Compose: save the message as a draft, or send it.
 * Sending freezes the recipients (name and email as they are now), delivers the message to each Inbox
 * and logs one notification per recipient in the Email Outbox. Recipients are always re-resolved on the
 * server from the sender's own directory, so nobody can write outside their scope.
 */
export async function saveMailAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!canCompose(user)) return { ok: false, message: "You cannot send messages from the Mailbox." };
  const send = str(formData, "intent") === "send";
  const draftId = str(formData, "draftId") || null;

  try {
    const subject = str(formData, "subject").trim();
    const bodyHtml = sanitizeMailHtml(str(formData, "bodyHtml"));
    const audience = str(formData, "audience") === MAIL_AUDIENCE.ALL ? MAIL_AUDIENCE.ALL : MAIL_AUDIENCE.SELECTED;
    const errors: Record<string, string> = {};

    if (subject.length > MAIL_SUBJECT_MAX) errors.subject = `Keep the subject under ${MAIL_SUBJECT_MAX} characters.`;
    else if (send && !subject) errors.subject = "Subject is required.";
    if (bodyHtml.length > MAIL_BODY_MAX) errors.bodyHtml = "This message is too long. Please shorten it.";
    else if (send && !mailText(bodyHtml)) errors.bodyHtml = "Message is required.";

    const directory = await mailDirectory(user);
    const allowed = new Map(directory.map((p) => [p.id, p]));
    const chosen = ids(str(formData, "recipientIds")).filter((id) => allowed.has(id));
    const recipients = audience === MAIL_AUDIENCE.ALL ? directory : chosen.map((id) => allowed.get(id)!);
    if (send && recipients.length === 0) errors.recipients = "Choose at least one recipient.";

    const existing = draftId
      ? await db.mailMessage.findFirst({ where: { id: draftId, senderId: user.id, status: MAIL_STATUS.DRAFT }, include: { attachments: { select: { id: true, size: true } } } })
      : null;
    if (draftId && !existing) return { ok: false, message: "This draft no longer exists. It may already have been sent or deleted." };

    const remove = new Set(ids(str(formData, "removeAttachmentIds")));
    const kept = (existing?.attachments ?? []).filter((a) => !remove.has(a.id));
    const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
    const total = kept.reduce((a, f) => a + f.size, 0) + files.reduce((a, f) => a + f.size, 0);
    if (kept.length + files.length > MAIL_MAX_FILES) errors.files = `Attach up to ${MAIL_MAX_FILES} files.`;
    else if (total > MAIL_MAX_TOTAL_BYTES) errors.files = `Attachments must be ${fmtBytes(MAIL_MAX_TOTAL_BYTES)} or smaller in all.`;
    else if (files.some((f) => !MAIL_ALLOWED_TYPES.includes(f.type || "application/octet-stream"))) errors.files = "Allowed attachments: PDF, PNG, JPG, Excel, Word, CSV or text.";

    if (Object.keys(errors).length) return invalid(formData, errors, send ? "Please correct the highlighted fields. Nothing was sent." : "Please correct the highlighted fields.");

    const stored = await Promise.all(files.map(async (f) => storeBuffer(f.name, f.type || "application/octet-stream", Buffer.from(await f.arrayBuffer()))));
    const now = new Date();
    const data = {
      subject, bodyHtml, audience,
      draftRecipientIds: JSON.stringify(audience === MAIL_AUDIENCE.ALL ? [] : chosen),
      ...(send ? { status: MAIL_STATUS.SENT, sentAt: now, recipientCount: recipients.length } : {}),
    };

    const message = await db.$transaction(async (tx) => {
      const m = existing
        ? await tx.mailMessage.update({ where: { id: existing.id }, data })
        : await tx.mailMessage.create({ data: { ...data, senderId: user.id } });
      if (remove.size) await tx.mailAttachment.deleteMany({ where: { messageId: m.id, id: { in: [...remove] } } });
      for (const f of stored) {
        await tx.mailAttachment.create({ data: { messageId: m.id, fileName: f.fileName, mimeType: f.mimeType, size: f.size, sha256: f.sha256, data: f.data } });
      }
      if (send) {
        await tx.mailRecipient.createMany({ data: recipients.map((p) => ({ messageId: m.id, userId: p.id, name: p.name, email: p.email })) });
      }
      return m;
    }, TX);

    if (!send) {
      refresh();
      return { ok: true, message: "Draft saved.", values: { draftId: message.id } };
    }

    // The Inbox copy is already saved; a problem logging the notification must never undo a sent message.
    try {
      const text = mailText(bodyHtml);
      const attachmentNote = kept.length + stored.length ? `\n\n${kept.length + stored.length} attachment(s) are available in your Mailbox.` : "";
      await db.emailLog.createMany({
        data: recipients.map((p) => ({
          toEmail: p.email,
          subject,
          body: `Dear ${p.name},\n\n${text}${attachmentNote}\n\nSent by ${user.fullName} through the Anwar KPIFlow Mailbox.`,
          link: appUrl("/mailbox?tab=inbox"),
        })),
      });
    } catch (e) {
      console.error("[mailbox] outbox logging failed", e);
    }
    await audit(user.id, "MAIL_SENT", "MailMessage", message.id, { subject, audience, recipients: recipients.length, attachments: kept.length + stored.length });
    refresh();
    return { ok: true, message: `Email sent to ${recipients.length} recipient${recipients.length === 1 ? "" : "s"}.`, values: { sent: "1" } };
  } catch (e) {
    console.error("[mailbox]", e);
    return { ok: false, message: send ? "Something went wrong. Nothing was sent. Please try again." : "Something went wrong. The draft was not saved. Please try again." };
  }
}

export async function deleteDraftAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const { count } = await db.mailMessage.deleteMany({ where: { id: str(formData, "draftId"), senderId: user.id, status: MAIL_STATUS.DRAFT } });
  refresh();
  return count ? { ok: true, message: "Draft deleted." } : { ok: false, message: "This draft no longer exists." };
}

/** Marks the reader's own copy as read the first time they open it. */
export async function markMailReadAction(recipientId: string): Promise<void> {
  const user = await requireUser();
  const { count } = await db.mailRecipient.updateMany({ where: { id: recipientId, userId: user.id, readAt: null }, data: { readAt: new Date() } });
  if (count) refresh();
}

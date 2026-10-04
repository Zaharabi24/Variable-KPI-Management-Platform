/**
 * Mailbox self-check: the body sanitiser, then the data layer against the real database.
 * The data check writes one message from the Super Admin to one employee and always deletes it again.
 *   npx tsx scripts/mailbox-check.ts
 */
import { PrismaClient } from "@prisma/client";
import { mailSnippet, mailTabs, mailText, sanitizeMailHtml } from "../src/lib/mailbox";
import { draftList, inboxList, mailDirectory, sentList, unreadMailCount } from "../src/lib/mailbox-data";

let failed = 0;
function check(name: string, ok: boolean, detail?: unknown) {
  if (!ok) failed++;
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || detail === undefined ? "" : `  -> ${JSON.stringify(detail)}`}`);
}

const cases: [string, string, string][] = [
  ["keeps basic formatting", "<p>Hello <b>all</b>, <i>please</i> <u>read</u></p><ul><li>one</li></ul>", "<p>Hello <b>all</b>, <i>please</i> <u>read</u></p><ul><li>one</li></ul>"],
  ["drops script with content", "a<script>alert(1)</script>b", "ab"],
  ["drops unclosed script", "a<script>alert(1)", "a"],
  ["strips event handlers", '<p onclick="x()" style="color:red">hi</p>', "<p>hi</p>"],
  ["drops img, keeps text", '<img src=x onerror=alert(1)>ok', "ok"],
  ["escapes a tag that never closes", "<img src=x onerror=alert(1)", "&lt;img src=x onerror=alert(1)"],
  ["blocks javascript links", '<a href="javascript:alert(1)">x</a>', "<a>x</a>"],
  ["keeps https links", '<a href="https://anwargroup.net/a?b=1&c=2" onclick="x">x</a>', '<a href="https://anwargroup.net/a?b=1&amp;c=2" target="_blank" rel="noopener noreferrer nofollow">x</a>'],
  ["quote cannot break out of href", `<a href='https://a.b/"onmouseover="x'>x</a>`, '<a href="https://a.b/&quot;onmouseover=&quot;x" target="_blank" rel="noopener noreferrer nofollow">x</a>'],
  ["attribute containing > stays inert", '<b title=">" onclick=x>t</b>', '<b>" onclick=x&gt;t</b>'],
  ["drops comments and unknown tags", "<!-- x --><font color=red><span>t</span></font>", "t"],
  ["svg payload", "<svg/onload=alert(1)>x", "x"],
];
for (const [name, input, want] of cases) {
  const got = sanitizeMailHtml(input);
  check(`sanitise: ${name}`, got === want, got);
}
check("text: block tags become line breaks", mailText("<p>a</p><p>b &amp; c</p>") === "a\nb & c", mailText("<p>a</p><p>b &amp; c</p>"));
check("text: empty markup is empty", mailText("<p><br></p><div> &nbsp; </div>") === "");
check("snippet is shortened", mailSnippet(`<p>${"x".repeat(300)}</p>`).length === 140);
check("tabs: employee has inbox only", mailTabs({ role: "EMPLOYEE", departmentId: "d" }).join() === "inbox");
check("tabs: department head composes", mailTabs({ role: "DEPARTMENT_HEAD", departmentId: "d" }).join() === "inbox,compose,sent,drafts");
check("tabs: super admin sees the outbox", mailTabs({ role: "SUPER_ADMIN" }).join() === "inbox,compose,sent,drafts,outbox");

const db = new PrismaClient();
async function data() {
  const admin = await db.user.findFirstOrThrow({ where: { role: "SUPER_ADMIN", status: "ACTIVE" } });
  const head = await db.user.findFirstOrThrow({ where: { role: "DEPARTMENT_HEAD", status: "ACTIVE", departmentId: { not: null } } });
  const all = await mailDirectory(admin);
  const dept = await mailDirectory(head);
  const employee = dept[0];
  check("directory: super admin reaches everyone but themselves", all.length > dept.length && !all.some((p) => p.id === admin.id), all.length);
  check("directory: department head reaches only own employees", dept.length > 0 && dept.every((p) => all.find((a) => a.id === p.id)), dept.length);
  const deptUsers = await db.user.findMany({ where: { id: { in: dept.map((p) => p.id) } }, select: { departmentId: true, role: true } });
  check("directory: department scope is exact", deptUsers.every((u) => u.departmentId === head.departmentId && u.role === "EMPLOYEE"));
  check("directory: employee reaches nobody", (await mailDirectory({ id: employee.id, role: "EMPLOYEE", departmentId: head.departmentId })).length === 0);

  const before = await unreadMailCount(employee.id);
  const msg = await db.mailMessage.create({
    data: {
      senderId: admin.id, subject: "[self-check] Mailbox", bodyHtml: "<p>Check <b>only</b>.</p>", status: "SENT", audience: "SELECTED", sentAt: new Date(), recipientCount: 1,
      recipients: { create: { userId: employee.id, name: employee.name, email: employee.email } },
      attachments: { create: { fileName: "note.txt", mimeType: "text/plain", size: 2, sha256: "x", data: Buffer.from("ok") } },
    },
  });
  const draft = await db.mailMessage.create({ data: { senderId: admin.id, subject: "[self-check] draft", bodyHtml: "", draftRecipientIds: JSON.stringify([employee.id]) } });
  try {
    const inbox = await inboxList(employee.id);
    const mine = inbox.find((r) => r.messageId === msg.id);
    check("inbox: recipient sees the message, unread, with attachment", !!mine && mine.readAt === null && mine.attachments.length === 1 && mine.senderName === admin.fullName);
    check("inbox: unread badge goes up by one", (await unreadMailCount(employee.id)) === before + 1);
    check("inbox: other people do not see it", !(await inboxList(head.id)).some((r) => r.messageId === msg.id));
    const sent = (await sentList(admin.id)).find((r) => r.id === msg.id);
    check("sent: sender sees it with the recipient and read state", !!sent && sent.recipients.length === 1 && sent.recipients[0].readAt === null);
    check("sent: a draft is not listed as sent", !(await sentList(admin.id)).some((r) => r.id === draft.id));
    const d = (await draftList(admin.id)).find((r) => r.id === draft.id);
    check("drafts: keeps the intended recipients", !!d && d.recipientIds.join() === employee.id);
    check("drafts: a draft never reaches an inbox", !(await inboxList(employee.id)).some((r) => r.messageId === draft.id));
    await db.mailRecipient.updateMany({ where: { messageId: msg.id, userId: employee.id }, data: { readAt: new Date() } });
    check("read: badge returns to its previous value", (await unreadMailCount(employee.id)) === before);
  } finally {
    await db.mailMessage.deleteMany({ where: { id: { in: [msg.id, draft.id] } } });
  }
  const left = await db.mailRecipient.count({ where: { messageId: msg.id } }) + await db.mailAttachment.count({ where: { messageId: msg.id } });
  check("cleanup: message, recipient and attachment rows are gone", left === 0);
}

data()
  .catch((e) => { failed++; console.error(e); })
  .finally(async () => {
    await db.$disconnect();
    console.log(failed ? `\n${failed} check(s) failed` : "\nAll checks passed");
    process.exit(failed ? 1 : 0);
  });

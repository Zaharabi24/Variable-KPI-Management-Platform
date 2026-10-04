import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { MAIL_STATUS, canCompose, mailTabs, type MailTab } from "@/lib/mailbox";
import { draftList, inboxList, mailDirectory, outboxList, sentList, unreadMailCount } from "@/lib/mailbox-data";
import { db } from "@/lib/db";
import { MailboxBoard } from "./mailbox-board";

export const metadata: Metadata = { title: "Mailbox" };

export default async function MailboxPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const tabs = mailTabs(user);
  const tab = (tabs.includes(sp.tab as MailTab) ? sp.tab : tabs[0]) as MailTab;
  const compose = canCompose(user);

  // Only the open tab's list is loaded; the two counters feed the tab badges.
  const [unread, draftCount, inbox, sent, drafts, outbox, directory] = await Promise.all([
    unreadMailCount(user.id),
    compose ? db.mailMessage.count({ where: { senderId: user.id, status: MAIL_STATUS.DRAFT } }) : 0,
    tab === "inbox" ? inboxList(user.id) : [],
    tab === "sent" ? sentList(user.id) : [],
    tab === "drafts" || (tab === "compose" && sp.draft) ? draftList(user.id) : [],
    tab === "outbox" ? outboxList() : [],
    tab === "compose" ? mailDirectory(user) : [],
  ]);

  const everyone = user.role === ROLES.SUPER_ADMIN;
  const subtitle = !compose
    ? "Messages sent to you by the Super Admin and your Department Head."
    : everyone
      ? "Write to everyone on the platform on the Anwar KPIFlow template, or just the people you choose."
      : `Write to the employees of ${user.department?.name ?? "your department"} on the Anwar KPIFlow template: everyone, or just the people you choose.`;

  return (
    <MailboxBoard
      tab={tab}
      tabs={tabs}
      subtitle={subtitle}
      viewerName={user.fullName}
      unread={unread}
      draftCount={draftCount}
      inbox={inbox}
      sent={sent}
      drafts={drafts}
      outbox={outbox}
      directory={directory}
      draft={tab === "compose" && sp.draft ? (drafts.find((d) => d.id === sp.draft) ?? null) : null}
      everyoneLabel={everyone ? "Everyone with an active account on the platform." : `Everyone active in ${user.department?.name ?? "your department"}.`}
    />
  );
}

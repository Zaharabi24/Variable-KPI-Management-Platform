import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/shell/app-shell";
import { pendingRequestCount } from "@/lib/kpi-data";
import { unreadMailCount } from "@/lib/mailbox-data";

/** Vercel: allow slow database round trips and cold starts to finish instead of cutting the response (default is 10 s on Hobby). */
export const maxDuration = 60;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  // Sidebar badges: KPI requests waiting for this person's decision, and unread Mailbox messages.
  const [pendingCount, mailUnread] = await Promise.all([pendingRequestCount(user), unreadMailCount(user.id)]);

  return (
    <AppShell user={user} pendingCount={pendingCount} mailUnread={mailUnread}>
      {children}
    </AppShell>
  );
}

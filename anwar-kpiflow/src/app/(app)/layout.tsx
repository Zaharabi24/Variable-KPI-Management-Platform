import { requireUser, isSuperAdmin, isDeptHead } from "@/lib/auth";
import { db } from "@/lib/db";
import { AppShell } from "@/components/shell/app-shell";
import { ROLES } from "@/lib/constants";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  let pendingCount = 0;
  if (isSuperAdmin(user)) {
    pendingCount = await db.kpi.count({ where: { status: "SUBMITTED", deletedAt: null } });
  } else if (isDeptHead(user)) {
    pendingCount = await db.kpi.count({
      where: {
        status: "SUBMITTED",
        deletedAt: null,
        OR: [{ approverId: user.id }, { owner: { departmentId: user.departmentId, role: ROLES.EMPLOYEE } }],
        NOT: { ownerId: user.id },
      },
    });
  }

  return (
    <AppShell user={user} pendingCount={pendingCount}>
      {children}
    </AppShell>
  );
}

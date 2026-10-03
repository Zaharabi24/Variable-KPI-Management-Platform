import { requireUser, isSuperAdmin, isDeptHead } from "@/lib/auth";
import { db } from "@/lib/db";
import { AppShell } from "@/components/shell/app-shell";
import { ROLES } from "@/lib/constants";
import { variablePayNav } from "@/lib/variable-pay-data";

/** Vercel: allow slow database round trips and cold starts to finish instead of cutting the response (default is 10 s on Hobby). */
export const maxDuration = 60;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  let pendingCount = 0;
  if (user.role === ROLES.SYSTEM_ADMIN) {
    pendingCount = 0;
  } else if (isSuperAdmin(user)) {
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

  const vp = await variablePayNav(user);

  return (
    <AppShell user={user} pendingCount={pendingCount} vp={vp}>
      {children}
    </AppShell>
  );
}

import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader, Card, CardHeader } from "@/components/ui/card";
import { ROLES } from "@/lib/constants";
import { VP_STATUS } from "@/lib/variable-pay";
import { UserTable } from "../employees/user-table";
import { InviteFinanceAdminButton } from "./invite-form";

export const metadata: Metadata = { title: "Finance Admin" };

/** Finance Admin accounts hold payment authority, so only the Super Admin creates and manages them. */
export default async function FinanceAdminsPage() {
  await requireRole(ROLES.SUPER_ADMIN);
  const [admins, units, departments, awaiting] = await Promise.all([
    db.user.findMany({
      where: { role: ROLES.FINANCE_ADMIN },
      include: { businessUnit: true, tokens: { where: { type: "INVITATION" }, orderBy: { createdAt: "desc" }, take: 1 }, _count: { select: { vpPaymentsConfirmed: true } } },
      orderBy: { fullName: "asc" },
    }),
    db.businessUnit.findMany({ orderBy: { name: "asc" } }),
    db.department.findMany({ orderBy: { name: "asc" } }),
    db.variablePayEvaluation.count({ where: { status: VP_STATUS.APPROVED } }),
  ]);
  const active = admins.filter((a) => a.status === "ACTIVE").length;

  return (
    <>
      <PageHeader
        title="Finance Admin"
        subtitle="Finance Admins receive every Variable Pay request the Super Admin approves and confirm its payment amount. They cannot see KPIs, approve requests or manage users."
        action={<InviteFinanceAdminButton units={units} />}
      />
      {awaiting > 0 && active === 0 && (
        <Card className="mb-5 border-amber-300 bg-amber-50 px-5 py-4 text-[13.5px] text-amber-900">
          {awaiting} approved Variable Pay request{awaiting === 1 ? " is" : "s are"} waiting for payment, but there is no active Finance Admin. Invite one to continue the workflow.
        </Card>
      )}
      <Card>
        <CardHeader title="Finance Admin accounts" subtitle={`${admins.length} account${admins.length === 1 ? "" : "s"} · ${active} active · ${awaiting} approved request${awaiting === 1 ? "" : "s"} awaiting payment`} />
        {admins.length === 0 ? (
          <div className="px-5 pb-10 pt-4 text-center text-[13.5px] text-ink-500">No Finance Admin yet. Invite the first one; they set their own password through a secure link.</div>
        ) : (
          <UserTable
            users={admins.map((a) => ({
              id: a.id, fullName: a.fullName, email: a.email, employeeId: a.employeeId, designation: a.designation, status: a.status,
              businessUnit: a.businessUnit?.name ?? "—", businessUnitId: a.businessUnitId, department: "All departments", departmentId: null,
              invitation: a.tokens[0] ? { expiresAt: a.tokens[0].expiresAt.toISOString(), usedAt: a.tokens[0].usedAt?.toISOString() ?? null } : null,
              pending: a._count.vpPaymentsConfirmed, corporatePhone: a.corporatePhone,
            }))}
            units={units}
            departments={departments}
            kind="finance"
          />
        )}
      </Card>
    </>
  );
}

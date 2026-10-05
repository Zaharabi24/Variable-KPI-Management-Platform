import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader, Card, CardHeader } from "@/components/ui/card";
import { ROLES, ROLE_LABELS, type Role } from "@/lib/constants";
import { STAGE_STATUSES } from "@/lib/kpi";
import { UserTable } from "../employees/user-table";
import { InviteStageAdminButton } from "./invite-form";

const COPY = {
  [ROLES.HR_ADMIN]: {
    stage: "HR" as const,
    subtitle: "HR Admins receive every KPI a Department Head approves. They add Attendance, Remarks, the HR Note and the Payment Amount; their approval calculates the Total Score and sends the KPI to the Finance Admin.",
    what: "They then see the KPI requests of every department and complete the HR part.",
    from: "Department Heads",
  },
  [ROLES.FINANCE_ADMIN]: {
    stage: "FINANCE" as const,
    subtitle: "Finance Admins receive every KPI the HR Admin approves. They review it and approve it for the Audit Admin, or reject and return it to the HR Admin with remarks.",
    what: "They then see the KPI requests approved by the HR Admin, including the Payment Amount.",
    from: "the HR Admin",
  },
  [ROLES.AUDIT_ADMIN]: {
    stage: "AUDIT" as const,
    subtitle: "Audit Admins are the last step of the approval chain. They receive every KPI the Finance Admin approves and complete it, or return it to the Finance Admin with remarks.",
    what: "They then see the KPI requests approved by the Finance Admin and the Audit Trail.",
    from: "the Finance Admin",
  },
};

/**
 * Account list for one of the three reviewing admin roles. These accounts hold approval authority across
 * every department, so only the Super Admin creates and manages them.
 */
export async function StageAdminsPage({ role }: { role: Role }) {
  await requireRole(ROLES.SUPER_ADMIN);
  const copy = COPY[role as keyof typeof COPY];
  const label = ROLE_LABELS[role];
  const [admins, units, departments, awaiting] = await Promise.all([
    db.user.findMany({
      where: { role },
      include: { businessUnit: true, tokens: { where: { type: "INVITATION" }, orderBy: { createdAt: "desc" }, take: 1 }, _count: { select: { decisions: true } } },
      orderBy: { fullName: "asc" },
    }),
    db.businessUnit.findMany({ orderBy: { name: "asc" } }),
    db.department.findMany({ orderBy: { name: "asc" } }),
    db.kpi.count({ where: { deletedAt: null, status: { in: STAGE_STATUSES[copy.stage] } } }),
  ]);
  const active = admins.filter((a) => a.status === "ACTIVE").length;

  return (
    <>
      <PageHeader title={label} subtitle={copy.subtitle} action={<InviteStageAdminButton units={units} role={role} what={copy.what} />} />
      {awaiting > 0 && active === 0 && (
        <Card className="mb-5 border-amber-300 bg-amber-50 px-5 py-4 text-[13.5px] text-amber-900">
          {awaiting} KPI request{awaiting === 1 ? " is" : "s are"} waiting for the {label}, but there is no active {label}. Invite one to continue the approval chain. Until then you can act on these requests yourself from KPI Requests.
        </Card>
      )}
      <Card>
        <CardHeader title={`${label} accounts`} subtitle={`${admins.length} account${admins.length === 1 ? "" : "s"} · ${active} active · ${awaiting} KPI request${awaiting === 1 ? "" : "s"} waiting from ${copy.from}`} />
        {admins.length === 0 ? (
          <div className="px-5 pb-10 pt-4 text-center text-[13.5px] text-ink-500">No {label} yet. Invite the first one; they set their own password through a secure link.</div>
        ) : (
          <UserTable
            users={admins.map((a) => ({
              id: a.id, fullName: a.fullName, email: a.email, employeeId: a.employeeId, designation: a.designation, status: a.status,
              businessUnit: a.businessUnit?.name ?? "—", businessUnitId: a.businessUnitId, department: "All departments", departmentId: null,
              invitation: a.tokens[0] ? { expiresAt: a.tokens[0].expiresAt.toISOString(), usedAt: a.tokens[0].usedAt?.toISOString() ?? null } : null,
              pending: a._count.decisions, corporatePhone: a.corporatePhone,
            }))}
            units={units}
            departments={departments}
            kind="admin"
          />
        )}
      </Card>
    </>
  );
}

import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader, Card, CardHeader } from "@/components/ui/card";
import { ROLES } from "@/lib/constants";
import { InviteHeadButton } from "./invite-form";
import { UserTable } from "../employees/user-table";

export const metadata: Metadata = { title: "Department Heads" };

export default async function DepartmentHeadsPage() {
  await requireRole(ROLES.SUPER_ADMIN);
  const [heads, units, departments] = await Promise.all([
    db.user.findMany({
      where: { role: ROLES.DEPARTMENT_HEAD },
      include: { businessUnit: true, department: true, tokens: { where: { type: "INVITATION" }, orderBy: { createdAt: "desc" }, take: 1 }, _count: { select: { approvingKpis: { where: { status: "SUBMITTED", deletedAt: null } } } } },
      orderBy: [{ department: { name: "asc" } }, { fullName: "asc" }],
    }),
    db.businessUnit.findMany({ orderBy: { name: "asc" } }),
    db.department.findMany({ orderBy: { name: "asc" } }),
  ]);

  const byDept = new Map<string, typeof heads>();
  for (const h of heads) {
    const key = h.department?.name ?? "Unassigned";
    byDept.set(key, [...(byDept.get(key) ?? []), h]);
  }

  return (
    <>
      <PageHeader
        title="Department Heads"
        subtitle="Approvers, listed by department. A department may have several heads; each sees the same department queue."
        action={<InviteHeadButton units={units} departments={departments} />}
      />
      <div className="space-y-5">
        {Array.from(byDept.entries()).map(([dept, list]) => (
          <Card key={dept}>
            <CardHeader title={dept} subtitle={`${list.length} Department Head${list.length === 1 ? "" : "s"}`} />
            <UserTable
              users={list.map((h) => ({
                id: h.id, fullName: h.fullName, email: h.email, employeeId: h.employeeId, designation: h.designation, status: h.status,
                businessUnit: h.businessUnit?.name ?? "—", businessUnitId: h.businessUnitId, department: h.department?.name ?? "—", departmentId: h.departmentId,
                invitation: h.tokens[0] ? { expiresAt: h.tokens[0].expiresAt.toISOString(), usedAt: h.tokens[0].usedAt?.toISOString() ?? null } : null,
                pending: h._count.approvingKpis, corporatePhone: h.corporatePhone,
              }))}
              units={units}
              departments={departments}
              kind="head"
            />
          </Card>
        ))}
        {heads.length === 0 && <Card className="p-10 text-center text-ink-500">No Department Heads yet. Invite the first one.</Card>}
      </div>
    </>
  );
}

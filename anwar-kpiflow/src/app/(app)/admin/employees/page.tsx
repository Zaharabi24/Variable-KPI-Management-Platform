import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader, Card } from "@/components/ui/card";
import { ROLES } from "@/lib/constants";
import { AddEmployeeButton } from "../department-heads/invite-form";
import { UserTable } from "./user-table";
import { EmployeeFilters } from "./filters";
import type { Prisma } from "@prisma/client";

export const metadata: Metadata = { title: "Employees" };

export default async function EmployeesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireRole(ROLES.SUPER_ADMIN, ROLES.SYSTEM_ADMIN);
  const sp = await searchParams;
  const where: Prisma.UserWhereInput = {
    role: ROLES.EMPLOYEE,
    ...(sp.dept ? { departmentId: sp.dept } : {}),
    ...(sp.bu ? { businessUnitId: sp.bu } : {}),
    ...(sp.q ? { OR: [{ fullName: { contains: sp.q, mode: "insensitive" } }, { employeeId: { contains: sp.q, mode: "insensitive" } }, { email: { contains: sp.q, mode: "insensitive" } }] } : {}),
  };
  const [users, units, departments] = await Promise.all([
    db.user.findMany({
      where,
      include: { businessUnit: true, department: true, tokens: { where: { type: "SIGNUP" }, orderBy: { createdAt: "desc" }, take: 1 }, _count: { select: { ownedKpis: { where: { deletedAt: null } } } } },
      orderBy: [{ department: { name: "asc" } }, { fullName: "asc" }],
    }),
    db.businessUnit.findMany({ orderBy: { name: "asc" } }),
    db.department.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <>
      <PageHeader title="Employees" subtitle="Add, move, deactivate or remove employees within departments." action={<AddEmployeeButton units={units} departments={departments} />} />
      <Card>
        <EmployeeFilters units={units} departments={departments} q={sp.q ?? ""} dept={sp.dept ?? ""} bu={sp.bu ?? ""} count={users.length} />
        <UserTable
          users={users.map((u) => ({
            id: u.id, fullName: u.fullName, email: u.email, employeeId: u.employeeId, designation: u.designation, status: u.status,
            businessUnit: u.businessUnit?.name ?? "—", businessUnitId: u.businessUnitId, department: u.department?.name ?? "—", departmentId: u.departmentId,
            invitation: u.tokens[0] ? { expiresAt: u.tokens[0].expiresAt.toISOString(), usedAt: u.tokens[0].usedAt?.toISOString() ?? null } : null,
            pending: u._count.ownedKpis, corporatePhone: u.corporatePhone,
          }))}
          units={units}
          departments={departments}
          kind="employee"
        />
      </Card>
    </>
  );
}

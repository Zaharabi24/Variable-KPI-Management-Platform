import type { Metadata } from "next";
import { requireRole, isSuperAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { parsePeriod } from "@/lib/reporting";
import { PageHeader } from "@/components/ui/card";
import { PeriodFilter } from "@/components/kpi/period-filter";
import { RequestQueue, type RequestItem } from "./request-queue";
import { ROLES } from "@/lib/constants";
import type { Prisma } from "@prisma/client";

export const metadata: Metadata = { title: "KPI Pending Request" };

export default async function PendingRequestsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireRole(ROLES.DEPARTMENT_HEAD, ROLES.SUPER_ADMIN);
  const sp = await searchParams;
  const allPeriods = sp.all === "1";
  const period = parsePeriod(sp);

  // Department scoping in the query itself (Section 17.3).
  const scope: Prisma.KpiWhereInput = isSuperAdmin(user)
    ? {}
    : { OR: [{ approverId: user.id }, { owner: { departmentId: user.departmentId, role: ROLES.EMPLOYEE } }], NOT: { ownerId: user.id } };

  const departments = isSuperAdmin(user) ? await db.department.findMany({ orderBy: { name: "asc" } }) : [];
  const kpis = await db.kpi.findMany({
    where: {
      ...scope,
      deletedAt: null,
      status: "SUBMITTED",
      ...(allPeriods ? {} : { periodYear: period.year, periodMonth: { gte: period.fromMonth, lte: period.toMonth } }),
    },
    include: {
      owner: { include: { department: true } },
      approver: true,
      evidence: true,
      versions: { include: { changedBy: true }, orderBy: { versionNo: "asc" } },
    },
    orderBy: { submittedAt: "asc" }, // oldest first (FR-REV-01)
  });

  const items: RequestItem[] = kpis.map((k) => ({
    id: k.id, name: k.name, category: k.category, status: k.status, target: k.target, actual: k.actual, unit: k.unit, weight: k.weight,
    achievement: k.achievement, calculatedScore: k.calculatedScore, finalScore: k.finalScore, remarks: k.remarks, dataSource: k.dataSource,
    periodYear: k.periodYear, periodMonth: k.periodMonth, submittedAt: k.submittedAt.toISOString(), currentVersion: k.currentVersion,
    owner: { id: k.owner.id, fullName: k.owner.fullName, employeeId: k.owner.employeeId, designation: k.owner.designation, department: k.owner.department?.name ?? null, departmentId: k.owner.departmentId },
    approver: { fullName: k.approver.fullName },
    evidence: k.evidence.map((e) => ({ id: e.id, fileName: e.fileName, sha256: e.sha256, size: e.size })),
    versions: k.versions.map((v) => ({ id: v.id, versionNo: v.versionNo, action: v.action, changes: v.changes, reason: v.reason, createdAt: v.createdAt.toISOString(), changedBy: { fullName: v.changedBy.fullName } })),
    isResubmission: k.versions.some((v) => v.action === "RESUBMIT"),
  }));

  return (
    <>
      <PageHeader
        title="KPI Pending Request"
        subtitle={`${items.length} request${items.length === 1 ? "" : "s"} waiting — oldest first · ${allPeriods ? "all periods" : period.label}`}
        action={<PeriodFilter period={period} />}
      />
      <RequestQueue
        items={items}
        openId={sp.open ?? null}
        allPeriods={allPeriods}
        scopeLabel={isSuperAdmin(user) ? "All departments" : user.department?.name ?? ""}
        departments={isSuperAdmin(user) ? departments.map((d) => ({ id: d.id, name: d.name })) : undefined}
      />
    </>
  );
}

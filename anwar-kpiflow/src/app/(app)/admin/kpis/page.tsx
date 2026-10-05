import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { parsePeriod } from "@/lib/reporting";
import { PageHeader, Card } from "@/components/ui/card";
import { Table, Th, Td } from "@/components/ui/table";
import { StatusBadge, Pill } from "@/components/ui/badge";
import { PeriodFilter } from "@/components/kpi/period-filter";
import { ROLES, MONTHS_SHORT } from "@/lib/constants";
import { KPI_SELF_MAX, KPI_STATUS, STAGE_LABELS, STAGE_STATUSES, stageOf, type KpiStatus } from "@/lib/kpi";
import { fmtNum } from "@/lib/calc";
import { KpiFilters, DepartmentChips } from "./filters";
import type { Prisma } from "@prisma/client";

export const metadata: Metadata = { title: "All KPIs and Approvals" };

export default async function AllKpisPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireRole(ROLES.SUPER_ADMIN, ROLES.SYSTEM_ADMIN);
  const sp = await searchParams;
  const allPeriods = sp.all === "1";
  const superAdmin = user.role === ROLES.SUPER_ADMIN;

  // Default period = the most recent month that has KPI data, so the page always opens on the latest figures.
  const latest = await db.kpi.findFirst({ where: { deletedAt: null, status: { not: KPI_STATUS.DRAFT } }, orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }], select: { periodYear: true, periodMonth: true } });
  const period = parsePeriod({
    ...(latest ? { year: String(latest.periodYear), month: String(latest.periodMonth) } : {}),
    ...Object.fromEntries(Object.entries(sp).filter(([, v]) => v)),
  });

  const where: Prisma.KpiWhereInput = {
    // A draft belongs to its owner alone; it appears here once it is submitted.
    status: sp.status && sp.status !== KPI_STATUS.DRAFT ? sp.status : { not: KPI_STATUS.DRAFT },
    ...(sp.deleted === "1" ? {} : { deletedAt: null }),
    ...(sp.role || sp.q ? { owner: { ...(sp.role ? { role: sp.role } : {}), ...(sp.q ? { OR: [{ fullName: { contains: sp.q, mode: "insensitive" as const } }, { employeeId: { contains: sp.q, mode: "insensitive" as const } }] } : {}) } } : {}),
    ...(allPeriods ? {} : { periodYear: period.year, periodMonth: { gte: period.fromMonth, lte: period.toMonth } }),
  };

  const [allInPeriod, departments] = await Promise.all([
    db.kpi.findMany({
      where,
      include: { owner: { include: { department: true } }, approver: true },
      // Department-wise: department, then employee, then newest month
      orderBy: [{ owner: { department: { name: "asc" } } }, { owner: { fullName: "asc" } }, { periodYear: "desc" }, { periodMonth: "desc" }],
      take: 500,
    }),
    db.department.findMany({ orderBy: { name: "asc" } }),
  ]);
  const kpis = sp.dept ? allInPeriod.filter((k) => k.owner.departmentId === sp.dept) : allInPeriod;
  const deptCounts = departments.map((d) => ({ id: d.id, name: d.name, count: allInPeriod.filter((k) => k.owner.departmentId === d.id).length })).filter((d) => d.count > 0);
  const deptName = sp.dept ? departments.find((d) => d.id === sp.dept)?.name : "All departments";
  const at = (statuses: KpiStatus[]) => kpis.filter((k) => (statuses as string[]).includes(k.status)).length;
  const summary: { label: string; n: number; tone: "amber" | "green" | "red" | "blue" }[] = [
    { label: "With Department Head", n: at(STAGE_STATUSES.DEPT), tone: "amber" },
    { label: "With HR Admin", n: at(STAGE_STATUSES.HR), tone: "blue" },
    { label: "With Finance Admin", n: at(STAGE_STATUSES.FINANCE), tone: "blue" },
    { label: "With Audit Admin", n: at(STAGE_STATUSES.AUDIT), tone: "blue" },
    { label: "Completed", n: at([KPI_STATUS.COMPLETED]), tone: "green" },
    { label: "Returned to employee", n: at([KPI_STATUS.RETURNED]), tone: "red" },
    { label: "Rejected", n: at([KPI_STATUS.REJECTED]), tone: "red" },
  ];
  const cols = superAdmin ? 10 : 9;

  return (
    <>
      <PageHeader
        title={superAdmin ? "All KPIs and Approvals" : "All KPIs"}
        subtitle={`${deptName} · ${allPeriods ? "all periods" : period.label} · every employee's and Department Head's KPI, department-wise`}
        action={<PeriodFilter period={period} />}
      />
      <Card>
        <KpiFilters departments={departments} q={sp.q ?? ""} status={sp.status ?? ""} dept={sp.dept ?? ""} role={sp.role ?? ""} deleted={sp.deleted === "1"} allPeriods={allPeriods} />
        <DepartmentChips total={allInPeriod.length} counts={deptCounts} active={sp.dept ?? ""} />
        <div className="px-5 py-3 flex flex-wrap gap-2 border-b border-ink-100">
          {summary.map((s) => <Pill key={s.label} tone={s.tone}>{s.label} · {s.n}</Pill>)}
          <span className="ml-auto text-[12.5px] text-ink-400 tnum self-center">{kpis.length} record{kpis.length === 1 ? "" : "s"}</span>
        </div>
        <Table>
          <thead>
            <tr>
              <Th>Owner</Th><Th>Department</Th><Th>KPI month</Th><Th align="right">KPI (5)</Th><Th align="right">Total Score</Th>{superAdmin && <Th align="right">Payment (BDT)</Th>}<Th>Status</Th><Th>Waiting for</Th><Th>Approver</Th><Th align="right">Ver.</Th>
            </tr>
          </thead>
          <tbody>
            {kpis.length === 0 && (
              <tr><Td className="text-center text-ink-500 py-10">No KPIs for {deptName?.toLowerCase()} in {allPeriods ? "any period" : period.label}. Try another period or department.</Td>{Array.from({ length: cols - 1 }).map((_, i) => <Td key={i} />)}</tr>
            )}
            {kpis.map((k) => {
              const stage = stageOf(k.status);
              const kpiScore = k.kpiScore ?? k.selfScore;
              return (
                <tr key={k.id} className={k.deletedAt ? "opacity-60" : ""}>
                  <Td className="min-w-[190px]">
                    <Link href={superAdmin && stage && stage !== "EMPLOYEE" && !k.deletedAt ? `/kpi-requests?open=${k.id}` : `/my-kpi/${k.id}`} className="font-medium text-ink-900 hover:text-brand-700 whitespace-nowrap">{k.owner.fullName}</Link>
                    <div className="text-[11.5px] text-ink-400 font-mono">{k.owner.employeeId}{k.owner.role === ROLES.DEPARTMENT_HEAD ? " · Dept Head" : ""}</div>
                    {k.deletedAt && <div className="text-[11px] text-red-600">deleted</div>}
                  </Td>
                  <Td className="whitespace-nowrap">{k.owner.department?.name ?? "—"}</Td>
                  <Td className="whitespace-nowrap">{MONTHS_SHORT[k.periodMonth - 1]} {k.periodYear}</Td>
                  <Td align="right" mono>{kpiScore === null ? "—" : fmtNum(kpiScore)}<span className="text-ink-400 text-[11.5px]"> / {KPI_SELF_MAX}</span></Td>
                  <Td align="right" mono>{k.totalScore === null ? <span className="text-ink-300">—</span> : fmtNum(k.totalScore)}</Td>
                  {superAdmin && <Td align="right" mono>{k.paymentAmount === null ? <span className="text-ink-300">—</span> : k.paymentAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Td>}
                  <Td><StatusBadge status={k.status} /></Td>
                  <Td className="whitespace-nowrap text-ink-700">{stage ? STAGE_LABELS[stage] : "—"}</Td>
                  <Td className="whitespace-nowrap">{k.approver?.fullName ?? "—"}</Td>
                  <Td align="right" mono>{superAdmin ? <Link href={`/admin/versions?kpi=${k.id}`} className="text-brand-700 hover:underline">v{k.currentVersion}</Link> : `v${k.currentVersion}`}</Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { parsePeriod } from "@/lib/reporting";
import { PageHeader, Card } from "@/components/ui/card";
import { Table, Th, Td } from "@/components/ui/table";
import { StatusBadge, Pill } from "@/components/ui/badge";
import { PeriodFilter } from "@/components/kpi/period-filter";
import { ROLES, MONTHS_SHORT, STATUS_LABELS, type KpiStatus } from "@/lib/constants";
import { fmtNum, fmtPct } from "@/lib/calc";
import { KpiFilters, DepartmentChips } from "./filters";
import type { Prisma } from "@prisma/client";

export const metadata: Metadata = { title: "All KPIs and Approvals" };

export default async function AllKpisPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireRole(ROLES.SUPER_ADMIN);
  const sp = await searchParams;
  const allPeriods = sp.all === "1";

  // Default period = the most recent month that has KPI data, so the page always opens on the latest figures.
  const latest = await db.kpi.findFirst({ where: { deletedAt: null }, orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }], select: { periodYear: true, periodMonth: true } });
  const period = parsePeriod({
    ...(latest ? { year: String(latest.periodYear), month: String(latest.periodMonth) } : {}),
    ...Object.fromEntries(Object.entries(sp).filter(([, v]) => v)),
  });

  const where: Prisma.KpiWhereInput = {
    ...(sp.deleted === "1" ? {} : { deletedAt: null }),
    ...(sp.status ? { status: sp.status } : {}),
    ...(sp.role ? { owner: { role: sp.role } } : {}),
    ...(sp.q ? { OR: [{ name: { contains: sp.q, mode: "insensitive" } }, { owner: { fullName: { contains: sp.q, mode: "insensitive" } } }, { owner: { employeeId: { contains: sp.q, mode: "insensitive" } } }] } : {}),
    ...(allPeriods ? {} : { periodYear: period.year, periodMonth: { gte: period.fromMonth, lte: period.toMonth } }),
  };

  const [allInPeriod, departments] = await Promise.all([
    db.kpi.findMany({
      where,
      include: { owner: { include: { department: true } }, approver: true },
      // Department-wise: department, then employee, then newest submission
      orderBy: [{ owner: { department: { name: "asc" } } }, { owner: { fullName: "asc" } }, { submittedAt: "desc" }],
      take: 500,
    }),
    db.department.findMany({ orderBy: { name: "asc" } }),
  ]);
  const kpis = sp.dept ? allInPeriod.filter((k) => k.owner.departmentId === sp.dept) : allInPeriod;
  const deptCounts = departments.map((d) => ({ id: d.id, name: d.name, count: allInPeriod.filter((k) => k.owner.departmentId === d.id).length })).filter((d) => d.count > 0);
  const summary = Object.keys(STATUS_LABELS).map((s) => ({ s, n: kpis.filter((k) => k.status === s).length }));
  const deptName = sp.dept ? departments.find((d) => d.id === sp.dept)?.name : "All departments";

  return (
    <>
      <PageHeader
        title="All KPIs and Approvals"
        subtitle={`${deptName} · ${allPeriods ? "all periods" : period.label} · every employee's and Department Head's KPIs, department-wise`}
        action={<PeriodFilter period={period} />}
      />
      <Card>
        <KpiFilters departments={departments} q={sp.q ?? ""} status={sp.status ?? ""} dept={sp.dept ?? ""} role={sp.role ?? ""} deleted={sp.deleted === "1"} allPeriods={allPeriods} />
        <DepartmentChips total={allInPeriod.length} counts={deptCounts} active={sp.dept ?? ""} />
        <div className="px-5 py-3 flex flex-wrap gap-2 border-b border-ink-100">
          {summary.map(({ s, n }) => <Pill key={s} tone={s === "SUBMITTED" ? "amber" : s === "REJECTED" || s === "RETURNED" ? "red" : "green"}>{STATUS_LABELS[s as KpiStatus]} · {n}</Pill>)}
          <span className="ml-auto text-[12.5px] text-ink-400 tnum self-center">{kpis.length} record{kpis.length === 1 ? "" : "s"}</span>
        </div>
        <Table>
          <thead>
            <tr>
              <Th>KPI</Th><Th>Owner</Th><Th>Department</Th><Th>Period</Th><Th align="right">Target</Th><Th align="right">Actual</Th><Th align="right">Achievement</Th><Th align="right">Weight</Th><Th align="right">Final</Th><Th>Status</Th><Th>Approver</Th><Th align="right">Ver.</Th>
            </tr>
          </thead>
          <tbody>
            {kpis.length === 0 && (
              <tr><Td className="text-center text-ink-500 py-10">No KPIs for {deptName?.toLowerCase()} in {allPeriods ? "any period" : period.label}. Try another period or department.</Td>{Array.from({ length: 11 }).map((_, i) => <Td key={i} />)}</tr>
            )}
            {kpis.map((k) => (
              <tr key={k.id} className={`hover:bg-surface/70 ${k.deletedAt ? "opacity-60" : ""}`}>
                <Td className="min-w-[180px]">
                  <Link href={k.status === "SUBMITTED" && !k.deletedAt ? `/pending-requests?open=${k.id}&all=1` : `/my-kpi/${k.id}`} className="font-medium text-ink-900 hover:text-brand-700">{k.name}</Link>
                  {k.deletedAt && <div className="text-[11px] text-red-600">deleted</div>}
                </Td>
                <Td><div className="whitespace-nowrap">{k.owner.fullName}</div><div className="text-[11.5px] text-ink-400 font-mono">{k.owner.employeeId}{k.owner.role === ROLES.DEPARTMENT_HEAD ? " · Dept Head" : ""}</div></Td>
                <Td className="whitespace-nowrap">{k.owner.department?.name ?? "—"}</Td>
                <Td className="whitespace-nowrap">{MONTHS_SHORT[k.periodMonth - 1]} {k.periodYear}</Td>
                <Td align="right" mono>{fmtNum(k.target)}</Td>
                <Td align="right" mono>{fmtNum(k.actual)}</Td>
                <Td align="right" mono>{fmtPct(k.achievement)}</Td>
                <Td align="right" mono>{fmtNum(k.weight)}%</Td>
                <Td align="right" mono>{k.finalScore === null ? <span className="text-ink-300">—</span> : fmtNum(k.finalScore)}</Td>
                <Td><StatusBadge status={k.status} /></Td>
                <Td className="whitespace-nowrap">{k.approver.fullName}</Td>
                <Td align="right" mono><Link href={`/admin/versions?kpi=${k.id}`} className="text-brand-700 hover:underline">v{k.currentVersion}</Link></Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}

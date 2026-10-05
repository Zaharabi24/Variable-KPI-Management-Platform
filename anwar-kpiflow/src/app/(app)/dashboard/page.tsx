import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ClipboardList, Inbox, XCircle, Users } from "lucide-react";
import { requireRole, isSuperAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { departmentDashboard, parsePeriod, stageDashboard, type AdminStage } from "@/lib/reporting";
import { filterOptions } from "@/lib/kpi-data";
import { PageHeader, Card, CardHeader, StatTile, ProgressBar, EmptyState } from "@/components/ui/card";
import { Table, Th, Td } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { PeriodFilter } from "@/components/kpi/period-filter";
import { DepartmentPicker } from "@/components/kpi/department-picker";
import { StageDashboardView } from "@/components/kpi/stage-dashboard";
import { fmtNum } from "@/lib/calc";
import { MONTHS_SHORT, ROLES } from "@/lib/constants";
import { KPI_SELF_MAX, STAGE_STATUSES } from "@/lib/kpi";

export const metadata: Metadata = { title: "Dashboard" };

const ADMIN_STAGE: Record<string, AdminStage> = { [ROLES.HR_ADMIN]: "HR", [ROLES.FINANCE_ADMIN]: "FINANCE", [ROLES.AUDIT_ADMIN]: "AUDIT" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireRole(ROLES.DEPARTMENT_HEAD, ROLES.SUPER_ADMIN, ROLES.HR_ADMIN, ROLES.FINANCE_ADMIN, ROLES.AUDIT_ADMIN);
  const sp = await searchParams;
  const period = parsePeriod(sp);

  // HR Admin, Finance Admin and Audit Admin: the dashboard of their own stage, across every department.
  const stage = ADMIN_STAGE[user.role];
  if (stage) {
    // These dashboards open on the whole year, which is what the trend charts need; the filter narrows it.
    const stagePeriod = sp.type ? period : parsePeriod({ ...sp, type: "YEARLY" });
    const options = await filterOptions();
    const filters = { bu: options.businessUnits.some((b) => b.id === sp.bu) ? sp.bu! : "", dept: options.departments.some((d) => d.id === sp.dept) ? sp.dept! : "" };
    return <StageDashboardView data={await stageDashboard(stage, stagePeriod, filters)} filters={filters} options={options} />;
  }

  const superAdmin = isSuperAdmin(user);
  const departments = superAdmin ? await db.department.findMany({ orderBy: { name: "asc" } }) : [];
  const deptId = superAdmin ? (sp.dept && departments.some((d) => d.id === sp.dept) ? sp.dept : null) : user.departmentId;
  const dash = await departmentDashboard(user, deptId, period);
  const deptName = superAdmin ? (deptId ? departments.find((d) => d.id === deptId)?.name : "All departments") : user.department?.name;
  const avg = dash.averageKpiScore;

  const orgCounts = superAdmin
    ? await Promise.all([
        db.user.count({ where: { role: ROLES.DEPARTMENT_HEAD, status: { not: "DEACTIVATED" } } }),
        db.user.count({ where: { role: ROLES.EMPLOYEE, status: { not: "DEACTIVATED" } } }),
        db.user.count({ where: { status: "PENDING_SETUP" } }),
      ])
    : null;

  return (
    <>
      <PageHeader
        title={superAdmin ? "Group Dashboard" : `${deptName} Dashboard`}
        subtitle={`${deptName} · ${period.label}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {superAdmin && <DepartmentPicker departments={departments} value={deptId ?? ""} />}
            <PeriodFilter period={period} />
          </div>
        }
      />

      {superAdmin && orgCounts && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <Link href="/admin/department-heads" className="card card-lift p-4 flex items-center gap-3 hover:border-brand-200">
            <Users className="h-5 w-5 text-brand-700" /><div><div className="text-[12px] text-ink-500">Department Heads</div><div className="font-mono tnum text-[18px] font-semibold">{orgCounts[0]}</div></div>
          </Link>
          <Link href="/admin/employees" className="card card-lift p-4 flex items-center gap-3 hover:border-brand-200">
            <Users className="h-5 w-5 text-brand-700" /><div><div className="text-[12px] text-ink-500">Employees</div><div className="font-mono tnum text-[18px] font-semibold">{orgCounts[1]}</div></div>
          </Link>
          <Link href="/admin/department-heads" className="card card-lift p-4 flex items-center gap-3 hover:border-brand-200">
            <Inbox className="h-5 w-5 text-amber-600" /><div><div className="text-[12px] text-ink-500">Pending invitations</div><div className="font-mono tnum text-[18px] font-semibold">{orgCounts[2]}</div></div>
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatTile label="Average KPI Score" value={avg === null ? "—" : fmtNum(avg)} hint={avg === null ? "No HR-approved KPI this period" : `Average Total Score across ${dash.employees} team member${dash.employees === 1 ? "" : "s"}`}>
          <ProgressBar value={avg ?? 0} tone={avg === null ? "brand" : avg >= 90 ? "green" : avg >= 70 ? "amber" : "red"} />
        </StatTile>
        <Link href="/kpi-requests?show=pending" className="block h-full">
          <StatTile label="Pending Evaluations" value={dash.pending} tone={dash.pending > 0 ? "warn" : "default"} hint={<span className="inline-flex items-center gap-1 text-brand-700 font-medium">Open the queue <ArrowRight className="h-3.5 w-3.5" /></span>} />
        </Link>
        <StatTile label="Total Approved KPIs" value={dash.approved} tone="good" hint="Approved by the Department Head" />
        <StatTile label="Rejected KPIs" value={dash.rejected} tone={dash.rejected > 0 ? "bad" : "default"} hint={`${dash.returned} returned for correction`} />
      </div>

      <Card>
        <CardHeader
          title="Team KPIs"
          subtitle={`Every KPI submitted for ${period.label}, with its score and where it is in the approval chain.`}
          action={<span className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-500"><ClipboardList className="h-4 w-4" />{dash.kpis.length} KPI{dash.kpis.length === 1 ? "" : "s"}</span>}
        />
        {dash.kpis.length === 0 ? (
          <EmptyState icon={<ClipboardList className="h-5 w-5" />} title="No KPI submitted for this period" description={`Nobody in ${deptName ?? "the department"} has submitted a KPI for ${period.label} yet.`} />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Employee</Th><Th>Employee ID</Th><Th>KPI month</Th><Th align="right">KPI (5)</Th><Th align="right">Total Score</Th><Th>Status</Th><Th></Th>
              </tr>
            </thead>
            <tbody>
              {dash.kpis.map((k) => {
                const waiting = (STAGE_STATUSES.DEPT as string[]).includes(k.status);
                const kpiScore = k.kpiScore ?? k.selfScore;
                return (
                  <tr key={k.id}>
                    <Td><div className="font-medium">{k.owner.fullName}</div><div className="text-[11.5px] text-ink-400">{k.owner.department}</div></Td>
                    <Td mono>{k.owner.employeeId}</Td>
                    <Td className="whitespace-nowrap">{MONTHS_SHORT[k.periodMonth - 1]} {k.periodYear}</Td>
                    <Td align="right" mono>{kpiScore === null ? "—" : fmtNum(kpiScore)}<span className="text-ink-400 text-[11.5px]"> / {KPI_SELF_MAX}</span></Td>
                    <Td align="right" mono>{k.totalScore === null ? <span className="text-ink-400">—</span> : <span className={k.totalScore < 70 ? "text-red-600" : k.totalScore < 90 ? "text-amber-700" : "text-emerald-700"}>{fmtNum(k.totalScore)}</span>}</Td>
                    <Td><StatusBadge status={k.status} /></Td>
                    <Td align="right"><Link href={waiting ? `/kpi-requests?open=${k.id}` : `/my-kpi/${k.id}`} className="text-[13px] font-medium text-brand-700 hover:underline whitespace-nowrap">{waiting ? "Review →" : "Open →"}</Link></Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      {dash.rejected > 0 && (
        <p className="mt-4 text-[12.5px] text-ink-400 inline-flex items-center gap-1.5"><XCircle className="h-3.5 w-3.5" /> Rejected KPIs are excluded from every score and average.</p>
      )}
    </>
  );
}

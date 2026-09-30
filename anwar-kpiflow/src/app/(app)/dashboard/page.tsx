import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, Inbox, XCircle, Users } from "lucide-react";
import { requireRole, isSuperAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { departmentDashboard, parsePeriod } from "@/lib/reporting";
import { PageHeader, Card, CardHeader, StatTile, ProgressBar, EmptyState } from "@/components/ui/card";
import { Table, Th, Td } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { PeriodFilter } from "@/components/kpi/period-filter";
import { DepartmentPicker } from "@/components/kpi/department-picker";
import { fmtNum, fmtPct } from "@/lib/calc";
import { ROLES } from "@/lib/constants";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireRole(ROLES.DEPARTMENT_HEAD, ROLES.SUPER_ADMIN);
  const sp = await searchParams;
  const period = parsePeriod(sp);
  const superAdmin = isSuperAdmin(user);

  const departments = superAdmin ? await db.department.findMany({ orderBy: { name: "asc" } }) : [];
  const deptId = superAdmin ? (sp.dept && departments.some((d) => d.id === sp.dept) ? sp.dept : null) : user.departmentId;
  const dash = await departmentDashboard(deptId, period);
  const deptName = superAdmin ? (deptId ? departments.find((d) => d.id === deptId)?.name : "All departments") : user.department?.name;

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
          <Link href="/admin/department-heads" className="card p-4 flex items-center gap-3 hover:border-brand-200 transition-colors">
            <Users className="h-5 w-5 text-brand-700" /><div><div className="text-[12px] text-ink-500">Department Heads</div><div className="font-mono tnum text-[18px] font-semibold">{orgCounts[0]}</div></div>
          </Link>
          <Link href="/admin/employees" className="card p-4 flex items-center gap-3 hover:border-brand-200 transition-colors">
            <Users className="h-5 w-5 text-brand-700" /><div><div className="text-[12px] text-ink-500">Employees</div><div className="font-mono tnum text-[18px] font-semibold">{orgCounts[1]}</div></div>
          </Link>
          <Link href="/admin/department-heads" className="card p-4 flex items-center gap-3 hover:border-brand-200 transition-colors">
            <Inbox className="h-5 w-5 text-amber-600" /><div><div className="text-[12px] text-ink-500">Pending invitations</div><div className="font-mono tnum text-[18px] font-semibold">{orgCounts[2]}</div></div>
          </Link>
        </div>
      )}

      {/* FR-DD-02..05 */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatTile label="Average Achievement" value={dash.averageAchievement === null ? "—" : fmtPct(dash.averageAchievement)} hint={dash.averageAchievement === null ? "No approved KPIs this period" : `Across ${dash.employees.length} team member${dash.employees.length === 1 ? "" : "s"}`}>
          <ProgressBar value={dash.averageAchievement ?? 0} tone={dash.averageAchievement === null ? "brand" : dash.averageAchievement >= 90 ? "green" : dash.averageAchievement >= 70 ? "amber" : "red"} />
        </StatTile>
        <Link href="/pending-requests" className="block h-full">
          <StatTile label="Pending Evaluations" value={dash.pending} tone={dash.pending > 0 ? "warn" : "default"} hint={<span className="inline-flex items-center gap-1 text-brand-700 font-medium">Open the queue <ArrowRight className="h-3.5 w-3.5" /></span>} />
        </Link>
        <StatTile label="Total Approved KPIs" value={dash.approved} tone="good" hint="Approved + Adjusted" />
        <StatTile label="Rejected KPIs" value={dash.rejected} tone={dash.rejected > 0 ? "bad" : "default"} hint={`${dash.returned} returned for correction`} />
      </div>

      {/* FR-DD-06 */}
      <Card>
        <CardHeader
          title="KPIs below target"
          subtitle="Actual is below Target (achievement under 100%). Follow up with the employee."
          action={<span className="inline-flex items-center gap-1.5 text-[12.5px] text-amber-700"><AlertTriangle className="h-4 w-4" />{dash.belowTarget.length} KPI{dash.belowTarget.length === 1 ? "" : "s"}</span>}
        />
        {dash.belowTarget.length === 0 ? (
          <EmptyState icon={<CheckCircle2 className="h-5 w-5" />} title="Every KPI met its target" description={`No KPI in ${period.label} has an actual below its target.`} />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Employee</Th><Th>Employee ID</Th><Th>KPI</Th><Th align="right">Target</Th><Th align="right">Actual</Th><Th align="right">Achievement</Th><Th>Status</Th><Th></Th>
              </tr>
            </thead>
            <tbody>
              {dash.belowTarget.map((k) => (
                <tr key={k.id} className="hover:bg-surface/70">
                  <Td><div className="font-medium">{k.owner.fullName}</div><div className="text-[11.5px] text-ink-400">{k.owner.department?.name}</div></Td>
                  <Td mono>{k.owner.employeeId}</Td>
                  <Td>{k.name}</Td>
                  <Td align="right" mono>{fmtNum(k.target)} {k.unit}</Td>
                  <Td align="right" mono>{fmtNum(k.actual)} {k.unit}</Td>
                  <Td align="right" mono><span className={k.achievement < 70 ? "text-red-600" : "text-amber-700"}>{fmtPct(k.achievement)}</span></Td>
                  <Td><StatusBadge status={k.status} /></Td>
                  <Td align="right"><Link href={k.status === "SUBMITTED" ? `/pending-requests?open=${k.id}` : `/my-kpi/${k.id}`} className="text-[13px] font-medium text-brand-700 hover:underline whitespace-nowrap">Open →</Link></Td>
                </tr>
              ))}
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

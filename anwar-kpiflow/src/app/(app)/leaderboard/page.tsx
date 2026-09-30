import type { Metadata } from "next";
import { Trophy } from "lucide-react";
import { requireRole, isSuperAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { departmentLeaderboard, parsePeriod } from "@/lib/reporting";
import { PageHeader, Card, CardHeader, EmptyState } from "@/components/ui/card";
import { PeriodFilter } from "@/components/kpi/period-filter";
import { DepartmentPicker } from "@/components/kpi/department-picker";
import { LEADERBOARD_BANDS, ROLES } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Leaderboard" };

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireRole(ROLES.DEPARTMENT_HEAD, ROLES.SUPER_ADMIN);
  const sp = await searchParams;
  const period = parsePeriod(sp);
  const superAdmin = isSuperAdmin(user);
  const departments = superAdmin ? await db.department.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { users: { where: { role: ROLES.EMPLOYEE, status: "ACTIVE" } } } } } }) : [];
  const busiest = [...departments].sort((a, b) => b._count.users - a._count.users)[0];
  const deptId = superAdmin ? (sp.dept && departments.some((d) => d.id === sp.dept) ? sp.dept : busiest?.id ?? null) : user.departmentId;
  const deptName = superAdmin ? departments.find((d) => d.id === deptId)?.name : user.department?.name;
  const rows = deptId ? await departmentLeaderboard(deptId, period) : [];

  return (
    <>
      <PageHeader
        title="Leaderboard"
        subtitle={`${deptName ?? "Department"} · ranked by Average Achievement · ${period.label}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {superAdmin && <DepartmentPicker departments={departments} value={deptId ?? ""} allLabel={null} />}
            <PeriodFilter period={period} />
          </div>
        }
      />
      <Card>
        <CardHeader
          title="Department ranking"
          subtitle={`Approved and Adjusted KPIs only · bands: high ≥ ${LEADERBOARD_BANDS.high}% · middle ≥ ${LEADERBOARD_BANDS.middle}% · low below`}
        />
        {rows.length === 0 ? (
          <EmptyState icon={<Trophy className="h-5 w-5" />} title="No ranked employees yet" description={`No employee in ${deptName ?? "this department"} has an approved KPI in ${period.label}.`} />
        ) : (
          <ol className="px-5 pb-5 grid gap-x-8 gap-y-5 md:grid-cols-2">
            {rows.map((r) => {
              const color = r.band === "high" ? "text-emerald-700" : r.band === "middle" ? "text-amber-700" : "text-red-600";
              const bar = r.band === "high" ? "bg-emerald-600" : r.band === "middle" ? "bg-amber-500" : "bg-red-500";
              return (
                <li key={r.userId} className="flex items-start gap-3">
                  <span className={cn("h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-[13px] font-bold tnum", r.rank === 1 ? "bg-amber-100 text-amber-800" : r.rank <= 3 ? "bg-ink-100 text-ink-700" : "bg-white border border-ink-200 text-ink-500")}>
                    {r.rank}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[14px] font-semibold text-ink-900 truncate">{r.name}</div>
                        <div className="text-[12px] text-ink-500 truncate">{r.designation} · {r.kpiCount} approved KPI{r.kpiCount === 1 ? "" : "s"}</div>
                      </div>
                      <div className={cn("font-mono tnum text-[15px] font-semibold", color)}>{r.achievement.toFixed(1)}%</div>
                    </div>
                    <div className="mt-2 h-2 w-full rounded-full bg-ink-100 overflow-hidden" role="progressbar" aria-valuenow={Math.min(100, r.achievement)} aria-valuemin={0} aria-valuemax={100} aria-label={`${r.name} achievement`}>
                      <div className={cn("h-full rounded-full", bar)} style={{ width: `${Math.min(100, r.achievement)}%` }} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Card>
    </>
  );
}

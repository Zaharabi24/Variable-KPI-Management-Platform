import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser, homeFor } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { canSeePayment, reviewStagesFor, todayBd } from "@/lib/kpi";
import { filterOptions, requestQueue } from "@/lib/kpi-data";
import { averageScore, parsePeriod } from "@/lib/reporting";
import { RequestBoard, type BoardFilters } from "./request-board";

export const metadata: Metadata = { title: "KPI Requests" };

const COPY: Record<string, { title: string; subtitle: string }> = {
  [ROLES.DEPARTMENT_HEAD]: { title: "KPI Pending Request", subtitle: "Review your team's KPIs: adjust the score breakdown if needed, add your scores, then approve, return or reject." },
  [ROLES.HR_ADMIN]: { title: "KPI Request", subtitle: "Every department's KPI requests. Add Attendance, Remarks, HR Note and the Payment Amount; approving sends the KPI to the Finance Admin." },
  [ROLES.FINANCE_ADMIN]: { title: "KPI Request", subtitle: "KPIs approved by the HR Admin. Approve to send to the Audit Admin, or reject and return to the HR Admin with remarks." },
  [ROLES.AUDIT_ADMIN]: { title: "KPI Request", subtitle: "KPIs approved by the Finance Admin. Complete the audit review, or return to the Finance Admin with remarks." },
  [ROLES.SUPER_ADMIN]: { title: "KPI Requests", subtitle: "Every KPI request at every stage of the approval chain. You can act at any stage." },
};

export default async function KpiRequestsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser();
  if (reviewStagesFor(user).length === 0) redirect(homeFor(user.role));
  const sp = await searchParams;

  const type = (["MONTHLY", "QUARTERLY", "YEARLY"].includes(sp.type ?? "") ? sp.type : "") as BoardFilters["type"];
  const period = type ? parsePeriod(sp) : null;
  const today = todayBd();
  const filters: BoardFilters = {
    bu: sp.bu ?? "",
    dept: user.role === ROLES.DEPARTMENT_HEAD ? "" : (sp.dept ?? ""),
    show: sp.show === "pending" ? "pending" : "all",
    type,
    year: period?.year ?? today.getUTCFullYear(),
    month: period?.type === "MONTHLY" ? period.index : today.getUTCMonth() + 1,
    quarter: period?.type === "QUARTERLY" ? period.index : Math.floor(today.getUTCMonth() / 3) + 1,
    q: sp.q ?? "",
  };

  const [rows, options] = await Promise.all([
    requestQueue(user, { bu: filters.bu, dept: filters.dept, show: filters.show, period, q: filters.q }),
    filterOptions(),
  ]);
  const copy = COPY[user.role];

  return (
    <RequestBoard
      title={copy.title}
      subtitle={`${copy.subtitle}${period ? ` · ${period.label}` : ""}`}
      rows={rows}
      filters={filters}
      options={options}
      showDepartmentFilter={user.role !== ROLES.DEPARTMENT_HEAD}
      showPayment={canSeePayment(user)}
      canDelete={user.role === ROLES.SUPER_ADMIN ? "all" : user.role === ROLES.DEPARTMENT_HEAD ? "actionable" : "none"}
      currentYear={today.getUTCFullYear()}
      openId={sp.open ?? null}
      averageScore={averageScore(rows)}
    />
  );
}

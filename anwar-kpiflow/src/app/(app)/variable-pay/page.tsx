import type { Metadata } from "next";
import { requireRole, isDeptHead } from "@/lib/auth";
import { MONTHS, ROLES } from "@/lib/constants";
import { isFuturePeriod, isHrReviewer, todayBd } from "@/lib/variable-pay";
import { departmentSheet, hrSheet } from "@/lib/variable-pay-data";
import { VariablePayBoard } from "./variable-pay-board";

export const metadata: Metadata = { title: "Variable Pay" };

export default async function VariablePayPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireRole(ROLES.DEPARTMENT_HEAD, ROLES.SUPER_ADMIN);
  const sp = await searchParams;
  const today = todayBd();
  const y = Number(sp.year);
  const m = Number(sp.month);
  const year = y >= 2000 && y <= 2100 ? y : today.getUTCFullYear();
  const month = m >= 1 && m <= 12 ? m : today.getUTCMonth() + 1;

  const hr = isHrReviewer(user);
  const head = isDeptHead(user) && !!user.departmentId;
  // A Department Head evaluates their own department; HR additionally reviews every department's submissions.
  const mode: "department" | "hr" = hr && (!head || sp.scope === "hr") ? "hr" : "department";

  const sheet = mode === "department" ? await departmentSheet(user.departmentId!, user.fullName, year, month) : { rows: await hrSheet(year, month), roster: [] };

  return (
    <VariablePayBoard
      key={`${mode}-${year}-${month}`}
      mode={mode}
      canSwitchScope={hr && head}
      rows={sheet.rows}
      roster={sheet.roster}
      year={year}
      month={month}
      currentYear={today.getUTCFullYear()}
      periodLabel={`Month of ${MONTHS[month - 1]}, ${year}`}
      future={isFuturePeriod(year, month)}
      scopeLabel={mode === "hr" ? "All departments" : user.department?.name ?? ""}
    />
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser, homeFor } from "@/lib/auth";
import { MONTHS } from "@/lib/constants";
import { isFinanceMember, isFuturePeriod, isHrReviewer, isVpApprover } from "@/lib/variable-pay";
import { departmentSheet, filterOptions, requestList, resolveVpView } from "@/lib/variable-pay-data";
import { VariablePayBoard } from "./variable-pay-board";

export const metadata: Metadata = { title: "Variable Pay" };

export default async function VariablePayPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser();
  const view = resolveVpView(user, await searchParams);
  if (!view.mode) redirect(homeFor(user.role));
  const { mode, year, month, filters } = view;

  // Department Head: their department's month sheet. Super Admin / HR and Finance: every matching request, all periods by default.
  const [sheet, options] =
    mode === "department"
      ? [await departmentSheet(user.departmentId!, user.fullName, year, month), { departments: [], businessUnits: [] }]
      : await Promise.all([requestList(mode, filters).then((rows) => ({ rows, roster: [] })), filterOptions()]);

  return (
    <VariablePayBoard
      key={mode}
      mode={mode}
      scopes={view.scopes}
      rows={sheet.rows}
      roster={sheet.roster}
      year={year}
      month={month}
      currentYear={view.currentYear}
      periodLabel={`Month of ${MONTHS[month - 1]}, ${year}`}
      future={isFuturePeriod(year, month)}
      departmentName={user.department?.name ?? ""}
      filters={filters}
      options={options}
      caps={{
        decide: mode === "review" && isVpApprover(user),
        hrNote: mode === "review" && isHrReviewer(user),
        pay: mode === "finance" && isFinanceMember(user),
      }}
      viewerId={user.id}
    />
  );
}

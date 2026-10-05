import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser, homeFor } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/card";
import { MyKpiBoard } from "@/components/kpi/my-kpi-board";
import { ROLES } from "@/lib/constants";
import { IN_PROGRESS_STATUSES, KPI_STATUS, isScored, ownsKpis } from "@/lib/kpi";
import { myKpis } from "@/lib/kpi-data";
import { approverOptions } from "@/lib/kpi-service";

export const metadata: Metadata = { title: "My KPI" };

export default async function MyKpiPage() {
  const user = await requireUser();
  if (!ownsKpis(user)) redirect(homeFor(user.role));

  const [kpis, approvers] = await Promise.all([myKpis(user), approverOptions(db, user)]);
  const approverLabel =
    user.role === ROLES.DEPARTMENT_HEAD
      ? "A Department Head's own KPI is approved by the Super Admin."
      : `Department Heads of ${user.department?.name ?? "your department"}`;

  const count = (test: (s: string) => boolean) => kpis.filter((k) => test(k.status)).length;
  const drafts = count((s) => s === KPI_STATUS.DRAFT);
  const returned = count((s) => s === KPI_STATUS.RETURNED);
  const inReview = count((s) => (IN_PROGRESS_STATUSES as string[]).includes(s) && s !== KPI_STATUS.RETURNED && !isScored(s));
  const approved = count(isScored);

  return (
    <>
      <PageHeader
        title="My KPI"
        subtitle={<>{drafts} draft{drafts === 1 ? "" : "s"} · {inReview} in review · {approved} approved · {returned} returned for correction</>}
      />
      <MyKpiBoard
        kpis={kpis}
        owner={{ fullName: user.fullName, employeeId: user.employeeId }}
        approvers={approvers.map((a) => ({ id: a.id, fullName: a.fullName, designation: a.designation }))}
        approverLabel={approverLabel}
      />
    </>
  );
}

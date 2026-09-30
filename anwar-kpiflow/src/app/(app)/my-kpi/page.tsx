import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser, isSuperAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { approverOptionsFor } from "@/actions/kpi";
import { PageHeader } from "@/components/ui/card";
import { MyKpiBoard } from "@/components/kpi/my-kpi-board";
import { ROLES } from "@/lib/constants";

export const metadata: Metadata = { title: "My KPI" };

export default async function MyKpiPage() {
  const user = await requireUser();
  if (isSuperAdmin(user)) redirect("/dashboard");

  const [kpis, approvers] = await Promise.all([
    db.kpi.findMany({ where: { ownerId: user.id, deletedAt: null }, orderBy: [{ submittedAt: "desc" }] }),
    approverOptionsFor(user),
  ]);

  const approverLabel =
    user.role === ROLES.DEPARTMENT_HEAD
      ? "Department Heads' own KPIs are approved by the Super Admin."
      : `Department Heads of ${user.department?.name ?? "your department"}`;

  const counts = {
    submitted: kpis.filter((k) => k.status === "SUBMITTED").length,
    approved: kpis.filter((k) => k.status === "APPROVED" || k.status === "ADJUSTED").length,
    returned: kpis.filter((k) => k.status === "RETURNED").length,
  };

  return (
    <>
      <PageHeader
        title="My KPI"
        subtitle={
          <>
            {counts.submitted} in review · {counts.approved} approved · {counts.returned} returned for correction
          </>
        }
      />
      <MyKpiBoard
        kpis={kpis.map((k) => ({
          id: k.id, name: k.name, status: k.status, category: k.category, weight: k.weight, target: k.target, actual: k.actual,
          unit: k.unit, calculatedScore: k.calculatedScore, finalScore: k.finalScore, periodYear: k.periodYear, periodMonth: k.periodMonth,
        }))}
        approvers={approvers.map((a) => ({ id: a.id, fullName: a.fullName, designation: a.designation }))}
        approverLabel={approverLabel}
      />
    </>
  );
}

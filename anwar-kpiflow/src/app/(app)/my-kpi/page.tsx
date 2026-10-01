import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser, isSuperAdmin, isSystemAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { approverOptionsFor } from "@/actions/kpi";
import { PageHeader } from "@/components/ui/card";
import { MyKpiBoard } from "@/components/kpi/my-kpi-board";
import type { KpiFormInitial } from "@/components/kpi/kpi-form";
import { ROLES } from "@/lib/constants";

export const metadata: Metadata = { title: "My KPI" };

export default async function MyKpiPage() {
  const user = await requireUser();
  if (isSuperAdmin(user) || isSystemAdmin(user)) redirect(user.role === ROLES.SYSTEM_ADMIN ? "/admin/employees" : "/dashboard");

  const [kpis, approvers] = await Promise.all([
    db.kpi.findMany({
      where: { ownerId: user.id, deletedAt: null },
      include: { evidence: { select: { fileName: true } } },
      orderBy: [{ submittedAt: "desc" }],
    }),
    approverOptionsFor(user),
  ]);

  const approverLabel =
    user.role === ROLES.DEPARTMENT_HEAD
      ? "Department Heads' own KPIs are approved by the Super Admin."
      : `Department Heads of ${user.department?.name ?? "your department"}`;

  const counts = {
    drafts: kpis.filter((k) => k.status === "DRAFT").length,
    submitted: kpis.filter((k) => k.status === "SUBMITTED").length,
    approved: kpis.filter((k) => k.status === "APPROVED" || k.status === "ADJUSTED").length,
    returned: kpis.filter((k) => k.status === "RETURNED").length,
  };

  // Drafts first, then newest submissions
  const ordered = [...kpis].sort((a, b) => Number(b.status === "DRAFT") - Number(a.status === "DRAFT"));
  const drafts: Record<string, KpiFormInitial> = {};
  for (const k of ordered) {
    if (k.status !== "DRAFT") continue;
    drafts[k.id] = {
      id: k.id, name: k.name, category: k.category, periodYear: k.periodYear, periodMonth: k.periodMonth, target: k.target,
      actual: k.actual > 0 ? k.actual : null, unit: k.unit, weight: k.weight > 0 ? k.weight : null, remarks: k.remarks,
      approverId: k.approverId, status: k.status, returnRemarks: null, evidenceNames: k.evidence.map((e) => e.fileName),
    };
  }

  return (
    <>
      <PageHeader
        title="My KPI"
        subtitle={
          <>
            {counts.drafts} draft{counts.drafts === 1 ? "" : "s"} · {counts.submitted} in review · {counts.approved} approved · {counts.returned} returned for correction
          </>
        }
      />
      <MyKpiBoard
        kpis={ordered.map((k) => ({
          id: k.id, name: k.name, status: k.status, category: k.category, weight: k.weight, target: k.target, actual: k.actual,
          unit: k.unit, calculatedScore: k.calculatedScore, finalScore: k.finalScore, periodYear: k.periodYear, periodMonth: k.periodMonth,
          draftProgress: k.status === "DRAFT" ? { target: true, actual: k.actual > 0, evidence: k.evidence.length > 0 } : undefined,
        }))}
        drafts={drafts}
        approvers={approvers.map((a) => ({ id: a.id, fullName: a.fullName, designation: a.designation }))}
        approverLabel={approverLabel}
      />
    </>
  );
}

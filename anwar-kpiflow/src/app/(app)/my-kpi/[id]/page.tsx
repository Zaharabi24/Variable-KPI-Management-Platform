import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser, canViewKpi } from "@/lib/auth";
import { db } from "@/lib/db";
import { approverOptionsFor } from "@/actions/kpi";
import { KpiDetailHeader, KpiDetailBody, BackLink } from "@/components/kpi/kpi-detail";
import { ResubmitButton } from "./resubmit-button";
import { isSuperAdmin, isDeptHead } from "@/lib/auth";

export const metadata: Metadata = { title: "KPI Details" };

export default async function KpiDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const kpi = await db.kpi.findUnique({
    where: { id },
    include: {
      owner: { include: { department: true } },
      approver: true,
      evidence: { orderBy: { createdAt: "asc" } },
      versions: { include: { changedBy: true }, orderBy: { versionNo: "asc" } },
    },
  });
  // Access guard (AC-06): department scoping enforced on the server, not the UI.
  if (!kpi || (kpi.deletedAt && !isSuperAdmin(user)) || !canViewKpi(user, kpi)) notFound();

  const own = kpi.ownerId === user.id;
  const approvers = own && kpi.status === "RETURNED" ? await approverOptionsFor(user) : [];
  const backHref = own ? "/my-kpi" : isSuperAdmin(user) ? "/admin/kpis" : "/pending-requests";
  const backLabel = own ? "My KPI" : isSuperAdmin(user) ? "All KPIs" : "KPI Pending Request";

  return (
    <>
      <BackLink href={backHref} label={backLabel} />
      <KpiDetailHeader
        kpi={kpi}
        actions={
          own && kpi.status === "RETURNED" ? (
            <ResubmitButton
              initial={{
                id: kpi.id, name: kpi.name, category: kpi.category, periodYear: kpi.periodYear, periodMonth: kpi.periodMonth,
                target: kpi.target, actual: kpi.actual, unit: kpi.unit, weight: kpi.weight, remarks: kpi.remarks, approverId: kpi.approverId,
                status: kpi.status, returnRemarks: kpi.returnRemarks, evidenceNames: kpi.evidence.map((e) => e.fileName),
              }}
              approvers={approvers.map((a) => ({ id: a.id, fullName: a.fullName, designation: a.designation }))}
              approverLabel={isDeptHead(user) ? "Approved by the Super Admin" : `Department Heads of ${user.department?.name ?? "your department"}`}
            />
          ) : null
        }
      />
      {kpi.deletedAt && (
        <div className="mb-5 rounded-xl border border-ink-200 bg-ink-100/60 px-4 py-3 text-[13.5px] text-ink-700">
          This KPI was deleted and is visible only in version history. Reason: {kpi.deleteReason}
        </div>
      )}
      <KpiDetailBody kpi={kpi} />
    </>
  );
}

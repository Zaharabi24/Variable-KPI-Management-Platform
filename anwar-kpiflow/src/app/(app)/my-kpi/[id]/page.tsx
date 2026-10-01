import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser, canViewKpi, canChangeTarget, isSuperAdmin, isSystemAdmin, isDeptHead } from "@/lib/auth";
import { db } from "@/lib/db";
import { approverOptionsFor } from "@/actions/kpi";
import { KpiDetailHeader, KpiDetailBody, BackLink } from "@/components/kpi/kpi-detail";
import { ResubmitButton, ChangeTargetButton } from "./resubmit-button";

export const metadata: Metadata = { title: "KPI Details" };

export default async function KpiDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const kpi = await db.kpi.findUnique({
    where: { id },
    include: {
      owner: { include: { department: true } },
      approver: true,
      evidence: { orderBy: { createdAt: "asc" }, omit: { data: true } },
      versions: { include: { changedBy: true }, orderBy: { versionNo: "asc" } },
    },
  });
  // Access guard (AC-06): department scoping enforced on the server, not the UI.
  if (!kpi || (kpi.deletedAt && !isSuperAdmin(user)) || !canViewKpi(user, kpi)) notFound();

  const own = kpi.ownerId === user.id;
  const editable = own && (kpi.status === "RETURNED" || kpi.status === "DRAFT");
  const approvers = editable ? await approverOptionsFor(user) : [];
  const targetChange = canChangeTarget(user, kpi) && ["DRAFT", "SUBMITTED", "RETURNED"].includes(kpi.status);
  const backHref = own ? "/my-kpi" : isSuperAdmin(user) || isSystemAdmin(user) ? "/admin/kpis" : "/pending-requests";
  const backLabel = own ? "My KPI" : isSuperAdmin(user) || isSystemAdmin(user) ? "All KPIs" : "KPI Pending Request";

  return (
    <>
      <BackLink href={backHref} label={backLabel} />
      <KpiDetailHeader
        kpi={kpi}
        actions={
          <>
            {targetChange && <ChangeTargetButton kpiId={kpi.id} currentTarget={kpi.target} unit={kpi.unit} />}
            {editable && (
              <ResubmitButton
                mode={kpi.status === "DRAFT" ? "draft" : "resubmit"}
                initial={{
                  id: kpi.id, name: kpi.name, category: kpi.category, periodYear: kpi.periodYear, periodMonth: kpi.periodMonth,
                  target: kpi.target, actual: kpi.status === "DRAFT" && kpi.actual === 0 ? null : kpi.actual, unit: kpi.unit,
                  weight: kpi.weight > 0 ? kpi.weight : null, remarks: kpi.remarks, approverId: kpi.approverId,
                  status: kpi.status, returnRemarks: kpi.returnRemarks, evidenceNames: kpi.evidence.map((e) => e.fileName),
                }}
                approvers={approvers.map((a) => ({ id: a.id, fullName: a.fullName, designation: a.designation }))}
                approverLabel={isDeptHead(user) ? "Approved by the Super Admin" : `Department Heads of ${user.department?.name ?? "your department"}`}
              />
            )}
          </>
        }
      />
      {kpi.deletedAt && (
        <div className="mb-5 rounded-xl border border-ink-200 bg-ink-100/60 px-4 py-3 text-[13.5px] text-ink-700">
          This KPI was deleted and is visible only in version history. Reason: {kpi.deleteReason}
        </div>
      )}
      {kpi.status === "DRAFT" && (
        <div className="mb-5 rounded-xl border border-ink-200 bg-surface px-4 py-3 text-[13.5px] text-ink-700">
          This KPI is a draft. It has not been sent for review and does not count in any summary. The target is fixed; the other fields can still be edited before submission.
        </div>
      )}
      <KpiDetailBody kpi={kpi} />
    </>
  );
}

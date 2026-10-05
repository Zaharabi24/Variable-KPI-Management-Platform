import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { StatusBadge } from "@/components/ui/badge";
import { KpiSheetReadonly } from "@/components/kpi/kpi-sheet";
import { ROLES } from "@/lib/constants";
import { KPI_STATUS, STATUS_HINTS, kpiTitle, reviewStagesFor } from "@/lib/kpi";
import { getKpiView } from "@/lib/kpi-data";
import { approverOptions } from "@/lib/kpi-service";
import { ResubmitButton } from "./resubmit-button";

export const metadata: Metadata = { title: "KPI Details" };

/**
 * The full KPI form, read-only, with its live status. After submission the employee can view everything
 * they are allowed to see but cannot change anything; the Payment Amount is never part of their view.
 */
export default async function KpiDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  // Access guard: department scoping and role visibility are enforced on the server (lib/kpi-data.ts).
  const kpi = await getKpiView(id, user);
  if (!kpi) notFound();

  const own = kpi.owner.id === user.id;
  const editable = own && (kpi.status === KPI_STATUS.RETURNED || kpi.status === KPI_STATUS.DRAFT);
  const approvers = editable ? await approverOptions(db, user) : [];
  const reviewer = reviewStagesFor(user).length > 0;
  const back = own
    ? { href: "/my-kpi", label: "My KPI" }
    : user.role === ROLES.SYSTEM_ADMIN
      ? { href: "/admin/kpis", label: "All KPIs" }
      : reviewer
        ? { href: "/kpi-requests", label: "KPI Requests" }
        : { href: "/", label: "Home" };

  return (
    <>
      <Link href={back.href} className="inline-flex items-center gap-1 text-[13px] text-ink-500 hover:text-ink-900 mb-3">← {back.label}</Link>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
        <div className="min-w-0">
          <h1 className="text-[24px] leading-8 font-semibold tracking-[-0.022em] text-ink-900 flex flex-wrap items-center gap-2.5">
            KPI · {kpiTitle(kpi)} <StatusBadge status={kpi.status} />
          </h1>
          <p className="text-[13.5px] text-ink-500 mt-1">{kpi.owner.fullName} · <span className="font-mono">{kpi.owner.employeeId}</span>{kpi.owner.department ? ` · ${kpi.owner.department}` : ""} · {STATUS_HINTS[kpi.status]}</p>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {kpi.status !== KPI_STATUS.DRAFT && (
            <a href={`/api/kpi/${kpi.id}/report`} className="btn-outline gap-2 h-9 px-3.5 text-[13px]"><Download className="h-4 w-4" /> Download report</a>
          )}
          {editable && (
            <ResubmitButton
              kpi={kpi}
              owner={{ fullName: user.fullName, employeeId: user.employeeId }}
              approvers={approvers.map((a) => ({ id: a.id, fullName: a.fullName, designation: a.designation }))}
              approverLabel={user.role === ROLES.DEPARTMENT_HEAD ? "A Department Head's own KPI is approved by the Super Admin." : `Department Heads of ${user.department?.name ?? "your department"}`}
            />
          )}
        </div>
      </div>

      {kpi.deleted && (
        <div className="mb-5 rounded-xl border border-ink-200 bg-ink-100/60 px-4 py-3 text-[13.5px] text-ink-700">This KPI was deleted and is visible only in the version history.</div>
      )}
      {kpi.status === KPI_STATUS.DRAFT && (
        <div className="mb-5 rounded-xl border border-ink-200 bg-surface px-4 py-3 text-[13.5px] text-ink-700">This KPI is a draft. It has not been sent for approval and does not count in any summary.</div>
      )}
      {kpi.status === KPI_STATUS.RETURNED && kpi.returnRemarks && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13.5px] text-red-800"><span className="font-semibold">Returned for correction.</span> {kpi.returnRemarks}</div>
      )}
      {kpi.status === KPI_STATUS.REJECTED && kpi.decisionReason && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13.5px] text-red-800"><span className="font-semibold">Rejected.</span> {kpi.decisionReason}</div>
      )}
      {!own && kpi.returnRemarks && kpi.status !== KPI_STATUS.RETURNED && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13.5px] text-amber-900"><span className="font-semibold">Returned with remarks.</span> {kpi.returnRemarks}</div>
      )}
      {own && kpi.status !== KPI_STATUS.DRAFT && kpi.status !== KPI_STATUS.RETURNED && (
        <p className="mb-5 text-[12.5px] text-ink-500">This KPI has been submitted. You can follow its status here; nothing can be changed.</p>
      )}

      <KpiSheetReadonly kpi={kpi} />
    </>
  );
}

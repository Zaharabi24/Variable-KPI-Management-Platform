"use client";

import * as React from "react";
import { Plus, PencilLine } from "lucide-react";
import { KPI_STATUS, type KpiView } from "@/lib/kpi";
import { KpiCard } from "./kpi-card";
import { KpiFormDrawer, type Approver, type KpiFormOwner } from "./kpi-form";

/**
 * One parent card holding the Create KPI tile and the KPI cards.
 * Drafts come first with a "Continue draft" action; a returned KPI offers "Correct and resubmit".
 */
export function MyKpiBoard({
  kpis, owner, approvers, approverLabel,
}: {
  kpis: KpiView[];
  owner: KpiFormOwner;
  approvers: Approver[];
  approverLabel: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<KpiView | null>(null);
  const draftCount = kpis.filter((k) => k.status === KPI_STATUS.DRAFT).length;
  // One KPI per month: a rejected KPI frees its month again.
  const takenPeriods = kpis.filter((k) => k.status !== KPI_STATUS.REJECTED).map((k) => `${k.periodYear}-${k.periodMonth}`);
  return (
    <section className="card">
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div>
          <h2 className="text-[15px] font-semibold">KPI cards</h2>
          <p className="text-[13px] text-ink-500">
            {kpis.length === 0 ? "No KPIs yet — start with the Create KPI card." : `${kpis.length} KPI${kpis.length === 1 ? "" : "s"}${draftCount ? ` · ${draftCount} draft${draftCount === 1 ? "" : "s"} first` : ""} · newest month first`}
          </p>
        </div>
      </div>
      <div className="px-5 pb-5">
        <div className="max-h-[calc(100vh-260px)] min-h-[380px] overflow-y-auto scroll-thin pr-1 -mr-1">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 auto-rows-fr">
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Create KPI"
              className="group h-full min-h-[300px] rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/50 hover:bg-brand-50 hover:border-brand-400 transition-colors flex flex-col items-center justify-center gap-3 p-5 text-brand-700"
            >
              <span className="h-14 w-14 rounded-full bg-white border border-brand-200 shadow-sm flex items-center justify-center group-hover:scale-105 transition-transform">
                <Plus className="h-7 w-7 text-brand-500" />
              </span>
              <span className="text-[15px] font-semibold">Create KPI</span>
              <span className="text-[12.5px] text-brand-700 text-center max-w-[230px]">
                Score your five major tasks for the month. Save as Draft or Submit to your Department Head.
              </span>
            </button>
            {kpis.map((k) => {
              const editable = k.status === KPI_STATUS.DRAFT || k.status === KPI_STATUS.RETURNED;
              return (
                <KpiCard
                  key={k.id}
                  kpi={k}
                  action={
                    editable ? (
                      <button type="button" onClick={() => setEditing(k)} className="btn-brand h-9 px-4 text-[13px]">
                        <PencilLine className="h-4 w-4" /> {k.status === KPI_STATUS.DRAFT ? "Continue draft" : "Correct and resubmit"}
                      </button>
                    ) : undefined
                  }
                />
              );
            })}
          </div>
        </div>
      </div>
      {open && <KpiFormDrawer open onClose={() => setOpen(false)} owner={owner} approvers={approvers} approverLabel={approverLabel} takenPeriods={takenPeriods} />}
      {editing && <KpiFormDrawer key={editing.id} open onClose={() => setEditing(null)} owner={owner} approvers={approvers} approverLabel={approverLabel} kpi={editing} takenPeriods={takenPeriods} />}
    </section>
  );
}

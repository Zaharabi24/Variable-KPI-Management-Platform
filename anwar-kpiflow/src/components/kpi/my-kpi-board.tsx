"use client";

import * as React from "react";
import { Plus, Target } from "lucide-react";
import { KpiCard, type KpiCardData } from "./kpi-card";
import { KpiFormDrawer } from "./kpi-form";
import { EmptyState } from "@/components/ui/card";

type Approver = { id: string; fullName: string; designation: string | null };

/** FR-KPI-01/09/10/11 — parent card with the Create KPI (+) tile fixed on the right and a scrolling card grid. */
export function MyKpiBoard({ kpis, approvers, approverLabel }: { kpis: KpiCardData[]; approvers: Approver[]; approverLabel: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <section className="card">
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div>
          <h2 className="text-[15px] font-semibold">KPI cards</h2>
          <p className="text-[13px] text-ink-500">{kpis.length === 0 ? "No KPIs yet." : `${kpis.length} KPI${kpis.length === 1 ? "" : "s"} · newest first`}</p>
        </div>
      </div>
      <div className="px-5 pb-5">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_200px] gap-4">
          <div className="max-h-[calc(100vh-260px)] min-h-[380px] overflow-y-auto scroll-thin pr-1 -mr-1">
            {kpis.length === 0 ? (
              <EmptyState
                icon={<Target className="h-5 w-5" />}
                title="Create your first KPI"
                description="Enter the target, actual, weight, evidence and remarks. Achievement and score are calculated for you."
                action={<button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-brand-700 text-white text-[13px] font-medium hover:bg-brand-800"><Plus className="h-4 w-4" /> Create KPI</button>}
              />
            ) : (
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 auto-rows-fr">
                {kpis.map((k) => <KpiCard key={k.id} kpi={k} />)}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="group h-full min-h-[200px] lg:sticky lg:top-0 rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/50 hover:bg-brand-50 hover:border-brand-400 transition-colors flex flex-col items-center justify-center gap-3 text-brand-800"
            aria-label="Create KPI"
          >
            <span className="h-12 w-12 rounded-full bg-white border border-brand-200 shadow-sm flex items-center justify-center group-hover:scale-105 transition-transform">
              <Plus className="h-6 w-6 text-brand-700" />
            </span>
            <span className="text-[14px] font-semibold">Create KPI</span>
            <span className="text-[12px] text-brand-700/70 px-6 text-center">Target · Actual · Evidence</span>
          </button>
        </div>
      </div>
      <KpiFormDrawer open={open} onClose={() => setOpen(false)} approvers={approvers} approverLabel={approverLabel} />
    </section>
  );
}

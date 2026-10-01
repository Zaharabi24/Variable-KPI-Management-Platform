"use client";

import * as React from "react";
import { Plus, PencilLine } from "lucide-react";
import { KpiCard, type KpiCardData } from "./kpi-card";
import { KpiFormDrawer, type KpiFormInitial } from "./kpi-form";

type Approver = { id: string; fullName: string; designation: string | null };

/**
 * FR-KPI-01/09/10/11 — one parent card holding the Create KPI tile and the KPI cards.
 * Drafts appear first with a "Continue draft" action that reopens the form (target fixed).
 */
export function MyKpiBoard({
  kpis,
  drafts,
  approvers,
  approverLabel,
}: {
  kpis: KpiCardData[];
  drafts: Record<string, KpiFormInitial>;
  approvers: Approver[];
  approverLabel: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<KpiFormInitial | null>(null);
  const draftCount = Object.keys(drafts).length;
  return (
    <section className="card">
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div>
          <h2 className="text-[15px] font-semibold">KPI cards</h2>
          <p className="text-[13px] text-ink-500">
            {kpis.length === 0 ? "No KPIs yet — start with the Create KPI card." : `${kpis.length} KPI${kpis.length === 1 ? "" : "s"}${draftCount ? ` · ${draftCount} draft${draftCount === 1 ? "" : "s"} first` : ""} · newest first`}
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
              className="group h-full min-h-[340px] rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/50 hover:bg-brand-50 hover:border-brand-400 transition-colors flex flex-col items-center justify-center gap-3 p-5 text-brand-700"
            >
              <span className="h-14 w-14 rounded-full bg-white border border-brand-200 shadow-sm flex items-center justify-center group-hover:scale-105 transition-transform">
                <Plus className="h-7 w-7 text-brand-500" />
              </span>
              <span className="text-[15px] font-semibold">Create KPI</span>
              <span className="text-[12.5px] text-brand-700/70 text-center max-w-[220px]">
                Save as Draft or Submit. Achievement and score are calculated for you.
              </span>
            </button>
            {kpis.map((k) => (
              <KpiCard
                key={k.id}
                kpi={k}
                action={
                  drafts[k.id] ? (
                    <button
                      type="button"
                      onClick={() => setDraft(drafts[k.id])}
                      className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-brand-500 text-white text-[13px] font-medium hover:bg-brand-600 transition-colors"
                    >
                      <PencilLine className="h-4 w-4" /> Continue draft
                    </button>
                  ) : undefined
                }
              />
            ))}
          </div>
        </div>
      </div>
      <KpiFormDrawer open={open} onClose={() => setOpen(false)} approvers={approvers} approverLabel={approverLabel} mode="create" />
      {draft && <KpiFormDrawer key={draft.id} open onClose={() => setDraft(null)} approvers={approvers} approverLabel={approverLabel} initial={draft} mode="draft" />}
    </section>
  );
}

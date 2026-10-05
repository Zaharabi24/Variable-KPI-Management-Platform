import Link from "next/link";
import { ChevronRight, Clock, Route } from "lucide-react";
import { StatusBadge } from "@/components/ui/badge";
import { Tracker } from "@/components/ui/tracker";
import { fmtNum, timeRemainingLabel } from "@/lib/calc";
import { KPI_SELF_MAX, KPI_STATUS, KPI_TASK_COUNT, KPI_TOTAL_MAX, STATUS_HINTS, kpiTitle, type KpiView } from "@/lib/kpi";

/**
 * KPI card on My KPI. One card per monthly KPI.
 * Attributes: KPI (5) and Total Score, the Score → Review → Approval progress, and where the KPI is right now.
 */
export function KpiCard({ kpi, href, action }: { kpi: KpiView; href?: string; action?: React.ReactNode }) {
  const draft = kpi.status === KPI_STATUS.DRAFT;
  // Once the Department Head has approved, KPI (5) is their confirmed figure; before that it is the employee's own.
  const kpiScore = kpi.kpiScore ?? kpi.selfScore;
  const filled = kpi.tasks.filter((t) => t.score !== null).length;
  return (
    <article className="card card-lift p-5 flex flex-col h-full min-w-0">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[15.5px] font-semibold text-ink-900 leading-6 truncate" title={kpiTitle(kpi)}>{kpiTitle(kpi)}</h3>
        <StatusBadge status={kpi.status} />
      </div>
      <p className="text-[12.5px] text-ink-500 mt-0.5">Monthly KPI · {KPI_TASK_COUNT} major tasks</p>

      <dl className="grid grid-cols-2 gap-3 mt-4">
        <Metric label="KPI (5)" value={kpiScore === null ? "—" : fmtNum(kpiScore)} max={KPI_SELF_MAX} hint={draft && kpiScore === null ? `${filled} of ${KPI_TASK_COUNT} scored` : undefined} />
        <Metric label="Total Score" value={kpi.totalScore === null ? "—" : fmtNum(kpi.totalScore)} max={KPI_TOTAL_MAX} hint={kpi.totalScore === null && !draft ? "After HR approval" : undefined} />
      </dl>

      <Tracker status={kpi.status} scored={kpi.selfScore !== null} className="mt-5" />

      <p className="mt-4 flex items-start gap-1.5 text-[12.5px] text-ink-500">
        {draft ? <Clock className="h-3.5 w-3.5 mt-0.5 shrink-0" /> : <Route className="h-3.5 w-3.5 mt-0.5 shrink-0" />}
        <span>{draft ? timeRemainingLabel(kpi.periodYear, kpi.periodMonth) : STATUS_HINTS[kpi.status]}</span>
      </p>

      <div className="mt-auto pt-4">
        {action ?? (
          <Link href={href ?? `/my-kpi/${kpi.id}`} className="btn-brand h-9 px-4 text-[13px]">
            View Details <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </article>
  );
}

function Metric({ label, value, max, hint }: { label: string; value: string; max: number; hint?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11.5px] text-ink-400">{label}</dt>
      <dd className="font-mono tnum text-[15px] text-ink-900 truncate">
        {value}
        <span className="text-[11px] text-ink-400 ml-1">/ {max}</span>
      </dd>
      {hint && <dd className="text-[11px] text-ink-400 truncate">{hint}</dd>}
    </div>
  );
}

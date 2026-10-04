import Link from "next/link";
import { ChevronRight, Clock } from "lucide-react";
import { StatusBadge } from "@/components/ui/badge";
import { Tracker } from "@/components/ui/tracker";
import { CATEGORY_LABELS, type KpiCategory } from "@/lib/constants";
import { fmtNum, timeRemainingLabel } from "@/lib/calc";

export type KpiCardData = {
  id: string;
  /** Draft progress (which fields are filled); only for status DRAFT */
  draftProgress?: { target: boolean; actual: boolean; evidence: boolean };
  name: string;
  status: string;
  category: string;
  weight: number;
  target: number;
  actual: number;
  unit: string;
  calculatedScore: number;
  finalScore: number | null;
  periodYear: number;
  periodMonth: number;
};

/** FR-KPI-08 / Section 15.3 — KPI card following the reference layout. */
export function KpiCard({ kpi, href, action }: { kpi: KpiCardData; href?: string; action?: React.ReactNode }) {
  const isDraft = kpi.status === "DRAFT";
  const noActual = isDraft && !kpi.draftProgress?.actual;
  const score = kpi.finalScore ?? kpi.calculatedScore;
  return (
    <article className="card card-lift p-5 flex flex-col h-full min-w-0">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[15.5px] font-semibold text-ink-900 leading-6 truncate" title={kpi.name}>{kpi.name}</h3>
        <StatusBadge status={kpi.status} />
      </div>
      <p className="text-[12.5px] text-ink-500 mt-0.5">
        {CATEGORY_LABELS[kpi.category as KpiCategory] ?? kpi.category} · Weight {fmtNum(kpi.weight)}%
      </p>

      <dl className="grid grid-cols-3 gap-3 mt-4">
        <Metric label="Target" value={fmtNum(kpi.target)} unit={kpi.unit} />
        <Metric label="Actual" value={noActual ? "—" : fmtNum(kpi.actual)} unit={noActual ? "" : kpi.unit} />
        <Metric label="Score" value={noActual ? "—" : fmtNum(score)} />
      </dl>

      <Tracker status={kpi.status} draft={kpi.draftProgress} className="mt-5" />

      <p className="mt-4 flex items-center gap-1.5 text-[12.5px] text-ink-500">
        <Clock className="h-3.5 w-3.5" /> {timeRemainingLabel(kpi.periodYear, kpi.periodMonth)}
      </p>

      <div className="mt-auto pt-4">
        {action ?? (
          <Link
            href={href ?? `/my-kpi/${kpi.id}`}
            className="btn-brand h-9 px-4 text-[13px]"
          >
            View Details <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </article>
  );
}

function Metric({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11.5px] text-ink-400">{label}</dt>
      <dd className="font-mono tnum text-[15px] text-ink-900 truncate" title={unit ? `${value} ${unit}` : value}>
        {value}
        {unit ? <span className="text-[11px] text-ink-400 ml-1">{unit}</span> : null}
      </dd>
    </div>
  );
}

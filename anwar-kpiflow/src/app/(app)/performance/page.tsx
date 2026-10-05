import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowDownRight, ArrowUpRight, BarChart3, ChevronRight } from "lucide-react";
import { requireUser, homeFor } from "@/lib/auth";
import { chartSeries, parsePeriod, performanceSummary } from "@/lib/reporting";
import { PageHeader, Card, CardHeader, StatTile, MetricBar, BandLegend, EmptyState } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { PeriodFilter } from "@/components/kpi/period-filter";
import { KpiBarChart } from "@/components/kpi/charts";
import { fmtNum, periodNoun, quarterOf } from "@/lib/calc";
import { MONTHS, MONTHS_SHORT } from "@/lib/constants";
import { KPI_CRITERIA, KPI_TOTAL_MAX, ownsKpis, periodBreakdown, type KpiView } from "@/lib/kpi";

export const metadata: Metadata = { title: "Performance Summary" };

export default async function PerformancePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser();
  if (!ownsKpis(user)) redirect(homeFor(user.role));
  const sp = await searchParams;
  const period = parsePeriod(sp);
  const [summary, series] = await Promise.all([performanceSummary(user, period), chartSeries(user.id, period.year)]);
  const m = summary.metrics;
  const noun = periodNoun(period.type);
  // Difference as a percentage of the previous score, so its bar has a meaningful scale.
  const changePct = m.difference === null || m.previousKpiScore === null || m.previousKpiScore <= 0 ? null : Math.round((m.difference / m.previousKpiScore) * 1000) / 10;
  const highlight = period.type === "MONTHLY" ? MONTHS_SHORT[period.index - 1] : period.type === "QUARTERLY" ? `Q${period.index}` : String(period.year);

  // A quarter or a year holds several months, so the records are grouped by quarter and each one names its month.
  const groups: { title: string | null; records: KpiView[] }[] =
    period.type === "YEARLY"
      ? [1, 2, 3, 4].map((q) => ({ title: `Quarter ${q} · ${period.year}`, records: summary.records.filter((k) => quarterOf(k.periodMonth) === q) })).filter((g) => g.records.length > 0)
      : [{ title: period.type === "QUARTERLY" ? `Quarter ${period.index} · ${period.year}` : null, records: summary.records }];
  const th = "bg-[#fafafb] text-[11px] font-semibold uppercase tracking-[0.07em] text-ink-500 px-3 py-3 border-y border-ink-100 align-bottom leading-4";

  return (
    <>
      <PageHeader title="Performance Summary" subtitle={`Your approved KPI results for ${summary.period.label}.`} action={<PeriodFilter period={period} />} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
        <StatTile label="Total KPI Score" value={m.totalKpiScore === null ? "—" : fmtNum(m.totalKpiScore)} hint={m.totalKpiScore === null ? "No approved KPI yet" : period.type === "MONTHLY" ? "Total Score for the month" : `Average of ${m.approvedCount} monthly KPI${m.approvedCount === 1 ? "" : "s"}`}>
          <MetricBar value={m.totalKpiScore} max={KPI_TOTAL_MAX} caption={`of ${KPI_TOTAL_MAX} points`} tone="band" />
        </StatTile>
        <StatTile label="Previous KPI Score" value={m.previousKpiScore === null ? "—" : fmtNum(m.previousKpiScore)} hint={summary.previous.label}>
          <MetricBar value={m.previousKpiScore} max={KPI_TOTAL_MAX} caption={`of ${KPI_TOTAL_MAX} points`} tone="band" />
        </StatTile>
        <StatTile
          label="Difference"
          value={
            m.difference === null ? "—" : (
              <span className="inline-flex items-center gap-1">
                {m.difference >= 0 ? <ArrowUpRight className="h-5 w-5 text-emerald-600" /> : <ArrowDownRight className="h-5 w-5 text-red-600" />}
                {fmtNum(Math.abs(m.difference))}
              </span>
            )
          }
          tone={m.difference === null ? "default" : m.difference >= 0 ? "up" : "bad"}
          hint={m.differenceText ?? `No comparable ${noun}`}
        >
          <MetricBar
            value={changePct === null ? null : Math.abs(changePct)}
            max={100}
            tone={changePct !== null && changePct < 0 ? "negative" : "positive"}
            caption={`change vs previous ${noun}`}
            percentLabel={changePct === null ? undefined : `${changePct >= 0 ? "+" : "−"}${fmtNum(Math.abs(changePct), 1)}%`}
          />
        </StatTile>
        <StatTile label="Approved KPIs" value={<>{m.approvedCount}<span className="text-ink-300">/</span>{m.totalCount}</>} hint="HR approved / submitted">
          <MetricBar value={m.totalCount > 0 ? m.approvedCount : null} max={m.totalCount} caption="approved" tone="band" />
        </StatTile>
      </div>
      <BandLegend className="mb-6 px-1" />

      {/* Monthly, Quarterly and Yearly KPI come before the records */}
      <div className="grid lg:grid-cols-3 gap-5 mb-6">
        <KpiBarChart title="Monthly KPI" subtitle={`Total Score by month · ${period.year}`} data={series.monthly} color="#DE3332" highlight={period.type === "MONTHLY" ? highlight : undefined} />
        <KpiBarChart title="Quarterly KPI" subtitle={`Average Total Score by quarter · ${period.year}`} data={series.quarterly} color="#2563eb" highlight={period.type === "QUARTERLY" ? highlight : period.type === "MONTHLY" ? `Q${quarterOf(period.index)}` : undefined} />
        <KpiBarChart title="Yearly KPI" subtitle="Average Total Score by year" data={series.yearly} color="#b45309" highlight={String(period.year)} />
      </div>

      <Card>
        <CardHeader title="KPI Records" subtitle={`${summary.records.length} approved KPI record${summary.records.length === 1 ? "" : "s"} in ${summary.period.label}`} />
        {summary.records.length === 0 ? (
          <EmptyState
            icon={<BarChart3 className="h-5 w-5" />}
            title={`No approved KPI for this ${noun}`}
            description={m.totalCount > 0 ? `${m.totalCount} KPI${m.totalCount === 1 ? " is" : "s are"} still moving through approval for ${summary.period.label}. A record appears here once the HR Admin approves it.` : `Nothing was submitted for ${summary.period.label}. Choose another period or create a KPI for it.`}
            action={<Link href="/my-kpi" className="text-[13px] font-medium text-brand-700 hover:underline">Go to My KPI →</Link>}
          />
        ) : (
          <div className="overflow-x-auto scroll-thin">
            <table className="w-full border-collapse min-w-[940px] text-[13.5px]">
              <thead>
                <tr>
                  <th scope="col" className={`${th} pl-5 text-left`}>KPI period</th>
                  {KPI_CRITERIA.map((c) => (
                    <th key={c.key} scope="col" className={`${th} text-right max-w-[104px]`}>{c.label}<span className="block normal-case tracking-normal font-normal text-ink-400 whitespace-nowrap">out of {c.max}</span></th>
                  ))}
                  <th scope="col" className={`${th} text-right whitespace-nowrap`}>Total Score<span className="block normal-case tracking-normal font-normal text-ink-400">out of {KPI_TOTAL_MAX}</span></th>
                  <th scope="col" className={`${th} text-left`}>KPI Status</th>
                  <th scope="col" className={`${th} pr-5 sticky right-0`}><span className="sr-only">Action</span></th>
                </tr>
              </thead>
              {groups.map((g) => (
                <tbody key={g.title ?? "all"}>
                  {g.title && (
                    <tr>
                      <th scope="colgroup" colSpan={KPI_CRITERIA.length + 4} className="bg-surface text-left px-5 py-2 text-[12px] font-semibold text-ink-700 border-b border-ink-100">{g.title}</th>
                    </tr>
                  )}
                  {g.records.map((k) => (
                    <tr key={k.id} className="hover:bg-ink-100/40 transition-colors">
                      <td className="pl-5 pr-3.5 py-3.5 border-b border-ink-100">
                        <div className="font-medium text-ink-900">{MONTHS[k.periodMonth - 1]} {k.periodYear}</div>
                        <div className="text-[12px] text-ink-500 whitespace-nowrap">{periodBreakdown(k)}</div>
                      </td>
                      {KPI_CRITERIA.map((c) => <td key={c.key} className="px-3 py-3.5 border-b border-ink-100 text-right font-mono tnum">{k[c.key] === null ? <span className="text-ink-300">—</span> : fmtNum(k[c.key])}</td>)}
                      <td className="px-3.5 py-3.5 border-b border-ink-100 text-right font-mono tnum font-semibold">{k.totalScore === null ? <span className="text-ink-300 font-normal">—</span> : fmtNum(k.totalScore)}</td>
                      <td className="px-3.5 py-3.5 border-b border-ink-100"><StatusBadge status={k.status} /></td>
                      <td className="pl-3 pr-5 py-3.5 border-b border-ink-100 text-right sticky right-0 bg-white shadow-[-8px_0_8px_-8px_rgba(24,24,27,0.08)]">
                        <Link href={`/my-kpi/${k.id}`} className="btn-outline h-8 px-3 text-[13px] whitespace-nowrap">View Details <ChevronRight className="h-4 w-4" /></Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowDownRight, ArrowUpRight, BarChart3, FileText } from "lucide-react";
import { requireUser, isSuperAdmin } from "@/lib/auth";
import { chartSeries, parsePeriod, performanceSummary } from "@/lib/reporting";
import { PageHeader, Card, CardHeader, StatTile, MetricBar, EmptyState } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Table, Th, Td } from "@/components/ui/table";
import { PeriodFilter } from "@/components/kpi/period-filter";
import { KpiBarChart } from "@/components/kpi/charts";
import { fmtNum, fmtPct, periodNoun, quarterOf } from "@/lib/calc";
import { MONTHS_SHORT } from "@/lib/constants";

export const metadata: Metadata = { title: "Performance Summary" };

export default async function PerformancePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser();
  if (isSuperAdmin(user)) redirect("/dashboard");
  const sp = await searchParams;
  const period = parsePeriod(sp);
  const [summary, series] = await Promise.all([performanceSummary(user.id, period), chartSeries(user.id, period.year)]);
  const m = summary.metrics;
  const noun = periodNoun(period.type);
  // Difference as a percentage of the previous score, so its bar has a meaningful scale.
  const changePct =
    m.difference === null || m.previousKpiScore === null || m.previousKpiScore <= 0 ? null : Math.round((m.difference / m.previousKpiScore) * 1000) / 10;
  const highlight = period.type === "MONTHLY" ? MONTHS_SHORT[period.index - 1] : period.type === "QUARTERLY" ? `Q${period.index}` : String(period.year);

  return (
    <>
      <PageHeader title="Performance Summary" subtitle={`Your approved KPI results for ${summary.period.label}.`} action={<PeriodFilter period={period} />} />

      {summary.kpis.length === 0 ? (
        <Card className="mb-6">
          <EmptyState
            icon={<BarChart3 className="h-5 w-5" />}
            title={`No KPIs for this ${noun}`}
            description={`Nothing was submitted for ${summary.period.label}. Choose another period or create a KPI for it.`}
            action={<Link href="/my-kpi" className="text-[13px] font-medium text-brand-700 hover:underline">Go to My KPI →</Link>}
          />
        </Card>
      ) : (
        <>
          {/* FR-PS-02 — five summary metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <StatTile label="Total KPI Score" value={m.totalKpiScore === null ? "—" : fmtNum(m.totalKpiScore)} hint={m.totalKpiScore === null ? "No approved KPIs yet" : "Weighted by KPI weight"}>
              <MetricBar value={m.totalKpiScore} max={100} caption="of 100 points" />
            </StatTile>
            <StatTile label="Average Achievement" value={m.averageAchievement === null ? "—" : fmtPct(m.averageAchievement)} hint="Across approved KPIs">
              <MetricBar value={m.averageAchievement} max={100} caption="of 100% target" />
            </StatTile>
            <StatTile label="Previous KPI Score" value={m.previousKpiScore === null ? "—" : fmtNum(m.previousKpiScore)} hint={summary.previous.label}>
              <MetricBar value={m.previousKpiScore} max={100} caption="of 100 points" />
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
            <StatTile label="Approved KPIs" value={<>{m.approvedCount}<span className="text-ink-300">/</span>{m.totalCount}</>} hint="Approved + Adjusted / submitted">
              <MetricBar value={m.totalCount > 0 ? m.approvedCount : null} max={m.totalCount} caption="approved" />
            </StatTile>
          </div>

          {/* FR-PS-03 — exactly the ten columns */}
          <Card className="mb-6">
            <CardHeader title="KPI Performance Records" subtitle={`${summary.kpis.length} KPI${summary.kpis.length === 1 ? "" : "s"} in ${summary.period.label}`} />
            <Table>
              <thead>
                <tr>
                  <Th>KPI</Th><Th align="right">Target</Th><Th align="right">Actual</Th><Th align="right">Achievement</Th><Th align="right">KPI Weight</Th><Th align="right">Score</Th>
                  <Th>Evidence Report</Th><Th>Remarks</Th><Th>KPI Status</Th><Th>Approval Person</Th>
                </tr>
              </thead>
              <tbody>
                {summary.kpis.map((k) => (
                  <tr key={k.id} className="hover:bg-surface/70">
                    <Td className="min-w-[200px]"><Link href={`/my-kpi/${k.id}`} className="font-medium text-ink-900 hover:text-brand-700">{k.name}</Link><div className="text-[11.5px] text-ink-400">{MONTHS_SHORT[k.periodMonth - 1]} {k.periodYear}</div></Td>
                    <Td align="right" mono>{fmtNum(k.target)} {k.unit}</Td>
                    <Td align="right" mono>{fmtNum(k.actual)} {k.unit}</Td>
                    <Td align="right" mono>{fmtPct(k.achievement)}</Td>
                    <Td align="right" mono>{fmtNum(k.weight)}%</Td>
                    <Td align="right" mono>{k.finalScore === null ? <span className="text-ink-300">—</span> : fmtNum(k.finalScore)}</Td>
                    <Td>
                      {k.evidence.length > 0 ? (
                        <a href={`/api/evidence/${k.evidence[0].id}`} className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg border border-ink-200 bg-white text-[12px] font-medium text-ink-700 hover:bg-ink-100/60">
                          <FileText className="h-3.5 w-3.5" /> {k.evidence.length} file{k.evidence.length === 1 ? "" : "s"}
                        </a>
                      ) : <span className="text-ink-300">—</span>}
                    </Td>
                    <Td><span className="block max-w-[220px] truncate text-ink-600" title={k.remarks}>{k.remarks}</span></Td>
                    <Td><StatusBadge status={k.status} /></Td>
                    <Td>{k.approver?.fullName ?? "—"}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        </>
      )}

      {/* FR-PS-05 — three bar charts, distinct colours */}
      <div className="grid lg:grid-cols-3 gap-5">
        <KpiBarChart title="Monthly KPI" subtitle={`Total KPI Score by month · ${period.year}`} data={series.monthly} color="#DE3332" highlight={period.type === "MONTHLY" ? highlight : undefined} />
        <KpiBarChart title="Quarterly KPI" subtitle={`Total KPI Score by quarter · ${period.year}`} data={series.quarterly} color="#2563eb" highlight={period.type === "QUARTERLY" ? highlight : period.type === "MONTHLY" ? `Q${quarterOf(period.index)}` : undefined} />
        <KpiBarChart title="Yearly KPI" subtitle="Total KPI Score by year" data={series.yearly} color="#b45309" highlight={String(period.year)} />
      </div>
    </>
  );
}

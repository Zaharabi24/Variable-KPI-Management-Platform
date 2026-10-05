import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHeader, Card, CardHeader, CardBody, StatTile, MetricBar } from "@/components/ui/card";
import { PeriodFilter } from "@/components/kpi/period-filter";
import { ParamSelect } from "@/components/kpi/param-select";
import { ValueBarChart } from "@/components/kpi/charts";
import { fmtNum } from "@/lib/calc";
import { KPI_TOTAL_MAX } from "@/lib/kpi";
import type { StageDashboard } from "@/lib/reporting";

const money = (n: number) => `BDT ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const COPY = {
  HR: {
    title: "HR Admin Dashboard",
    lead: "KPI requests approved by Department Heads, waiting for Attendance, Remarks, HR Note and the Payment Amount.",
    awaiting: "From Department Heads", approved: "Approved by HR", approvedHint: "Sent to the Finance Admin", returned: "Returned to Dept Head",
  },
  FINANCE: {
    title: "Finance Admin Dashboard",
    lead: "KPI requests approved by the HR Admin, waiting for your review.",
    awaiting: "From the HR Admin", approved: "Approved by Finance", approvedHint: "Sent to the Audit Admin", returned: "Returned to HR",
  },
  AUDIT: {
    title: "Audit Admin Dashboard",
    lead: "KPI requests approved by the Finance Admin, waiting for the audit review.",
    awaiting: "From the Finance Admin", approved: "Audit approved", approvedHint: "Completed KPIs", returned: "Returned to Finance",
  },
} as const;

type Opt = { id: string; name: string };

/** Dashboard shared by the HR Admin, the Finance Admin and the Audit Admin: the same shape, each stage's own figures. */
export function StageDashboardView({ data, filters, options }: { data: StageDashboard; filters: { bu: string; dept: string }; options: { departments: Opt[]; businessUnits: Opt[] } }) {
  const copy = COPY[data.stage];
  const hr = data.stage === "HR";
  const pipelineMax = Math.max(1, ...data.pipeline.map((p) => p.count));
  const scope = `${options.businessUnits.find((b) => b.id === filters.bu)?.name ?? "All business units"} · ${options.departments.find((d) => d.id === filters.dept)?.name ?? "All departments"}`;

  return (
    <>
      <PageHeader title={copy.title} subtitle={`${copy.lead} ${scope} · ${data.period.label}.`} />
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <ParamSelect param="bu" label="Business Unit" value={filters.bu} options={options.businessUnits} allLabel="All business units" className="h-9 w-[230px]" />
        <ParamSelect param="dept" label="Department" value={filters.dept} options={options.departments} allLabel="All departments" />
        <PeriodFilter period={data.period} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Link href="/kpi-requests?show=pending" className="block h-full">
          <StatTile label="Awaiting your approval" value={data.awaiting} tone={data.awaiting > 0 ? "warn" : "default"} hint={<span className="inline-flex items-center gap-1 text-brand-700 font-medium">Open KPI Request <ArrowRight className="h-3.5 w-3.5" /></span>} />
        </Link>
        <StatTile label="Requests received" value={data.received} hint={copy.awaiting} />
        <StatTile label={copy.approved} value={data.approved} tone="good" hint={copy.approvedHint}>
          <MetricBar value={data.received > 0 ? data.approved : null} max={data.received} caption="of received" />
        </StatTile>
        <StatTile label={copy.returned} value={data.returned} tone={data.returned > 0 ? "bad" : "default"} hint={`${data.completed} completed by Audit`} />
        {hr ? (
          <StatTile label="Average Total Score" value={data.averageScore === null ? "—" : fmtNum(data.averageScore)} hint="HR-approved KPIs">
            <MetricBar value={data.averageScore} max={KPI_TOTAL_MAX} caption={`of ${KPI_TOTAL_MAX} points`} tone="band" />
          </StatTile>
        ) : (
          <StatTile label="Payment approved" value={<span className="text-[20px]">{money(data.payment)}</span>} hint={`${data.approved} KPI${data.approved === 1 ? "" : "s"} · average score ${data.averageScore === null ? "—" : fmtNum(data.averageScore)}`} />
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-5 mb-5">
        <ValueBarChart
          title="KPI requests by department"
          subtitle={`Requests that reached you · ${data.period.label}`}
          color="#DE3332"
          valueLabel="Requests"
          emptyText="No KPI request has reached this stage in the period."
          data={data.byDepartment.map((d) => ({ label: d.label, value: d.count, note: d.value === null ? undefined : `Average Total Score: ${fmtNum(d.value)}` }))}
        />
        {hr ? (
          <ValueBarChart
            title="Average Total Score by department"
            subtitle={`HR-approved KPIs · ${data.period.label}`}
            color="#2563eb"
            valueLabel="Average Total Score"
            emptyText="No HR-approved KPI in the period yet."
            max={100}
            data={data.byDepartment.map((d) => ({ label: d.label, value: d.value, note: `Requests: ${d.count}` }))}
          />
        ) : (
          <ValueBarChart
            title="Payment by department"
            subtitle={`Approved Payment Amount (BDT) · ${data.period.label}`}
            color="#2563eb"
            valueLabel="Payment (BDT)"
            emptyText="No approved payment in the period yet."
            data={data.byDepartment.map((d) => ({ label: d.label, value: d.payment, note: `Requests: ${d.count}` }))}
          />
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <ValueBarChart
            title={hr ? "Monthly KPI requests" : "Monthly payment"}
            subtitle={hr ? `Requests received per KPI month · ${data.period.year}` : `Approved Payment Amount (BDT) per KPI month · ${data.period.year}`}
            color="#b45309"
            valueLabel={hr ? "Requests" : "Payment (BDT)"}
            emptyText={`Nothing recorded for ${data.period.year} yet.`}
            data={data.monthly.map((d) => ({ label: d.label, value: hr ? d.count : d.payment, note: hr ? (d.value === null ? undefined : `Average Total Score: ${fmtNum(d.value)}`) : `Requests: ${d.count}` }))}
          />
        </div>
        <Card>
          <CardHeader title="Approval pipeline" subtitle={`Where every submitted KPI is now · ${data.period.label}`} />
          <CardBody>
            <ul className="space-y-3.5">
              {data.pipeline.map((p, i) => {
                const mine = (data.stage === "HR" && i === 1) || (data.stage === "FINANCE" && i === 2) || (data.stage === "AUDIT" && i === 3);
                return (
                  <li key={p.label}>
                    <div className="flex items-baseline justify-between gap-3 text-[13px]">
                      <span className={mine ? "font-semibold text-ink-900" : "text-ink-700"}>{p.label}{mine && <span className="ml-1.5 text-[11.5px] font-medium text-brand-700">you</span>}</span>
                      <span className="font-mono tnum text-ink-900">{p.count}</span>
                    </div>
                    <div className="mt-1.5 h-2 w-full rounded-full bg-ink-100 overflow-hidden" role="progressbar" aria-label={`${p.label}: ${p.count} KPIs`} aria-valuemin={0} aria-valuemax={pipelineMax} aria-valuenow={p.count}>
                      <div className={`h-full rounded-full ${i === 4 ? "bg-emerald-600" : mine ? "bg-brand-500" : "bg-ink-300"}`} style={{ width: `${(p.count / pipelineMax) * 100}%`, minWidth: p.count > 0 ? 6 : 0 }} />
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 text-[12px] text-ink-400">Employee → Department Head → HR Admin → Finance Admin → Audit Admin</p>
          </CardBody>
        </Card>
      </div>
    </>
  );
}

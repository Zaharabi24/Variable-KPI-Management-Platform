"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import { Card, CardHeader, CardBody } from "@/components/ui/card";

type Point = { label: string; value: number | null; count: number };

/** Three KPI bar charts (monthly, quarterly, yearly), each in its own distinct colour. */
export function KpiBarChart({ title, subtitle, data, color, highlight }: { title: string; subtitle: string; data: Point[]; color: string; highlight?: string }) {
  return (
    <ValueBarChart
      title={title}
      subtitle={subtitle}
      color={color}
      highlight={highlight}
      valueLabel="Total KPI Score"
      emptyText="No approved KPIs to chart yet."
      data={data.map((d) => ({ label: d.label, value: d.value, note: `Approved KPIs: ${d.count}` }))}
      max={100}
    />
  );
}

export type BarDatum = { label: string; value: number | null; note?: string };

/** One series of vertical bars with a tooltip. Used by the Performance Summary and by the HR, Finance and Audit dashboards. */
export function ValueBarChart({
  title, subtitle, data, color, highlight, valueLabel, emptyText = "Nothing to chart yet.", max, format = (n) => n.toLocaleString("en-US", { maximumFractionDigits: 2 }), height = 220,
}: {
  title: string;
  subtitle: string;
  data: BarDatum[];
  color: string;
  highlight?: string;
  valueLabel: string;
  emptyText?: string;
  /** Fixes the top of the axis (e.g. 100 for scores) so charts are comparable. */
  max?: number;
  format?: (n: number) => string;
  height?: number;
}) {
  const hasData = data.some((d) => d.value !== null && d.value !== 0);
  // Long category names (departments) are angled once there are enough of them to collide.
  const long = data.length > 3 && data.some((d) => d.label.length > 9);
  return (
    <Card>
      <CardHeader title={title} subtitle={subtitle} />
      <CardBody>
        {hasData ? (
          <div style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.map((d) => ({ ...d, value: d.value ?? 0, shown: d.value }))} margin={{ top: 8, right: 8, left: -10, bottom: long ? 28 : 0 }} barCategoryGap="28%">
                <CartesianGrid vertical={false} stroke="#eeeef1" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} interval={long ? 0 : "preserveStartEnd"} tick={{ fontSize: long ? 11 : 12, fill: "#55555e" }} angle={long ? -22 : 0} textAnchor={long ? "end" : "middle"} height={long ? 48 : 30} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#696973" }} width={52} domain={max ? [0, max] : [0, "auto"]} tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : String(v))} />
                <Tooltip
                  cursor={{ fill: "rgba(24,24,27,0.04)" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0].payload as BarDatum & { shown: number | null };
                    return (
                      <div className="card px-3 py-2 shadow-pop text-[12.5px]">
                        <div className="font-medium text-ink-900">{p.label}</div>
                        <div className="text-ink-500">{valueLabel}: <span className="font-mono tnum text-ink-900">{p.shown === null ? "—" : format(p.shown)}</span></div>
                        {p.note && <div className="text-ink-500">{p.note}</div>}
                      </div>
                    );
                  }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={46} isAnimationActive={false}>
                  {data.map((d) => (
                    <Cell key={d.label} fill={color} fillOpacity={highlight && d.label !== highlight ? 0.45 : 1} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex items-center justify-center text-[13px] text-ink-500 bg-surface rounded-xl border border-dashed border-ink-200" style={{ height }}>
            {emptyText}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

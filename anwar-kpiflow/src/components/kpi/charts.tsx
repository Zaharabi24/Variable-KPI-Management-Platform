"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import { Card, CardHeader, CardBody } from "@/components/ui/card";

type Point = { label: string; value: number | null; count: number };

/** FR-PS-05 — three KPI bar charts, each in its own distinct colour. */
export function KpiBarChart({ title, subtitle, data, color, highlight }: { title: string; subtitle: string; data: Point[]; color: string; highlight?: string }) {
  const hasData = data.some((d) => d.value !== null);
  return (
    <Card>
      <CardHeader title={title} subtitle={subtitle} />
      <CardBody>
        {hasData ? (
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.map((d) => ({ ...d, value: d.value ?? 0 }))} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} barCategoryGap="28%">
                <CartesianGrid vertical={false} stroke="#e9ede9" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#7f8c85" }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#a6b0aa" }} width={44} />
                <Tooltip
                  cursor={{ fill: "rgba(15,26,21,0.04)" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0].payload as Point;
                    return (
                      <div className="card px-3 py-2 shadow-pop text-[12.5px]">
                        <div className="font-medium text-ink-900">{p.label}</div>
                        <div className="text-ink-500">Total KPI Score: <span className="font-mono tnum text-ink-900">{p.value === null ? "no approved KPIs" : p.value.toFixed(2)}</span></div>
                        <div className="text-ink-500">Approved KPIs: <span className="font-mono tnum text-ink-900">{p.count}</span></div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={46}>
                  {data.map((d) => (
                    <Cell key={d.label} fill={color} fillOpacity={highlight && d.label !== highlight ? 0.45 : 1} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[220px] flex items-center justify-center text-[13px] text-ink-500 bg-surface rounded-xl border border-dashed border-ink-200">
            No approved KPIs to chart yet.
          </div>
        )}
      </CardBody>
    </Card>
  );
}

"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Inbox, Search, X } from "lucide-react";
import { PageHeader, Card, CardHeader, StatTile, MetricBar, EmptyState } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { StatusBadge } from "@/components/ui/badge";
import { fmtNum } from "@/lib/calc";
import { MONTHS, MONTHS_SHORT } from "@/lib/constants";
import { KPI_SELF_MAX, KPI_STATUS, KPI_TOTAL_MAX, isReturned, isScored, quarterOfMonth } from "@/lib/kpi";
import type { QueueRow } from "@/lib/kpi-data";
import { cn, fmtDateTime } from "@/lib/utils";
import { ReviewDrawer } from "./review-drawer";

type Opt = { id: string; name: string };
export type BoardFilters = { bu: string; dept: string; show: "all" | "pending"; type: "" | "MONTHLY" | "QUARTERLY" | "YEARLY"; year: number; month: number; quarter: number; q: string };

const money = (n: number | null) => (n === null ? "—" : n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

/**
 * KPI Request list for every reviewing role (Department Head, HR Admin, Finance Admin, Audit Admin, Super Admin).
 * Default: every request the role receives, most recently updated first, with the ones waiting for them on top.
 * Filters: Business Unit, Department, and Monthly / Quarterly / Yearly period.
 */
export function RequestBoard({
  title, subtitle, rows, filters, options, showDepartmentFilter, showPayment, canDelete, currentYear, openId, averageScore,
}: {
  title: string;
  subtitle: string;
  rows: QueueRow[];
  filters: BoardFilters;
  options: { departments: Opt[]; businessUnits: Opt[] };
  showDepartmentFilter: boolean;
  showPayment: boolean;
  /** Super Admin: any KPI. Department Head: only one waiting for them (checked per row). */
  canDelete: "all" | "actionable" | "none";
  currentYear: number;
  openId: string | null;
  averageScore: number | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [open, setOpen] = React.useState<string | null>(openId);
  const [q, setQ] = React.useState(filters.q);
  const row = rows.find((r) => r.id === open) ?? null;

  const go = (patch: Record<string, string>, reset = false) => {
    const next = reset ? new URLSearchParams() : new URLSearchParams(sp.toString());
    next.delete("open");
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    const s = next.toString();
    router.push(s ? `${pathname}?${s}` : pathname);
  };

  const waiting = rows.filter((r) => r.actionable).length;
  const scored = rows.filter((r) => isScored(r.status)).length;
  const returned = rows.filter((r) => isReturned(r.status)).length;
  const completed = rows.filter((r) => r.status === KPI_STATUS.COMPLETED).length;
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 3 + i);
  const active = !!(filters.bu || filters.dept || filters.type || filters.q || filters.show === "pending");
  const th = "bg-[#fafafb] text-[11px] font-semibold uppercase tracking-[0.07em] text-ink-500 px-3.5 py-3 border-y border-ink-100 whitespace-nowrap text-left";
  const td = "px-3.5 py-3.5 border-b border-ink-100 align-middle text-[13.5px] text-ink-900";

  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />

      <Card className="mb-6">
        <div className="p-4 flex flex-wrap items-end gap-3">
          <Field label="Business Unit" htmlFor="rq-bu" className="flex-1 min-w-[190px]">
            <Select id="rq-bu" value={filters.bu} onChange={(e) => go({ bu: e.target.value })}>
              <option value="">All business units</option>
              {options.businessUnits.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          </Field>
          {showDepartmentFilter && (
            <Field label="Department" htmlFor="rq-dept" className="flex-1 min-w-[190px]">
              <Select id="rq-dept" value={filters.dept} onChange={(e) => go({ dept: e.target.value })}>
                <option value="">All departments</option>
                {options.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Select>
            </Field>
          )}
          <Field label="Period" htmlFor="rq-type" className="w-[150px]">
            <Select id="rq-type" value={filters.type} onChange={(e) => go({ type: e.target.value, year: e.target.value ? String(filters.year) : "", month: e.target.value === "MONTHLY" ? String(filters.month) : "", quarter: e.target.value === "QUARTERLY" ? String(filters.quarter) : "" })}>
              <option value="">All periods</option>
              <option value="MONTHLY">Monthly</option>
              <option value="QUARTERLY">Quarterly</option>
              <option value="YEARLY">Yearly</option>
            </Select>
          </Field>
          {filters.type === "MONTHLY" && (
            <Field label="Month" htmlFor="rq-month" className="w-[140px]">
              <Select id="rq-month" value={String(filters.month)} onChange={(e) => go({ month: e.target.value })}>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </Select>
            </Field>
          )}
          {filters.type === "QUARTERLY" && (
            <Field label="Quarter" htmlFor="rq-quarter" className="w-[130px]">
              <Select id="rq-quarter" value={String(filters.quarter)} onChange={(e) => go({ quarter: e.target.value })}>
                {[1, 2, 3, 4].map((n) => <option key={n} value={n}>Quarter {n}</option>)}
              </Select>
            </Field>
          )}
          {filters.type && (
            <Field label="Year" htmlFor="rq-year" className="w-[104px]">
              <Select id="rq-year" value={String(filters.year)} onChange={(e) => go({ year: e.target.value })}>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </Select>
            </Field>
          )}
          <Field label="Show" htmlFor="rq-show" className="w-[220px]">
            <Select id="rq-show" value={filters.show} onChange={(e) => go({ show: e.target.value === "pending" ? "pending" : "" })}>
              <option value="all">All requests</option>
              <option value="pending">Waiting for my decision</option>
            </Select>
          </Field>
          <Field label="Search" htmlFor="rq-q" className="flex-1 min-w-[200px]">
            <form className="relative" onSubmit={(e) => { e.preventDefault(); go({ q }); }}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
              <Input id="rq-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Employee Name or Employee ID" className="pl-9" />
            </form>
          </Field>
          <Button variant="ghost" icon={<X className="h-4 w-4" />} disabled={!active} onClick={() => { setQ(""); go({}, true); }}>Clear</Button>
        </div>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatTile label="Waiting for you" value={waiting} hint="Need your decision" tone={waiting ? "warn" : "default"} />
        <StatTile label="Requests" value={rows.length} hint={active ? "Matching the filters" : "All requests"} />
        <StatTile label="HR approved" value={scored} hint="Total Score calculated" />
        <StatTile label="Returned" value={returned} hint={`${completed} completed`} tone={returned ? "bad" : "default"} />
        <StatTile label="Average Total Score" value={averageScore === null ? "—" : fmtNum(averageScore)} hint="HR-approved requests">
          <MetricBar value={averageScore} max={KPI_TOTAL_MAX} caption={`of ${KPI_TOTAL_MAX} points`} tone="band" />
        </StatTile>
      </div>

      <Card>
        <CardHeader title="KPI requests" subtitle={`${rows.length} request${rows.length === 1 ? "" : "s"} · waiting for you first, then most recently updated`} />
        {rows.length === 0 ? (
          <EmptyState icon={<Inbox className="h-5 w-5" />} title={active ? "No requests match these filters" : "No KPI requests yet"} description={active ? "Change or clear the filters to see more requests." : "Requests appear here as soon as they reach you."} />
        ) : (
          <div className="overflow-x-auto scroll-thin">
            <table className="w-full border-collapse min-w-[1040px]">
              <thead>
                <tr>
                  <th scope="col" className={cn(th, "pl-5")}>Employee</th>
                  <th scope="col" className={th}>Status</th>
                  {showDepartmentFilter && <th scope="col" className={th}>Department</th>}
                  <th scope="col" className={th}>Business Unit</th>
                  <th scope="col" className={th}>Period</th>
                  <th scope="col" className={cn(th, "text-right")}>KPI (5)</th>
                  <th scope="col" className={cn(th, "text-right")}>Total Score</th>
                  {showPayment && <th scope="col" className={cn(th, "text-right")}>Payment (BDT)</th>}
                  <th scope="col" className={th}>Updated</th>
                  <th scope="col" className={cn(th, "pr-5 text-right sticky right-0")}><span className="sr-only">Action</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-ink-100/40 transition-colors">
                    <td className={cn(td, "pl-5")}>
                      <div className="font-medium whitespace-nowrap">{r.owner.fullName}</div>
                      <div className="text-[12px] text-ink-500 font-mono">{r.owner.employeeId}</div>
                    </td>
                    <td className={td}><StatusBadge status={r.status} /></td>
                    {showDepartmentFilter && <td className={cn(td, "whitespace-nowrap")}>{r.owner.department ?? "—"}</td>}
                    <td className={cn(td, "whitespace-nowrap")}>{r.owner.businessUnit ?? "—"}</td>
                    <td className={cn(td, "whitespace-nowrap")}>
                      <div>{MONTHS_SHORT[r.periodMonth - 1]} {r.periodYear}</div>
                      <div className="text-[12px] text-ink-400">Quarter {quarterOfMonth(r.periodMonth)}</div>
                    </td>
                    <td className={cn(td, "text-right font-mono tnum whitespace-nowrap")}>{r.kpiScore === null ? (r.selfScore === null ? "—" : fmtNum(r.selfScore)) : fmtNum(r.kpiScore)}<span className="text-ink-400 text-[11.5px]"> / {KPI_SELF_MAX}</span></td>
                    <td className={cn(td, "text-right font-mono tnum font-semibold")}>{r.totalScore === null ? <span className="text-ink-400 font-normal">—</span> : fmtNum(r.totalScore)}</td>
                    {showPayment && <td className={cn(td, "text-right font-mono tnum")}>{money(r.paymentAmount)}</td>}
                    <td className={cn(td, "whitespace-nowrap text-ink-500 text-[12.5px]")}>{fmtDateTime(r.updatedAt)}</td>
                    <td className={cn(td, "pr-5 text-right sticky right-0 bg-white shadow-[-8px_0_8px_-8px_rgba(24,24,27,0.08)]")}>
                      <Button size="sm" variant={r.actionable ? "primary" : "outline"} onClick={() => setOpen(r.id)}>{r.actionable ? "Review" : "View"}</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {row && <ReviewDrawer row={row} canDelete={canDelete === "all" || (canDelete === "actionable" && row.actionable)} onClose={() => setOpen(null)} />}
    </>
  );
}

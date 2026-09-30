"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input, Select } from "@/components/ui/field";
import { STATUS_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

function useApply() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  // Preserve every other parameter (period type / month / quarter / year) when one filter changes.
  return (patch: Record<string, string>) => {
    const p = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    router.push(`${pathname}?${p.toString()}`);
  };
}

export function KpiFilters({
  departments, q, status, dept, role, deleted, allPeriods,
}: {
  departments: { id: string; name: string }[]; q: string; status: string; dept: string; role: string; deleted: boolean; allPeriods: boolean;
}) {
  const apply = useApply();
  return (
    <div className="flex flex-col lg:flex-row lg:items-center gap-3 px-5 pt-5 pb-4 border-b border-ink-100">
      <form className="relative flex-1 max-w-sm" onSubmit={(e) => { e.preventDefault(); apply({ q: (new FormData(e.currentTarget).get("q") as string) ?? "" }); }}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
        <Input name="q" defaultValue={q} placeholder="Search KPI, owner or Employee ID" className="pl-9" aria-label="Search KPIs" />
      </form>
      <Select aria-label="Department" className="lg:w-[190px]" value={dept} onChange={(e) => apply({ dept: e.target.value })}>
        <option value="">All departments</option>
        {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
      </Select>
      <Select aria-label="Status" className="lg:w-[150px]" value={status} onChange={(e) => apply({ status: e.target.value })}>
        <option value="">All statuses</option>
        {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </Select>
      <Select aria-label="Owner role" className="lg:w-[170px]" value={role} onChange={(e) => apply({ role: e.target.value })}>
        <option value="">Employees + Heads</option>
        <option value="EMPLOYEE">Employees only</option>
        <option value="DEPARTMENT_HEAD">Department Heads only</option>
      </Select>
      <button onClick={() => apply({ all: allPeriods ? "" : "1" })} className={cn("h-10 px-3.5 rounded-lg border text-[13px] font-medium whitespace-nowrap", allPeriods ? "bg-brand-700 border-brand-700 text-white" : "bg-white border-ink-200 text-ink-700 hover:bg-ink-100/60")}>
        {allPeriods ? "Showing all periods" : "Show all periods"}
      </button>
      <button onClick={() => apply({ deleted: deleted ? "" : "1" })} className={cn("h-10 px-3.5 rounded-lg border text-[13px] font-medium whitespace-nowrap", deleted ? "bg-ink-900 border-ink-900 text-white" : "bg-white border-ink-200 text-ink-700 hover:bg-ink-100/60")}>
        {deleted ? "Including deleted" : "Include deleted"}
      </button>
    </div>
  );
}

/** Department-wise view: one chip per department with its KPI count for the selected period. */
export function DepartmentChips({ total, counts, active }: { total: number; counts: { id: string; name: string; count: number }[]; active: string }) {
  const apply = useApply();
  if (total === 0) return null;
  const chip = (on: boolean) => cn("h-7 px-3 rounded-full text-[12px] font-medium border transition-colors", on ? "bg-brand-700 border-brand-700 text-white" : "bg-white border-ink-200 text-ink-700 hover:border-ink-300");
  return (
    <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-b border-ink-100 bg-surface/60">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-500 mr-1">By department</span>
      <button onClick={() => apply({ dept: "" })} className={chip(!active)}>All · {total}</button>
      {counts.map((d) => (
        <button key={d.id} onClick={() => apply({ dept: d.id })} className={chip(active === d.id)}>{d.name} · {d.count}</button>
      ))}
    </div>
  );
}

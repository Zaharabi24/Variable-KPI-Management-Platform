"use client";

import { useRouter, usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { Input, Select } from "@/components/ui/field";
import { STATUS_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function KpiFilters({ departments, q, status, dept, role, deleted }: { departments: { id: string; name: string }[]; q: string; status: string; dept: string; role: string; deleted: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const apply = (patch: Record<string, string>) => {
    const p = new URLSearchParams({ q, status, dept, role, deleted: deleted ? "1" : "", ...patch });
    for (const [k, v] of Array.from(p.entries())) if (!v) p.delete(k);
    router.push(`${pathname}?${p.toString()}`);
  };
  return (
    <div className="flex flex-col lg:flex-row lg:items-center gap-3 px-5 pt-5 pb-4 border-b border-ink-100">
      <form className="relative flex-1 max-w-sm" onSubmit={(e) => { e.preventDefault(); apply({ q: (new FormData(e.currentTarget).get("q") as string) ?? "" }); }}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
        <Input name="q" defaultValue={q} placeholder="Search KPI, owner or Employee ID" className="pl-9" aria-label="Search KPIs" />
      </form>
      <Select aria-label="Status" className="lg:w-[160px]" value={status} onChange={(e) => apply({ status: e.target.value })}>
        <option value="">All statuses</option>
        {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </Select>
      <Select aria-label="Department" className="lg:w-[190px]" value={dept} onChange={(e) => apply({ dept: e.target.value })}>
        <option value="">All departments</option>
        {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
      </Select>
      <Select aria-label="Owner role" className="lg:w-[170px]" value={role} onChange={(e) => apply({ role: e.target.value })}>
        <option value="">Employees + Heads</option>
        <option value="EMPLOYEE">Employees only</option>
        <option value="DEPARTMENT_HEAD">Department Heads only</option>
      </Select>
      <button onClick={() => apply({ deleted: deleted ? "" : "1" })} className={cn("h-10 px-3.5 rounded-lg border text-[13px] font-medium", deleted ? "bg-ink-900 border-ink-900 text-white" : "bg-white border-ink-200 text-ink-700 hover:bg-ink-100/60")}>
        {deleted ? "Including deleted" : "Include deleted"}
      </button>
    </div>
  );
}

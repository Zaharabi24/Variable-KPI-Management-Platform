"use client";

import { useRouter, usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { Input, Select } from "@/components/ui/field";

type Opt = { id: string; name: string };

export function EmployeeFilters({ units, departments, q, dept, bu, count }: { units: Opt[]; departments: Opt[]; q: string; dept: string; bu: string; count: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const apply = (patch: Record<string, string>) => {
    const p = new URLSearchParams({ q, dept, bu, ...patch });
    for (const [k, v] of Array.from(p.entries())) if (!v) p.delete(k);
    router.push(`${pathname}?${p.toString()}`);
  };
  return (
    <div className="flex flex-col md:flex-row md:items-center gap-3 px-5 pt-5 pb-4 border-b border-ink-100">
      <form
        className="relative flex-1 max-w-sm"
        onSubmit={(e) => { e.preventDefault(); apply({ q: (new FormData(e.currentTarget).get("q") as string) ?? "" }); }}
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
        <Input name="q" defaultValue={q} placeholder="Search name, Employee ID or email" className="pl-9" aria-label="Search employees" />
      </form>
      <Select aria-label="Business unit" className="md:w-[220px]" value={bu} onChange={(e) => apply({ bu: e.target.value })}>
        <option value="">All business units</option>
        {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
      </Select>
      <Select aria-label="Department" className="md:w-[200px]" value={dept} onChange={(e) => apply({ dept: e.target.value })}>
        <option value="">All departments</option>
        {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
      </Select>
      <span className="md:ml-auto text-[12.5px] text-ink-400 tnum">{count} employee{count === 1 ? "" : "s"}</span>
    </div>
  );
}
